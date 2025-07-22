async function takeScreenshotAndSave(pathImage, targetPage, retries = 3) {
  // Enhanced validation for critical screenshots
  const isCritical =
    retries >= 5 ||
    pathImage.includes("success-pay-page") ||
    pathImage.includes("error-ocurred");

  const { logDebugger } = require("../lib/logger");
  const path = require("path");
  const fileName = path.basename(pathImage);
  const testCaseId =
    pathImage.match(/([^\/]+)\/[^\/]+\.png$/)?.[1] || "UNKNOWN";

  logDebugger(
    `🔄 Starting screenshot capture process for ${fileName}`,
    {
      filePath: pathImage,
      isCritical,
      maxRetries: retries,
      testCaseId,
    },
    testCaseId,
    "log"
  );

  for (let attempt = 1; attempt <= retries; attempt++) {
    logDebugger(
      `📸 Screenshot attempt ${attempt}/${retries} for ${fileName}`,
      {
        attempt,
        retries,
        isCritical,
        pageExists: !!targetPage,
        pageClosed: targetPage ? targetPage.isClosed() : "N/A",
      },
      testCaseId,
      "log"
    );

    try {
      // Check if page is still active and not closed
      if (!targetPage || targetPage.isClosed()) {
        logDebugger(
          `⚠️ Page validation failed on attempt ${attempt}`,
          {
            pageExists: !!targetPage,
            pageClosed: targetPage ? targetPage.isClosed() : "N/A",
            attempt,
            filePath: pathImage,
          },
          testCaseId,
          "error"
        );

        if (attempt === retries) {
          const errorMsg = isCritical
            ? `🚨 CRITICAL FAILURE: Page closed after ${retries} attempts for MANDATORY screenshot: ${pathImage}`
            : `CRITICAL: Page closed after ${retries} attempts for ${pathImage}`;

          logDebugger(
            `❌ Final attempt failed - page closed`,
            {
              errorType: "PAGE_CLOSED",
              attempts: retries,
              isCritical,
              filePath: pathImage,
            },
            testCaseId,
            "error"
          );
          throw new Error(errorMsg);
        }
        // Longer delay for critical screenshots
        const delayMs = isCritical ? 200 * attempt : 100 * attempt;
        logDebugger(
          `⏳ Waiting ${delayMs}ms before retry`,
          { delayMs, attempt, isCritical },
          testCaseId,
          "pending"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      // Enhanced page responsiveness check with robust error handling
      let pageUrl = "N/A";
      let pageTitle = "N/A";

      try {
        if (targetPage && !targetPage.isClosed()) {
          pageUrl = await targetPage.url();
        }
      } catch (urlError) {
        pageUrl = "URL_ERROR";
      }

      try {
        if (targetPage && !targetPage.isClosed()) {
          pageTitle = await targetPage.title();
        }
      } catch (titleError) {
        pageTitle = "TITLE_ERROR";
      }
      logDebugger(
        `🔍 Checking page responsiveness for ${fileName}`,
        {
          attempt,
          pageUrl,
          pageTitle,
        },
        testCaseId,
        "log"
      );

      try {
        const readyState = await Promise.race([
          targetPage.evaluate(() => document.readyState),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Evaluation timeout")), 2000)
          ),
        ]);

        logDebugger(
          `✅ Page is responsive, readyState: ${readyState}`,
          { readyState, attempt },
          testCaseId,
          "success"
        );
      } catch (evalError) {
        let errorPageUrl = "N/A";
        try {
          if (targetPage && !targetPage.isClosed()) {
            errorPageUrl = await targetPage.url();
          }
        } catch (urlError) {
          errorPageUrl = "URL_ERROR";
        }

        logDebugger(
          `⚠️ Page responsiveness check failed on attempt ${attempt}`,
          {
            errorMessage: evalError.message,
            attempt,
            isCritical,
            pageUrl: errorPageUrl,
          },
          testCaseId,
          "error"
        );

        if (attempt === retries) {
          if (isCritical) {
            logDebugger(
              `🚨 CRITICAL: Attempting emergency screenshot despite unresponsive page`,
              {
                errorType: "PAGE_UNRESPONSIVE",
                attempts: retries,
                filePath: pathImage,
              },
              testCaseId,
              "error"
            );
            // For critical screenshots, try to take screenshot anyway
            try {
              await targetPage.screenshot({
                path: pathImage,
                fullPage: false, // Use viewport only for emergency screenshots
                timeout: 5000,
              });
              logDebugger(
                `🆘 Emergency screenshot captured successfully`,
                { filePath: pathImage, attempt },
                testCaseId,
                "success"
              );
              return true;
            } catch (emergencyError) {
              logDebugger(
                `💥 Emergency screenshot failed`,
                {
                  errorMessage: emergencyError.message,
                  errorType: "EMERGENCY_SCREENSHOT_FAILED",
                  attempts: retries,
                  filePath: pathImage,
                },
                testCaseId,
                "error"
              );
              throw new Error(
                `🚨 CRITICAL FAILURE: Page unresponsive and emergency screenshot failed after ${retries} attempts for MANDATORY screenshot: ${pathImage}`
              );
            }
          } else {
            logDebugger(
              `❌ Page unresponsive and not critical`,
              {
                errorType: "PAGE_UNRESPONSIVE",
                attempts: retries,
                filePath: pathImage,
              },
              testCaseId,
              "error"
            );
            throw new Error(
              `CRITICAL: Page not responsive after ${retries} attempts for ${pathImage}`
            );
          }
        }
        const delayMs = isCritical ? 200 * attempt : 100 * attempt;
        logDebugger(
          `⏳ Waiting ${delayMs}ms before retry (page unresponsive)`,
          { delayMs, attempt, errorType: "PAGE_UNRESPONSIVE" },
          testCaseId,
          "pending"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      // Take the screenshot with enhanced options for critical captures
      const screenshotOptions = {
        path: pathImage,
        fullPage: !isCritical || attempt < retries, // Use fullPage unless it's critical and last attempt
        timeout: isCritical ? 10000 : 5000, // Longer timeout for critical screenshots
      };

      logDebugger(
        `📸 Taking screenshot with options`,
        {
          ...screenshotOptions,
          attempt,
          isCritical,
          fileName,
        },
        testCaseId,
        "log"
      );

      await targetPage.screenshot(screenshotOptions);

      // Verify screenshot was actually saved
      const fs = require("fs");
      const screenshotExists = fs.existsSync(pathImage);
      const screenshotSize = screenshotExists ? fs.statSync(pathImage).size : 0;

      logDebugger(
        `✅ Screenshot operation completed`,
        {
          fileName,
          exists: screenshotExists,
          sizeBytes: screenshotSize,
          sizeMB: (screenshotSize / (1024 * 1024)).toFixed(2),
          attempt,
          isCritical,
        },
        testCaseId,
        "success"
      );

      if (!screenshotExists || screenshotSize === 0) {
        throw new Error(`Screenshot file not created or empty: ${pathImage}`);
      }

      return true;
    } catch (e) {
      logDebugger(
        `⚠️ Screenshot attempt ${attempt}/${retries} failed`,
        {
          errorMessage: e.message,
          errorStack: e.stack?.split("\n")[0], // First line of stack trace
          attempt,
          retries,
          fileName,
          isCritical,
        },
        testCaseId,
        "error"
      );

      if (attempt === retries) {
        const finalErrorMsg = isCritical
          ? `🚨 CRITICAL FAILURE: MANDATORY screenshot failed after ${retries} attempts for ${pathImage}: ${e.message}`
          : `CRITICAL: Screenshot failed after ${retries} attempts for ${pathImage}: ${e.message}`;

        logDebugger(
          `💥 Final screenshot attempt failed`,
          {
            errorType: "FINAL_SCREENSHOT_FAILURE",
            originalError: e.message,
            attempts: retries,
            filePath: pathImage,
            isCritical,
          },
          testCaseId,
          "error"
        );
        throw new Error(finalErrorMsg);
      }

      // Enhanced backoff strategy for critical screenshots
      const delayMs = isCritical ? 300 * attempt : 200 * attempt;
      logDebugger(
        `⏳ Waiting ${delayMs}ms before retry (attempt failed)`,
        { delayMs, attempt, errorType: "SCREENSHOT_FAILED" },
        testCaseId,
        "pending"
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return false;
}

/**
 * Force screenshot capture with extreme measures for critical situations
 * This function will try multiple strategies to ensure the screenshot is captured
 */
async function forceMandatoryScreenshot(pathImage, pageList, testCaseId) {
  const { logDebugger } = require("../lib/logger");
  const path = require("path");
  const fileName = path.basename(pathImage);

  logDebugger(
    `🚨 FORCING mandatory screenshot capture`,
    {
      filePath: pathImage,
      fileName,
      availablePages: pageList.length,
      testCaseId,
    },
    testCaseId,
    "error"
  );

  // Try each page in the list
  for (let i = 0; i < pageList.length; i++) {
    const page = pageList[i];

    let pageUrl = "N/A";
    try {
      if (page && !page.isClosed()) {
        pageUrl = await page.url();
      }
    } catch (urlError) {
      pageUrl = "URL_ERROR";
    }

    logDebugger(
      `🔍 Evaluating page ${i}/${pageList.length}`,
      {
        pageIndex: i,
        pageExists: !!page,
        pageClosed: page ? page.isClosed() : "N/A",
        pageUrl,
      },
      testCaseId,
      "log"
    );

    if (!page || page.isClosed()) {
      logDebugger(
        `⚠️ Page ${i} is not available`,
        {
          pageIndex: i,
          pageExists: !!page,
          pageClosed: page ? page.isClosed() : "N/A",
        },
        testCaseId,
        "error"
      );
      continue;
    }

    try {
      logDebugger(
        `📸 Force attempt starting with page ${i}`,
        {
          pageIndex: i,
          fileName,
          testCaseId,
        },
        testCaseId,
        "log"
      );

      // Multiple screenshot strategies
      const strategies = [
        // Strategy 1: Full page
        { name: "fullPage", fullPage: true, timeout: 3000 },
        // Strategy 2: Viewport only
        { name: "viewport", fullPage: false, timeout: 2000 },
        // Strategy 3: Quick capture
        { name: "quick", fullPage: false, timeout: 1000, quality: 50 },
      ];

      for (const strategy of strategies) {
        try {
          logDebugger(
            `🎯 Trying strategy: ${strategy.name}`,
            {
              pageIndex: i,
              strategy: strategy.name,
              ...strategy,
            },
            testCaseId,
            "log"
          );

          await page.screenshot({
            path: pathImage,
            ...strategy,
          });

          // Verify the screenshot was created
          const fs = require("fs");
          const screenshotExists = fs.existsSync(pathImage);
          const screenshotSize = screenshotExists
            ? fs.statSync(pathImage).size
            : 0;

          logDebugger(
            `🎯 FORCED screenshot SUCCESS`,
            {
              pageIndex: i,
              strategy: strategy.name,
              fileName,
              exists: screenshotExists,
              sizeBytes: screenshotSize,
              sizeMB: (screenshotSize / (1024 * 1024)).toFixed(2),
            },
            testCaseId,
            "success"
          );

          return true;
        } catch (strategyError) {
          logDebugger(
            `⚠️ Strategy ${strategy.name} failed`,
            {
              pageIndex: i,
              strategy: strategy.name,
              errorMessage: strategyError.message,
            },
            testCaseId,
            "error"
          );
        }
      }
    } catch (pageError) {
      logDebugger(
        `⚠️ Page ${i} failed completely`,
        {
          pageIndex: i,
          errorMessage: pageError.message,
          fileName,
        },
        testCaseId,
        "error"
      );
    }
  }

  logDebugger(
    `🚨 EXTREME FAILURE: Could not force screenshot capture`,
    {
      filePath: pathImage,
      fileName,
      triedPages: pageList.length,
      errorType: "FORCE_SCREENSHOT_TOTAL_FAILURE",
    },
    testCaseId,
    "error"
  );

  return false;
}

module.exports = { takeScreenshotAndSave, forceMandatoryScreenshot };
