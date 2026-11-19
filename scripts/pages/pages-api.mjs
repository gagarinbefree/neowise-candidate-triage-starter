import { classify } from "./mock-ai.mjs";

// GitHub Pages serves static files. Keep the demo's request and response contract
// compatible with the HTTP form so the deployed page uses the submitted UI unchanged.
export async function fetchTriage(url, options) {
  if (url !== "/api/triage" || options?.method !== "POST") return globalThis.fetch(url, options);
  let input;
  try {
    input = JSON.parse(options.body);
  } catch {
    return Response.json({ status: "invalid_input" }, { status: 400 });
  }
  if (typeof input?.text !== "string" || !input.text.trim()) {
    return Response.json({ status: "invalid_input" }, { status: 400 });
  }
  try {
    const raw = await classify(input.text.trim(), { signal: AbortSignal.timeout(300) });
    const result = JSON.parse(raw);
    if (["delivery", "pricing", "other"].includes(result?.topic)
        && typeof result.draft === "string" && result.draft.trim()) {
      return Response.json({ status: "ready", topic: result.topic, draft: result.draft.trim() });
    }
  } catch {
    // Provider errors and invalid JSON both require manual review.
  }
  return Response.json({ status: "manual_review", topic: null, draft: null });
}
