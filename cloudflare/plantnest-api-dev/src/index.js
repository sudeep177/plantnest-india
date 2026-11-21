export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed =
      origin === "https://sudeep177.github.io" ||
      origin === "http://localhost" ||
      origin === "https://localhost";

    const headers = {
      "Access-Control-Allow-Origin": allowed ? origin : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: allowed ? 204 : 403,
        headers
      });
    }

    if (!allowed) {
      return Response.json(
        { error: "Website origin not allowed" },
        { status: 403, headers }
      );
    }

    const path = new URL(request.url).pathname;
    const disease = path === "/disease";

    if (!disease && path !== "/") {
      return Response.json(
        { error: "Unknown endpoint" },
        { status: 404, headers }
      );
    }

    if (request.method !== "POST") {
      return Response.json(
        { error: "Use POST to identify a plant" },
        { status: 405, headers }
      );
    }

    if (!env.PLANTNET_API_KEY) {
      return Response.json(
        { error: "PlantNet API key is not configured" },
        { status: 500, headers }
      );
    }

    try {
      const form = await request.formData();
      const image = form.get("image");

      if (!image || typeof image === "string") {
        return Response.json(
          { error: "Please upload a plant photo" },
          { status: 400, headers }
        );
      }

      if (image.size > 8 * 1024 * 1024) {
        return Response.json(
          { error: "Photo must be smaller than 8 MB" },
          { status: 413, headers }
        );
      }

      if (!["image/jpeg", "image/png"].includes(image.type)) {
        return Response.json(
          { error: "Please use a JPG or PNG photo" },
          { status: 400, headers }
        );
      }

      const plantForm = new FormData();
      plantForm.append("images", image, image.name || "plant.jpg");

      const organ = form.get("organ");
      if (
        typeof organ === "string" &&
        ["auto", "leaf", "flower", "fruit", "bark"].includes(organ)
      ) {
        plantForm.append("organs", organ);
      }

      const endpoint = disease
        ? "https://my-api.plantnet.org/v2/diseases/identify"
        : "https://my-api.plantnet.org/v2/identify/all";

      const url = new URL(endpoint);
      url.searchParams.set("api-key", env.PLANTNET_API_KEY);
      url.searchParams.set("lang", "en");

      if (disease) {
        url.searchParams.set("nb-results", "5");
      }

      const result = await fetch(url.toString(), {
        method: "POST",
        body: plantForm
      });

      const body = await result.text();

      return new Response(body, {
        status: result.status,
        headers: {
          ...headers,
          "Content-Type":
            result.headers.get("Content-Type") || "application/json"
        }
      });
    } catch {
      return Response.json(
        { error: "Request failed. Please try a clear JPG or PNG photo." },
        { status: 500, headers }
      );
    }
  }
};
