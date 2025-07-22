const { ACTION_TYPES } = require("../enums/actionTypes");
const {
  NavigateToCheckoutAction,
  FillEmailAction,
  FillPhoneAction,
  FillCardAction,
  ClickSaveMyInfoAction,
  ClickPayButtonAction,
  HandleSpeiPaymentFlowAction,
  WaitPaymentTransitionAction,
  VerifySuccessPageAction,
  GetSummaryAmountAction,
  TakeFormScreenshotAction,
  TakeSuccessScreenshotAction,
  GenerateSubscriptionAction,
} = require("../actions/PaymentActions");

/**
 * Action Factory
 * Creates action instances based on action type and configuration
 */
class ActionFactory {
  constructor() {
    this.actionMap = new Map();
    this.initializeActionMap();
  }

  /**
   * Initialize the action type to class mapping
   */
  initializeActionMap() {
    this.actionMap.set(
      ACTION_TYPES.NAVIGATE_TO_CHECKOUT,
      NavigateToCheckoutAction
    );
    this.actionMap.set(ACTION_TYPES.FILL_EMAIL, FillEmailAction);
    this.actionMap.set(ACTION_TYPES.FILL_PHONE, FillPhoneAction);
    this.actionMap.set(ACTION_TYPES.FILL_CARD_DETAILS, FillCardAction);
    this.actionMap.set(ACTION_TYPES.CLICK_SAVE_MY_INFO, ClickSaveMyInfoAction);
    this.actionMap.set(ACTION_TYPES.CLICK_PAY_BUTTON, ClickPayButtonAction);
    this.actionMap.set(
      ACTION_TYPES.HANDLE_SPEI_PAYMENT_FLOW,
      HandleSpeiPaymentFlowAction
    );
    this.actionMap.set(
      ACTION_TYPES.WAIT_PAYMENT_TRANSITION,
      WaitPaymentTransitionAction
    );
    this.actionMap.set(
      ACTION_TYPES.VERIFY_SUCCESS_PAGE,
      VerifySuccessPageAction
    );
    this.actionMap.set(ACTION_TYPES.GET_SUMMARY_AMOUNT, GetSummaryAmountAction);
    this.actionMap.set(
      ACTION_TYPES.TAKE_FORM_SCREENSHOT,
      TakeFormScreenshotAction
    );
    this.actionMap.set(
      ACTION_TYPES.TAKE_SUCCESS_SCREENSHOT,
      TakeSuccessScreenshotAction
    );
    this.actionMap.set(
      ACTION_TYPES.GENERATE_SUBSCRIPTION,
      GenerateSubscriptionAction
    );
  }

  /**
   * Create an action instance
   * @param {string} actionType - The type of action to create
   * @param {Object} config - Action configuration
   * @returns {IPaymentAction} Action instance
   */
  createAction(actionType, config = {}) {
    const ActionClass = this.actionMap.get(actionType);

    if (!ActionClass) {
      throw new Error(`Unknown action type: ${actionType}`);
    }

    return new ActionClass(config);
  }

  /**
   * Get all supported action types
   * @returns {Array<string>} Array of supported action types
   */
  getSupportedActionTypes() {
    return Array.from(this.actionMap.keys());
  }

  /**
   * Check if an action type is supported
   * @param {string} actionType - The action type to check
   * @returns {boolean} Whether the action type is supported
   */
  isActionTypeSupported(actionType) {
    return this.actionMap.has(actionType);
  }

  /**
   * Register a new action type
   * @param {string} actionType - The action type
   * @param {Class} ActionClass - The action class
   */
  registerAction(actionType, ActionClass) {
    this.actionMap.set(actionType, ActionClass);
  }
}

// Singleton instance
const actionFactory = new ActionFactory();

module.exports = {
  ActionFactory,
  actionFactory,
};
