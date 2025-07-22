const puppeteer = require("puppeteer");
const { logDebugger } = require("../lib/logger");

/**
 * Click SPEI payment method button
 * @param {Page} page - Puppeteer page object
 */
async function clickSpeiPayment(page) {
  const timeout = 18000;

  try {
    const targetPage = page;

    // Click SPEI toggle button
    await puppeteer.Locator.race([
      targetPage.locator("[data-testid='toggle-button-1']"),
      targetPage.locator('[data-testid="toggle-button-1"]'),
      targetPage.locator("//button[@data-testid='toggle-button-1']"),
      targetPage.locator("//button[@data-testid='toggle-button-1']"),
    ])
      .setTimeout(timeout)
      .click();

    logDebugger("✅ SPEI payment method selected", null, null, "success");
  } catch (e) {
    logDebugger(
      "❌ Error selecting SPEI payment method:",
      { error: e.message },
      null,
      "error"
    );
    throw e;
  }
}

module.exports = { clickSpeiPayment };
