
const $ = id => document.getElementById(id);

let plants = JSON.parse(localStorage.getItem('plantnest-plants') || '[]');
let plantPhoto = null;
let issuePhoto = null;

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
  readImage(e.target.files[0], d => {
    plantPhoto = d;
    $('plantPreview').src = d;
    $('plantPreview').classList.remove('hide');
  });
};

/* AI plant identification */
const photoInput = $('photo');

if (!document.getElementById('identifyPlant')) {
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'identifyPlant';
  button.textContent = '🌿 Identify Plant with AI';

  const output = document.createElement('div');
  output.id = 'identifyResult';
  output.setAttribute('aria-live', 'polite');

  photoInput.insertAdjacentElement('afterend', button);
  button.insertAdjacentElement('afterend', output);
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

    output.replaceChildren();

    const heading = document.createElement('p');
    heading.textContent = '🌱 AI identification results:';
    output.appendChild(heading);

    data.results.slice(0, 3).forEach((item, index) => {
      const species = item.species || {};
      const commonName = species.commonNames?.[0];
      const scientificName =
        species.scientificNameWithoutAuthor ||
        species.scientificName ||
        'Unknown plant';

      const line = document.createElement('p');
      line.textContent =
        `${index + 1}. ${commonName || scientificName}` +
        ` — ${Math.round((item.score || 0) * 100)}% match` +
        (commonName ? ` (${scientificName})` : '');

      output.appendChild(line);

      if (index === 0) {
        $('name').value = commonName || scientificName;
      }
    });

    const note = document.createElement('p');
    note.textContent =
      'Review the suggested name before saving. AI identification may be incorrect.';
    output.appendChild(note);

  } catch (error) {
    output.textContent =
      'Could not identify the plant: ' + error.message;
  } finally {
    button.disabled = false;
  }
};

$('issuePhoto').onchange = e => {
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

  if (/tulsi|holy basil/.test(n)) {
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

$('diagnose').onclick = () => {
  const s = $('symptom').value.toLowerCase().trim();
  const p = plants.find(x => x.id === $('which').value);

  if (!s && !issuePhoto) {
    alert('Upload a photo or describe a symptom first.');
    return;
  }

  const items = [];

  if (/yellow|pale/.test(s)) {
    items.push('Check soil moisture and drainage: both consistently wet soil and prolonged dryness can cause yellowing.');
  }

  if (/brown|crisp|tip|dry edge/.test(s)) {
    items.push('Check irregular watering, hot direct sun, low humidity, or fertilizer buildup.');
  }

  if (/droop|wilt|limp/.test(s)) {
    items.push('Check soil before watering. Wilting can result from dry soil or waterlogged roots.');
  }

  if (/spot|powder/.test(s)) {
    items.push('Consider isolating the plant, improving airflow, and photographing both sides of affected leaves. Identify the issue before applying treatment.');
  }

  if (/bug|insect|web|mite|aphid|mealy/.test(s)) {
    items.push('Inspect leaf undersides and stems. Isolate the plant and gently rinse visible pests; identify them before choosing treatment.');
  }

  if (/rot|soft stem|smell|black/.test(s)) {
    items.push('Check for waterlogged soil and soft, dark roots or stems. Stop standing water and seek plant-specific advice before treatment.');
  }

  if (!items.length) {
    items.push('Check soil moisture, drainage, light exposure, recent changes, and leaf undersides. Compare new and old growth.');
  }

  items.push('Change one factor at a time, observe new growth, and avoid mixing pesticides or home remedies.');

  $('result').innerHTML = `
    <h3>Possible causes to check</h3>
    <p>
      ${p ? 'Plant: <b>' + esc(p.name) + '</b>. ' : ''}
      ${issuePhoto ? 'A photo is selected, but this version does not analyse image pixels. ' : ''}
      Based on your description:
    </p>
    <ul>${items.map(x => `<li>${x}</li>`).join('')}</ul>
    <p>
      <b>To narrow it down:</b> note watering frequency, sunlight hours, and whether soil below the surface is wet or dry.
    </p>
  `;

  $('result').classList.remove('hide');
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
