import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import { server } from "../server.mjs";

let url;
before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  url = `http://127.0.0.1:${server.address().port}/api/triage`;
});
after(() => new Promise((resolve) => server.close(resolve)));

function post(body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

test("invalid input returns HTTP 400", async () => {
  const invalidTexts = ["", " \t\n", 42, null, [], {}];
  const bodies = ["", "{", "null", "{}", ...invalidTexts.map(text => JSON.stringify({ text }))];
  for (const body of bodies) {
    const reply = await post(body);
    assert.equal(reply.status, 400, body);
    assert.deepEqual(await reply.json(), { status: "invalid_input" }, body);
  }
});

test("valid requests return a topic and a draft", async () => {
  const requests = [
    [" Когда доставка? ", "delivery"],
    ["Какая цена?", "pricing"],
    ["Здравствуйте", "other"],
  ];
  for (const [text, topic] of requests) {
    const reply = await post(JSON.stringify({ text }));
    assert.equal(reply.status, 200);
    const result = await reply.json();
    assert.equal(result.status, "ready");
    assert.equal(result.topic, topic);
    assert.equal(typeof result.draft, "string");
    assert.ok(result.draft.trim());
  }
});

for (const marker of ["error", "bad-json", "bad-topic", "empty-draft", "timeout"]) {
  test(`[${marker}] returns manual review with no draft`, async () => {
    const start = performance.now();
    const reply = await post(JSON.stringify({ text: `[${marker}]` }));
    assert.equal(reply.status, 200);
    assert.deepEqual(await reply.json(), { status: "manual_review", topic: null, draft: null });
    if (marker === "timeout") {
      // Allow for HTTP and scheduling overhead while detecting the full 1200 ms mock delay.
      assert.ok(performance.now() - start < 1000, "request waited for the slow provider");
    }
  });
}
