/**
 * Action Types Enumeration
 * Defines all available actions in the payment flow system
 */
const ACTION_TYPES = {
  // Navigation actions
  NAVIGATE_TO_CHECKOUT: "navigate_to_checkout",

  // Form filling actions
  FILL_EMAIL: "fill_email",
  FILL_PHONE: "fill_phone",
  FILL_CARD_DETAILS: "fill_card_details",

  // Payment method selection actions
  SELECT_SPEI_PAYMENT: "select_spei_payment",
  SELECT_CASH_PAYMENT: "select_cash_payment",

  // User interaction actions
  CLICK_SAVE_MY_INFO: "click_save_my_info",
  CLICK_PAY_BUTTON: "click_pay_button",

  // Payment flow handling actions
  HANDLE_SPEI_PAYMENT_FLOW: "handle_spei_payment_flow",

  // Verification actions
  WAIT_PAYMENT_TRANSITION: "wait_payment_transition",
  VERIFY_SUCCESS_PAGE: "verify_success_page",
  GET_SUMMARY_AMOUNT: "get_summary_amount",

  // Screenshot actions
  TAKE_FORM_SCREENSHOT: "take_form_screenshot",
  TAKE_SUCCESS_SCREENSHOT: "take_success_screenshot",

  // Special actions
  GENERATE_SUBSCRIPTION: "generate_subscription",
};

const ACTION_CATEGORIES = {
  NAVIGATION: "navigation",
  FORM_FILLING: "form_filling",
  PAYMENT_METHOD: "payment_method",
  USER_INTERACTION: "user_interaction",
  VERIFICATION: "verification",
  SCREENSHOT: "screenshot",
  SPECIAL: "special",
};

module.exports = {
  ACTION_TYPES,
  ACTION_CATEGORIES,
};
