
const $ = id => document.getElementById(id);

let plants = JSON.parse(localStorage.getItem('plantnest-plants') || '[]');
let plantPhoto = null;
let issuePhoto = null;
let identificationResults = [];

const emojis = ['🪴', '🌿', '🌱', '🌵', '🌸', '🌻', '🍃'];

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function saveAll() {
  localStorage.setItem('plantnest-plants', JSON.stringify(plants));
  render();
}

function render() {
  $('count').textContent = plants.length
    ? `${plants.length} plant${plants.length === 1 ? '' : 's'} in your garden`
    : 'Your plants live here';

  $('empty').classList.toggle('hide', plants.length > 0);

  $('plants').innerHTML = plants.map((p, i) => `
    <article class="card">
      <div class="plantimg">
        ${p.photo
          ? `<img src="${p.photo}" alt="${esc(p.name)}">`
          : emojis[i % emojis.length]}
      </div>
      <div class="cardinfo">
        <h3>${esc(p.name)}</h3>
        <p>📍 ${esc(p.location)}</p>
        <div class="actions">
          <button onclick="showCare('${p.id}')">Care guide</button>
          <button class="del" onclick="removePlant('${p.id}')">Remove</button>
        </div>
      </div>
    </article>
  `).join('');

  $('which').innerHTML =
    '<option value="">Choose a plant</option>' +
    plants.map(p =>
      `<option value="${p.id}">${esc(p.name)}</option>`
    ).join('');
}

function readImage(file, cb) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => cb(r.result);
  r.readAsDataURL(file);
}

function openAdd() {
  $('addModal').classList.remove('hide');
}

function closeAdd() {
  $('addModal').classList.add('hide');
  $('name').value = '';
  $('photo').value = '';
  $('plantPreview').classList.add('hide');
  plantPhoto = null;
  identificationResults = [];

  const output = $('identifyResult');
  if (output) output.replaceChildren();
}

['add', 'addTop', 'first'].forEach(id => {
  $(id).onclick = openAdd;
});

$('close').onclick = closeAdd;

$('closeCare').onclick = () => {
  $('careModal').classList.add('hide');
};

$('photo').onchange = e => {
  plantPhoto = null;
  identificationResults = [];

  const output = $('identifyResult');
  if (output) output.replaceChildren();

  readImage(e.target.files[0], d => {
    plantPhoto = d;
    $('plantPreview').src = d;
    $('plantPreview').classList.remove('hide');
  });
};

/* AI identification controls */
if (!document.getElementById('identifyPlant')) {
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'identifyPlant';
  button.textContent = '🌿 Identify Plant with AI';

  const output = document.createElement('div');
  output.id = 'identifyResult';
  output.setAttribute('aria-live', 'polite');

  $('photo').insertAdjacentElement('afterend', button);
  button.insertAdjacentElement('afterend', output);
}

function showIdentificationResults(results) {
  const output = $('identifyResult');
  output.replaceChildren();
  identificationResults = results;

  const heading = document.createElement('h3');
  heading.textContent = '🌱 Choose the correct plant';
  output.appendChild(heading);

  const instruction = document.createElement('p');
  instruction.textContent =
    'Select one result. The plant name will be filled in, but it will not be saved until you press Save Plant.';
  output.appendChild(instruction);

  results.forEach((item, index) => {
    const species = item.species || {};
    const commonName =
      species.commonNames?.[0] || '';
    const scientificName =
      species.scientificNameWithoutAuthor ||
      species.scientificName ||
      'Scientific name unavailable';
    const score = Math.round((item.score || 0) * 100);

    const label = document.createElement('label');
    label.style.display = 'block';
    label.style.padding = '12px';
    label.style.margin = '8px 0';
    label.style.border = '1px solid #ccc';
    label.style.borderRadius = '8px';
    label.style.cursor = 'pointer';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'plantIdentificationChoice';
    radio.value = String(index);
    radio.checked = index === 0;
    radio.style.marginRight = '8px';

    const title = document.createElement('strong');
    title.textContent =
      `${index + 1}. ${commonName || scientificName}`;

    const scientific = document.createElement('div');
    scientific.textContent = commonName
      ? scientificName
      : 'Common name unavailable';
    scientific.style.fontStyle = 'italic';
    scientific.style.marginTop = '4px';

    const confidence = document.createElement('div');
    confidence.textContent = `Match score: ${score}%`;
    confidence.style.marginTop = '4px';

    label.appendChild(radio);
    label.appendChild(title);
    label.appendChild(scientific);
    label.appendChild(confidence);

    output.appendChild(label);
  });

  const selectButton = document.createElement('button');
  selectButton.type = 'button';
  selectButton.textContent = 'Use Selected Plant';

  selectButton.onclick = () => {
    const selected = output.querySelector(
      'input[name="plantIdentificationChoice"]:checked'
    );

    if (!selected) {
      alert('Please select a plant first.');
      return;
    }

    const item = identificationResults[Number(selected.value)];
    const species = item.species || {};
    const commonName = species.commonNames?.[0] || '';
    const scientificName =
      species.scientificNameWithoutAuthor ||
      species.scientificName ||
      '';

    $('name').value = commonName || scientificName;

    const confirmation = document.createElement('p');
    confirmation.textContent =
      `Selected: ${$('name').value}. Review the name, then press Save Plant.`;

    const oldConfirmation = output.querySelector('.plant-choice-confirmation');
    if (oldConfirmation) oldConfirmation.remove();

    confirmation.className = 'plant-choice-confirmation';
    output.appendChild(confirmation);
  };

  output.appendChild(selectButton);

  const note = document.createElement('p');
  note.textContent =
    'Match scores are estimates, not guaranteed probabilities. Check the plant before relying on the result.';
  output.appendChild(note);
}

