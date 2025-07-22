const puppeteer = require("puppeteer");
const axios = require("axios");
const { logDebugger } = require("../lib/logger");

/**
 * Handle SPEI payment flow after clicking pay button
 * 1. Get concepto from data-testid="SpeiPaymentFlow-field-value-2"
 * 2. Get amount value from data-testid="SpeiPaymentFlow-field-value-0"
 * 3. Execute PATCH request to approve SPEI payment
 * @param {Object} page - Puppeteer page instance
 * @returns {Promise<Object>} Result with concept, amount, and API response
 */
async function handleSpeiPaymentFlow(page) {
  const timeout = 30000;
  let concepto = null;
  let amount = null;
  let apiResponse = null;

  try {
    logDebugger("🏦 Starting SPEI payment flow...", null, null, "log");

    // Wait for SPEI payment screen to load
    await page.waitForSelector(
      '[data-testid="SpeiPaymentFlow-field-value-2"]',
      {
        timeout: timeout,
      }
    );

    // 1. Get concepto directly from the specified element
    logDebugger("📝 Getting concepto from element...", null, null, "log");
    const conceptoElement = await page.$(
      '[data-testid="SpeiPaymentFlow-field-value-2"]'
    );
    if (conceptoElement) {
      concepto = await page.evaluate(
        (el) => el.textContent || el.innerText,
        conceptoElement
      );
      // Clean the concepto text (remove extra spaces, line breaks, etc.)
      concepto = concepto ? concepto.trim() : null;
      logDebugger("📝 Concepto obtenido:", { concepto }, null, "success");
    } else {
      throw new Error(
        "Could not find concepto element with data-testid='SpeiPaymentFlow-field-value-2'"
      );
    }

    // 2. Get amount value from the specified div
    logDebugger("💰 Getting amount value...", null, null, "log");
    const amountElement = await page.$(
      '[data-testid="SpeiPaymentFlow-field-value-0"]'
    );
    if (amountElement) {
      const amountText = await page.evaluate(
        (el) => el.textContent || el.innerText,
        amountElement
      );
      // Extract numeric value from text (remove currency symbols, commas, etc.)
      amount = parseFloat(amountText.replace(/[^\d.]/g, ""));
      logDebugger("💵 Amount obtenido:", { amount }, null, "success");
    } else {
      throw new Error(
        "Could not find amount element with data-testid='SpeiPaymentFlow-field-value-0'"
      );
    }

    // 3. Execute PATCH request if we have both concepto and amount
    if (concepto && amount) {
      logDebugger(
        "🚀 Executing SPEI approval request...",
        { concepto, amount },
        null,
        "log"
      );
      apiResponse = await executeSpeiApprovalRequest(concepto, amount);
      logDebugger(
        "✅ SPEI approval request completed",
        { apiResponse: !!apiResponse },
        null,
        "success"
      );
    } else {
      throw new Error(
        `Missing required data - Concepto: ${concepto}, Amount: ${amount}`
      );
    }

    return {
      success: true,
      concepto,
      amount,
      apiResponse,
      message: "SPEI payment flow completed successfully",
    };
  } catch (error) {
    console.error("❌ Error in SPEI payment flow:", error.message);
    return {
      success: false,
      concepto,
      amount,
      apiResponse,
      error: error.message,
      message: "SPEI payment flow failed",
    };
  }
}

/**
 * Execute PATCH request to approve SPEI payment
 * @param {string} concepto - The concept/reference from SPEI flow
 * @param {number} amount - The payment amount
 * @returns {Promise<Object>} API response
 */
async function executeSpeiApprovalRequest(concepto, amount) {
  const url = `https://payments-api.dev.payclip.com/bank_transfer/${concepto}`;

  const payload = {
    status: "approved",
    spei_id: "123456",
    reference: "123456",
    amount: amount,
  };

  const config = {
    method: "PATCH",
    url: url,
    headers: {
      "Content-Type": "application/json",
    },
    data: payload,
  };

  try {
    logDebugger("📡 Sending SPEI approval request to:", { url }, null, "log");
    logDebugger("📦 Payload:", { payload }, null, "log");

    const response = await axios(config);

    logDebugger(
      "✅ SPEI approval response status:",
      { status: response.status },
      null,
      "success"
    );
    logDebugger(
      "📨 Response data:",
      { responseData: response.data },
      null,
      "success"
    );

    return {
      success: true,
      status: response.status,
      data: response.data,
      url: url,
      payload: payload,
    };
  } catch (error) {
    logDebugger(
      "❌ SPEI approval request failed:",
      { error: error.message },
      null,
      "error"
    );

    const errorResponse = {
      success: false,
      error: error.message,
      url: url,
      payload: payload,
    };

    if (error.response) {
      errorResponse.status = error.response.status;
      errorResponse.data = error.response.data;
    }

    return errorResponse;
  }
}

module.exports = {
  handleSpeiPaymentFlow,
  executeSpeiApprovalRequest,
};
