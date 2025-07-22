const mlog = require("mocha-logger");

/**
 * Execute a function with error handling and optional error screenshot
 * @param {Function} fn - Function to execute
 * @param {string} errorMessage - Error message to display
 * @param {Object} options - Optional parameters for error handling
 * @param {Object} options.page - Puppeteer page for screenshot
 * @param {string} options.testCaseId - Test case ID for screenshot naming
 * @param {string} options.screenshotPath - Path where to save error screenshot
 */
async function run(fn, errorMessage, options = {}) {
  try {
    await fn();
  } catch (e) {
    const fullErrorMessage = errorMessage + ": " + e.message;
    mlog.error(fullErrorMessage);

    // Take error screenshot if page and paths are provided
    if (options.page && options.testCaseId && options.screenshotPath) {
      try {
        const { takeScreenshotAndSave } = require("../image/takeScreenshot");
        const errorScreenshotPath = `${options.screenshotPath}/error.png`;

        await takeScreenshotAndSave(errorScreenshotPath, options.page, 3);
        mlog.log(`📸 Error screenshot saved: ${errorScreenshotPath}`);
      } catch (screenshotError) {
        mlog.error(
          `⚠️ Failed to take error screenshot: ${screenshotError.message}`
        );
      }
    }

    throw new Error(fullErrorMessage);
  }
}

module.exports = { run };