$('identifyPlant').onclick = async () => {
  const file = $('photo').files[0];
  const output = $('identifyResult');
  const button = $('identifyPlant');

  if (!file) {
    alert('Please select a plant photo first.');
    return;
  }

  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file.');
    return;
  }

  if (file.size > 8 * 1024 * 1024) {
    alert('Please choose a photo smaller than 8 MB.');
    return;
  }

  button.disabled = true;
  output.textContent = 'Identifying your plant. Please wait...';
  identificationResults = [];

  try {
    const form = new FormData();
    form.append('image', file);

    const response = await fetch(
      'https://plantnest-api.sudeep17.workers.dev',
      {
        method: 'POST',
        body: form
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Identification failed.');
    }

    if (!data.results || data.results.length === 0) {
      output.textContent =
        'No likely match found. Try a clearer photo of the leaves or flowers.';
      return;
    }

    showIdentificationResults(data.results.slice(0, 3));

  } catch (error) {
    output.textContent =
      'Could not identify the plant: ' + error.message;
  } finally {
    button.disabled = false;
  }
};

$('issuePhoto').onchange = e => {
  issuePhoto = null;

  readImage(e.target.files[0], d => {
    issuePhoto = d;
    $('issuePreview').src = d;
    $('issuePreview').classList.remove('hide');
  });
};

$('save').onclick = () => {
  const name = $('name').value.trim();

  if (!name) {
    alert('Please enter a plant name.');
    return;
  }

  plants.unshift({
    id: Date.now().toString(),
    name,
    location: $('location').value,
    photo: plantPhoto
  });

  saveAll();
  closeAdd();
  showCare(plants[0].id);
};

window.removePlant = id => {
  if (confirm('Remove this plant?')) {
    plants = plants.filter(p => p.id !== id);
    saveAll();
  }
};

