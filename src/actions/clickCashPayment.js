const puppeteer = require("puppeteer");

/**
 * Click CASH payment method button
 * @param {Page} page - Puppeteer page object
 */
async function clickCashPayment(page) {
  const timeout = 18000;

  try {
    const targetPage = page;

    // Click CASH toggle button
    await puppeteer.Locator.race([
      targetPage.locator("[data-testid='toggle-button-2']"),
      targetPage.locator('[data-testid="toggle-button-2"]'),
      targetPage.locator("//button[@data-testid='toggle-button-2']"),
      targetPage.locator("//button[@data-testid='toggle-button-2']"),
    ])
      .setTimeout(timeout)
      .click();

    console.log("✅ CASH payment method selected");
  } catch (e) {
    console.error("❌ Error selecting CASH payment method:", e);
    throw e;
  }
}

module.exports = { clickCashPayment };
