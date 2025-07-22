const mlog = require("mocha-logger");
const { paymentStrategyManager } = require("../strategies");
const { createDirectory } = require("../lib/fs_utils");
const { getFormattedDateTime } = require("../lib/date_utils");
const { takeScreenshotAndSave } = require("../image/takeScreenshot");
const { formatRequestLogs } = require("../lib/formatRequestLogs");
const { writeFile } = require("../lib/fs_utils");
const { DEV } = require("../constants/environment");
const { logHeader } = require("../lib/logger");
require("dotenv").config();

const env = (process.env.ENV || DEV).toUpperCase();
const SAVE_TEST_DIR = `completed_tests/test_runs`;

/**
 * Enhanced task function using Strategy Pattern
 * Executes payment checkout flows based on payment type and flow type
 */
async function taskCheckoutPay(page, data, test_run_id, results_run) {
  const DEFAULT_PAGE_TIMEOUT = 15000;
  const TIMEOUT_WAIT_LOGS = 3000;
  const BASE_DIR = process.cwd();

  const {
    test_case_id,
    payment_request_type,
    payment_flow_type,
    request_log_list,
  } = data;

  let status = "OK";
  let displayed_amount;
  let TEST_CASE_ID_FULL_PATH;
  let executionResult = null;

  try {
    logHeader(data, "📊 PARAMETERS");
    logHeader({}, "📁 GENERATING DIRECTORY...");

    // Create test directory structure
    createDirectory(
      `${SAVE_TEST_DIR}/${env}-${payment_request_type.toLowerCase()}/${test_run_id}`,
      test_case_id
    );

    TEST_CASE_ID_FULL_PATH = `${SAVE_TEST_DIR}/${env}-${payment_request_type.toLowerCase()}/${test_run_id}/${test_case_id.toString()}`;

    // Configure page settings
    await page.setViewport({ width: 1280, height: 1080 });
    await page.setRequestInterception(true);
    page.setDefaultTimeout(DEFAULT_PAGE_TIMEOUT);

    // Set up request interception for image blocking
    page.on("request", (request) => {
      if (request.resourceType() === "image") request.abort();
      else request.continue();
    });

    // Set up response monitoring with request logging
    page.on("response", async (response) => {
      const request = response.request();
      const requestUrl = request?.url();

      // URLs to exclude from logging
      const excludedUrls = [
        "api.segment.io/v1/i",
        "dev-elements.payclip.com/api/risk",
        "api.segment.io",
        "analytics.payclip.com",
        "events.payclip.com",
        "/prevention_data/",
        "rum.browser-intake-datadoghq.com",
        "api.ipify.org",
      ];

      // Check if URL should be excluded
      const shouldExclude = excludedUrls.some(
        (excludedUrl) => requestUrl && requestUrl.includes(excludedUrl)
      );

      // Only log API requests (avoid logging static assets and excluded URLs)
      if (
        requestUrl &&
        !shouldExclude &&
        (requestUrl.includes("api") || requestUrl.includes("card_tokens"))
      ) {
        try {
          const headers = response.headers();
          const status = response.status();

          // Get request payload if available
          let requestPayload = null;
          try {
            if (request.postData()) {
              requestPayload = JSON.parse(request.postData());
            }
          } catch (e) {
            // Not JSON or no post data
            requestPayload = request.postData() || null;
          }

          // Get response body if available
          let responseBody = null;
          try {
            if (headers["content-type"]?.includes("application/json")) {
              responseBody = await response.json();
            } else {
              responseBody = await response.text();
            }
          } catch (e) {
            // Response already consumed or not readable
            responseBody = null;
          }

          // Skip card_tokens requests with null payload and response
          const isCardTokens = requestUrl.includes("card_tokens");
          const hasNullData = requestPayload === null && responseBody === null;

          if (isCardTokens && hasNullData) {
            console.log(`Skipping card_tokens with null data: ${requestUrl}`);
            return;
          }

          // Add to request log list
          request_log_list.push({
            url: requestUrl,
            method: request.method(),
            statusCode: status,
            headers: headers,
            payload: requestPayload,
            response: responseBody,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.log(`Error logging request to ${requestUrl}:`, error.message);
        }
      }
    });

    // Add TEST_CASE_ID_FULL_PATH to data for strategy execution
    const enhancedData = {
      ...data,
      TEST_CASE_ID_FULL_PATH,
    };

    // Execute payment flow using Strategy Pattern
    logHeader({}, "🎯 Executing Payment Flow using Strategy Pattern");

    executionResult = await paymentStrategyManager.executePaymentFlow(
      enhancedData,
      page,
      test_run_id,
      results_run
    );

    // Extract results from strategy execution
    status = executionResult.status;
    displayed_amount = executionResult.displayedAmount;

    logHeader({}, `📊 Strategy Execution Summary:`);
    logHeader({}, `   • Strategy: ${executionResult.strategy || "Unknown"}`);
    logHeader(
      {},
      `   • Executed Actions: ${executionResult.executedActions.length}`
    );
    logHeader({}, `   • Errors: ${executionResult.errors.length}`);
    logHeader({}, `   • Final Status: ${status}`);
  } catch (e) {
    status = `Failed reason: { ${e.message} }`;
    console.log(e);
    logHeader({}, `⚠️ Saving screenshot for error occurred: ${test_case_id}`);

    const PATH_IMAGE_ERROR_HAPPENED = `${TEST_CASE_ID_FULL_PATH}/error-occurred.png`;
    await takeScreenshotAndSave(PATH_IMAGE_ERROR_HAPPENED, page);
  } finally {
    // Reset strategy manager for next execution
    paymentStrategyManager.reset();

    // Generate result for excel (maintaining existing format)
    const { card, email, phone, payment_request_id, payment_flow_type } = data;

    const result_test_case = [
      test_case_id,
      card,
      email,
      phone,
      payment_request_id,
      payment_flow_type,
      displayed_amount,
      payment_request_type,
      getFormattedDateTime(),
      status,
    ];

    results_run.push(result_test_case);

    logHeader({}, `📝 Save logs: ${test_case_id}`);
    const PATH_LOG_SAVE_DIR = BASE_DIR + `/${TEST_CASE_ID_FULL_PATH}/logs.json`;

    logHeader({}, `💾 Write JSON Logs results: ${test_case_id}`);
    setTimeout(
      async () =>
        await writeFile(
          PATH_LOG_SAVE_DIR,
          formatRequestLogs(request_log_list),
          TIMEOUT_WAIT_LOGS
        )
    );
  }
}

module.exports = { taskCheckoutPay };