function advice(name, location) {
  const n = name.toLowerCase();

  let a = {
    emoji: '🪴',
    water: 'Check the top 2–3 cm of soil and water when it is dry, adjusting for season and plant needs. Ensure excess water drains away.',
    light: 'Start with bright, indirect light; introduce direct sun gradually and check species-specific needs.',
    soil: 'Use a loose, well-draining potting mix in a pot with drainage holes.',
    feed: 'During active growth, use a balanced fertilizer at the label rate. Avoid overfeeding.',
    season: 'Hot Indian summers can dry pots quickly. During monsoon, check moisture and drainage before watering. Cooler weather often means slower growth.'
  };

  if (/tulsi|tulasi|holy basil|ocimum tenuiflorum/.test(n)) {
    Object.assign(a, {
      emoji: '🌿',
      water: 'Water when the top layer begins to dry; do not leave roots sitting in water.',
      light: 'Usually thrives with several hours of sun; morning sun is gentler in very hot weather.',
      soil: 'Well-draining potting mix with compost.',
      feed: 'A modest amount of compost during active growth is often enough.'
    });
  } else if (/money plant|pothos/.test(n)) {
    Object.assign(a, {
      emoji: '🍃',
      water: 'Let the top 2–4 cm dry before watering. Reduce watering if soil stays damp during monsoon.',
      light: 'Bright indirect light is ideal; avoid harsh afternoon sun.',
      soil: 'Airy, well-draining potting mix.',
      feed: 'Use diluted houseplant fertilizer during active growth, following the label.'
    });
  } else if (/snake plant|sansevieria/.test(n)) {
    Object.assign(a, {
      emoji: '🌱',
      water: 'Let much of the mix dry before watering; water less often in cooler months.',
      light: 'Tolerates lower light but usually grows better in indirect light.',
      soil: 'Very free-draining or succulent mix.',
      feed: 'Feed sparingly during active growth.'
    });
  } else if (/aloe|succulent|cactus/.test(n)) {
    Object.assign(a, {
      emoji: '🌵',
      water: 'Allow the mix to dry thoroughly between waterings. Never leave the pot standing in water.',
      light: 'Bright light and some direct sun; acclimatise gradually.',
      soil: 'Gritty, fast-draining succulent mix.',
      feed: 'Fertilizer is usually needed sparingly.'
    });
  } else if (/hibiscus|jasmine|marigold|bougainvillea|rose/.test(n)) {
    Object.assign(a, {
      emoji: '🌸',
      water: 'Check soil frequently during hot weather, but avoid waterlogging.',
      light: 'Most flowering plants need several hours of direct sun; protect from extreme afternoon heat if wilting.',
      soil: 'Fertile, well-draining soil.',
      feed: 'Use fertilizer suited to flowering plants according to the label.'
    });
  } else if (/curry leaf/.test(n)) {
    Object.assign(a, {
      emoji: '🌿',
      water: 'Keep lightly moist while establishing, then let the top layer begin to dry.',
      light: 'Bright light and several hours of sun generally support growth.',
      soil: 'Well-draining potting mix with compost.',
      feed: 'Use compost or balanced fertilizer during growing season.'
    });
  }

  return a;
}

window.showCare = id => {
  const p = plants.find(x => x.id === id);
  if (!p) return;

  const a = advice(p.name, p.location);

  $('care').innerHTML = `
    <div class="carehead">
      <div class="careemoji">${a.emoji}</div>
      <div>
        <h2>${esc(p.name)}</h2>
        <p>${esc(p.location)} · starter care plan</p>
      </div>
    </div>
    ${[
      ['💧 Watering', a.water],
      ['☀️ Light & placement', a.light],
      ['🪴 Soil & pot', a.soil],
      ['🌱 Fertilizer', a.feed],
      ['🇮🇳 Seasonal note', a.season]
    ].map(([h, t]) => `
      <div class="carebit">
        <b>${h}</b>
        <p>${t}</p>
      </div>
    `).join('')}
    <p class="note">
      General guidance only. Variety, pot size, soil, local weather and current moisture affect care needs.
    </p>
  `;

  $('careModal').classList.remove('hide');
};

document.querySelectorAll('.tab').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => {
      x.classList.toggle('active', x === b);
    });

    document.querySelectorAll('.panel').forEach(x => {
      x.classList.toggle('active', x.id === b.dataset.tab);
    });
  };
});


