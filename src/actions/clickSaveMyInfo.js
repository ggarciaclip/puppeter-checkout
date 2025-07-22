const puppeteer = require("puppeteer");

async function clickSaveMyInfo(page) {
  {
    const timeout = 12000;
    const targetPage = page;
    await puppeteer.Locator.race([
      targetPage.locator(
        '::-p-aria([role=\\"main\\"]) >>>> ::-p-aria([role=\\"checkbox\\"])'
      ),
      targetPage.locator("[data-testid='SaveCardInfo-wrap'] input"),
      targetPage.locator('input[name="buyerMemorizeData"]'),
      targetPage.locator(":scope >>> [data-testid='SaveCardInfo-wrap'] input"),
    ])
      .setTimeout(timeout)
      .click({
        offset: {
          x: 10,
          y: 6.5,
        },
      });
  }
}

/**
 * Check if the "Save my info" checkbox is checked
 * @param {Object} page - Puppeteer page object
 * @returns {boolean} - true if checked, false if not checked
 */
async function isSaveMyInfoChecked(page) {
  try {
    const timeout = 5000;
    const targetPage = page;

    // Wait for the checkbox to be available
    await targetPage.waitForSelector('input[name="buyerMemorizeData"]', {
      timeout,
    });

    // Check if the checkbox is checked
    const isChecked = await targetPage.evaluate(() => {
      const checkbox = document.querySelector(
        'input[name="buyerMemorizeData"]'
      );
      return checkbox ? checkbox.checked : false;
    });

    return isChecked;
  } catch (error) {
    console.log(`⚠️ Error checking save my info status: ${error.message}`);
    return false;
  }
}

module.exports = { clickSaveMyInfo, isSaveMyInfoChecked };
