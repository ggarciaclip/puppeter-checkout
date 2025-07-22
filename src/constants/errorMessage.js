const ACTION_ERROR_MESSAGES = {
  META_KEY_DOWN: "Error pressing down Meta key",
  META_KEY_UP: "Error releasing Meta key",
  FILL_EMAIL: "Error filling email",
  FILL_PHONE: "Error filling phone",
  FILL_CARD: "Error filling card",
  CLICK_SPEI_PAYMENT: "Error clicking SPEI payment button",
  CLICK_CASH_PAYMENT: "Error clicking Cash payment button",
  HANDLE_SPEI_FLOW: "Error handling SPEI payment flow",
  HANDLE_CASH_FLOW: "Error handling Cash payment flow",
  CLICK_SAVE_MY_INFO: "Error clicking save my info",
  GET_DISPLAYED_AMOUNT: "Error getting displayed amount",
  PAY_CHECKOUT: "Error in pay Checkout",
  WAIT_PAYMENT_TRANSITION: "Error waiting for payment transition",
  FINAL_STEPS: "Error during final steps",
  TASK_CHECKOUT_PAY: "Error in taskCheckoutPay",
  GENERATING_SUBSCRIPTION: "Error generating subscription",
  PAYMENT_SUCCESS: "Error getting into success payment page",

  // Strategy Pattern Action Error Messages
  NAVIGATE_TO_CHECKOUT: "Error navigating to checkout page",
  FILL_CARD_DETAILS: "Error filling card details",
  CLICK_PAY_BUTTON: "Error clicking pay button",
  VERIFY_SUCCESS_PAGE: "Error verifying success page",
  GET_SUMMARY_AMOUNT: "Error getting summary amount",
  TAKE_FORM_SCREENSHOT: "Error taking form screenshot",
  TAKE_SUCCESS_SCREENSHOT: "Error taking success screenshot",
  GENERATE_SUBSCRIPTION: "Error generating subscription",
};

module.exports = { ACTION_ERROR_MESSAGES };