$('diagnose').onclick = async () => {
  const symptom = $('symptom').value.trim();
  const s = symptom.toLowerCase();
  const plant = plants.find(x => x.id === $('which').value);
  const file = $('issuePhoto').files[0];
  const result = $('result');
  const button = $('diagnose');

  if (!symptom && !file) {
    alert('Upload a photo or describe a symptom first.');
    return;
  }

  result.classList.remove('hide');
  result.replaceChildren();

  const heading = document.createElement('h3');
  heading.textContent = '🌿 Plant health check';
  result.appendChild(heading);

  if (plant) {
    const p = document.createElement('p');
    p.textContent = 'Plant: ' + plant.name;
    result.appendChild(p);
  }

  if (file) {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      result.append('Please choose a JPG or PNG photo.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      result.append('Please choose a photo smaller than 8 MB.');
      return;
    }

    button.disabled = true;
    button.textContent = 'Analysing photo...';

    const status = document.createElement('p');
    status.textContent = 'Checking for possible diseases or pests...';
    result.appendChild(status);

    try {
      const form = new FormData();
      form.append('image', file);
      form.append('organ', 'auto');

      const response = await fetch(
        'https://plantnest-api.sudeep17.workers.dev/disease',
        { method: 'POST', body: form }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Disease identification failed.');
      }

      status.remove();

      
const results = Array.isArray(data.results) ? data.results : [];

const scoredResults = results
  .map(item => ({
    ...item,
    score: Number(item.score)
  }))
  .filter(item => Number.isFinite(item.score))
  .sort((a, b) => b.score - a.score);

const bestScore = scoredResults.length
  ? scoredResults[0].score
  : 0;

// Scores are treated as API match scores, not confirmed probabilities.
if (!scoredResults.length || bestScore < 0.10) {
  const noMatch = document.createElement('p');
  noMatch.textContent =
    'No reliable disease match was found for this photo. The AI results are inconclusive, so we cannot identify a disease confidently.';
  result.appendChild(noMatch);

  const tipsHeading = document.createElement('h4');
  tipsHeading.textContent = 'What to check next';
  result.appendChild(tipsHeading);

  const tips = document.createElement('ul');

  [
    'Take a close-up photo of the affected leaf in good natural light.',
    'Check both sides of the leaves for spots, insects, or powdery growth.',
    'Check soil moisture and drainage before watering again.',
    'Avoid applying pesticides until you have a clearer idea of the cause.'
  ].forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    tips.appendChild(li);
  });

  result.appendChild(tips);
} else {
  const intro = document.createElement('p');
  intro.textContent = 'Possible disease matches (not confirmed diagnoses):';
  result.appendChild(intro);

  const list = document.createElement('ol');

  scoredResults.slice(0, 5).forEach(item => {
    const li = document.createElement('li');

    const label =
      item.label ||
      item.description ||
      item.name ||
      'Possible disease';

    li.textContent =
      label + ' — API match score ' +
      Math.round(item.score * 100) + '%';

    list.appendChild(li);
  });

  result.appendChild(list);
}


      if (symptom) {
        const p = document.createElement('p');
        p.textContent = 'Your symptom notes: ' + symptom;
        result.appendChild(p);
      }

      const caution = document.createElement('p');
      caution.textContent =
        'Preliminary AI suggestions only, not a confirmed diagnosis. Coverage is limited. Inspect the plant carefully before choosing treatment.';
      result.appendChild(caution);

    } catch (error) {
      status.textContent = 'Could not analyse the photo: ' + error.message;
    } finally {
      button.disabled = false;
      button.textContent = 'Diagnose';
    }

    return;
  }

  const advice = [];

  if (/yellow|pale/.test(s)) {
    advice.push('Check soil moisture, drainage and light exposure.');
  }
  if (/brown|crisp|tip|dry edge/.test(s)) {
    advice.push('Check watering consistency, heat exposure and fertilizer buildup.');
  }
  if (/droop|wilt|limp/.test(s)) {
    advice.push('Check soil before watering; both dry soil and waterlogged roots can cause wilting.');
  }
  if (/spot|powder/.test(s)) {
    advice.push('Inspect both sides of leaves and improve airflow.');
  }
  if (/bug|insect|web|mite|aphid|mealy/.test(s)) {
    advice.push('Inspect leaf undersides and isolate the plant if pests are present.');
  }
  if (/rot|soft stem|smell|black/.test(s)) {
    advice.push('Check drainage and look for soft, dark roots or stems.');
  }
  if (!advice.length) {
    advice.push('Check soil moisture, drainage, light and leaf undersides.');
  }

  const list = document.createElement('ul');
  advice.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });
  result.appendChild(list);

  const note = document.createElement('p');
  note.textContent =
    'General guidance only. Upload a clear photo to try AI disease identification.';
  result.appendChild(note);
};


$('notify').onclick = async () => {
  if (!('Notification' in window)) {
    alert('Notifications are not supported in this browser.');
    return;
  }

  if (!window.isSecureContext) {
    alert('Notifications need a secure HTTPS website. Try after hosting the app.');
    return;
  }

  const p = await Notification.requestPermission();

  alert(
    p === 'granted'
      ? 'Permission enabled. Scheduled reminders need a future notification service.'
      : 'Notifications not enabled; check browser settings.'
  );
};

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

render();
