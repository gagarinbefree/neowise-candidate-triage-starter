const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");

async function check(url) {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const page = await browser.newPage();
    await page.goto(url);
    const input = page.locator("#message");
    const result = page.locator("#result");
    const submit = page.getByRole("button");
    for (const marker of ["error", "bad-json", "bad-topic", "empty-draft", "timeout"]) {
      await input.fill("Когда доставка?");
      await submit.click();
      await result.filter({ hasText: "Спасибо за обращение" }).waitFor();
      await input.fill(`[${marker}]`);
      await submit.click();
      // The unmodified starter renders the API status as JSON.
      await result.filter({ hasText: /ручной разбор|manual_review/ }).waitFor();
      assert.doesNotMatch(await result.innerText(), /Спасибо за обращение/);
      assert.equal(await input.inputValue(), `[${marker}]`);
    }

    await input.fill("   ");
    await submit.click();
    await result.filter({ hasText: /Введите текст заявки|invalid_input/ }).waitFor();
  } finally {
    await browser.close();
  }
}

check(process.argv[2]).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
