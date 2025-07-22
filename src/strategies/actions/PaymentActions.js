const { IPaymentAction } = require("../interfaces/IPaymentAction");
const { ACTION_TYPES } = require("../enums/actionTypes");
const {
  fillEmail,
  fillPhone,
  fillCard,
  clickSpeiPayment,
  clickCashPayment,
  handleSpeiPaymentFlow,
  payCheckout,
  waitForPaymentTransition,
  clickSaveMyInfo,
  getSummaryAmount,
} = require("../../actions/module/actions-module");
const {
  getSuccessPaymentPage,
} = require("../../actions/getSuccessPaymentPage");
const { generateSubscription } = require("../../runner/subscriptionTask");
const { takeScreenshotAndSave } = require("../../image/takeScreenshot");
const {
  CHECKOUT_PAGE_URL,
  SUBSCRIPTION_PAGE_URL,
} = require("../../constants/environment");
const { PAYMENT_REQUEST_TYPES } = require("../../enums/paymentFlowTypes");

/**
 * Navigate to Checkout Action
 */
class NavigateToCheckoutAction extends IPaymentAction {
  constructor(config = {}) {
    super(ACTION_TYPES.NAVIGATE_TO_CHECKOUT, config);
  }

  canExecute(context) {
    return context.page && context.payment_request_id;
  }

  async execute(context) {
    const { page, payment_request_id } = context;
    const env = process.env.ENV || "DEV";
    const url = `${CHECKOUT_PAGE_URL[env.toUpperCase()]}/${payment_request_id}`;

    await page.goto(url);

    return {
      action: this.actionType,
      success: true,
      url,
    };
  }
}

/**
 * Fill Email Action
 */
class FillEmailAction extends IPaymentAction {
  constructor(config = {}) {
    super(ACTION_TYPES.FILL_EMAIL, config);
  }

  canExecute(context) {
    return context.page && context.email;
  }

  async execute(context) {
    const { page, email } = context;

    await fillEmail(page, email);

    return {
      action: this.actionType,
      success: true,
      email,
    };
  }
}

/**
 * Fill Phone Action
 */
class FillPhoneAction extends IPaymentAction {
  constructor(config = {}) {
    super(ACTION_TYPES.FILL_PHONE, config);
  }

  canExecute(context) {
    return context.page && context.phone;
  }

  async execute(context) {
    const { page, phone } = context;

    await fillPhone(page, phone);

    return {
      action: this.actionType,
      success: true,
      phone,
    };
  }
}

/**
 * Fill Card Action - Enhanced to handle different payment types
 */
class FillCardAction extends IPaymentAction {
  constructor(config = {}) {
    super(ACTION_TYPES.FILL_CARD_DETAILS, config);
  }

  canExecute(context) {
    return context.page && (context.card || context.paymentType);
  }

  async execute(context) {
    const { page, card, paymentType = "CARD" } = context;

    // Handle different payment types
    switch (paymentType) {
      case "SPEI":
        await clickSpeiPayment(page);
        return {
          action: this.actionType,
          success: true,
          paymentType: "SPEI",
          message: "SPEI payment method selected",
        };

      case "CASH":
        await clickCashPayment(page);
        return {
          action: this.actionType,
          success: true,
          paymentType: "CASH",
          message: "CASH payment method selected",
        };

      case "CARD":
      case "ONE_CLICK":
      default:
        await fillCard(page, card);
        return {
          action: this.actionType,
          success: true,
          paymentType: paymentType,
          card,
          message: "Card details filled",
        };
    }
  }
}

/**
 * Click Save My Info Action
 */
class ClickSaveMyInfoAction extends IPaymentAction {
  constructor(config = {}) {
    super(ACTION_TYPES.CLICK_SAVE_MY_INFO, config);
  }

  canExecute(context) {
    return context.page;
  }

  async execute(context) {
    const { page } = context;

    try {
      await clickSaveMyInfo(page);
      console.log("✅ Save my info clicked successfully");

      return {
        action: this.actionType,
        success: true,
        message: "Save my info clicked successfully",
      };
    } catch (error) {
      // Generate alert but don't fail the action
      console.log(
        "⚠️ Alert: Save my info click failed but continuing execution"
      );
      console.log(`⚠️ Save my info error (non-blocking): ${error.message}`);

      return {
        action: this.actionType,
        success: true, // Mark as success to continue execution
        warning: true,
        message: `Save my info click failed but execution continues: ${error.message}`,
      };
    }
  }
}

/**
 * Click Pay Button Action
 */
class ClickPayButtonAction extends IPaymentAction {
  constructor(config = {}) {
    super(ACTION_TYPES.CLICK_PAY_BUTTON, config);
  }

  canExecute(context) {
    return context.page;
  }

  async execute(context) {
    const { page, i = 0 } = context;

    await payCheckout(page, i);

    return {
      action: this.actionType,
      success: true,
    };
  }
}

/**
 * Wait Payment Transition Action
 */
class WaitPaymentTransitionAction extends IPaymentAction {
  constructor(config = {}) {
    super(ACTION_TYPES.WAIT_PAYMENT_TRANSITION, config);
  }

  canExecute(context) {
    return context.page;
  }

  async execute(context) {
    const { page, payment_request_type } = context;
    const isSubscription =
      payment_request_type === PAYMENT_REQUEST_TYPES.SUBSCRIPTION;
    const is3DS = false; // Default value, can be parameterized

    await waitForPaymentTransition(page, isSubscription, is3DS);

    return {
      action: this.actionType,
      success: true,
      isSubscription,
      is3DS,
    };
  }
}

/**
 * Verify Success Page Action
 */
class VerifySuccessPageAction extends IPaymentAction {
  constructor(config = {}) {
    super(ACTION_TYPES.VERIFY_SUCCESS_PAGE, config);
  }

  canExecute(context) {
    return context.page;
  }

  async execute(context) {
    const { page, payment_request_type } = context;
    const isSubscription =
      payment_request_type === PAYMENT_REQUEST_TYPES.SUBSCRIPTION;

    await getSuccessPaymentPage(page, isSubscription);

    return {
      action: this.actionType,
      success: true,
      isSubscription,
    };
  }
}

/**
 * Get Summary Amount Action
 */
class GetSummaryAmountAction extends IPaymentAction {
  constructor(config = {}) {
    super(ACTION_TYPES.GET_SUMMARY_AMOUNT, config);
  }

  canExecute(context) {
    return context.page;
  }

  async execute(context) {
    const { page, payment_request_type } = context;
    const isSubscription =
      payment_request_type === PAYMENT_REQUEST_TYPES.SUBSCRIPTION;

    const amount = await getSummaryAmount(page, isSubscription);

    return {
      action: this.actionType,
      success: true,
      amount,
      isSubscription,
    };
  }
}

/**
 * Take Form Screenshot Action
 */
class TakeFormScreenshotAction extends IPaymentAction {
  constructor(config = {}) {
    super(ACTION_TYPES.TAKE_FORM_SCREENSHOT, config);
  }

  canExecute(context) {
    return context.page && context.TEST_CASE_ID_FULL_PATH;
  }

  async execute(context) {
    const { page, TEST_CASE_ID_FULL_PATH } = context;
    const path = `${TEST_CASE_ID_FULL_PATH}/form-page-fill.png`;

    await takeScreenshotAndSave(path, page);

    return {
      action: this.actionType,
      success: true,
      path,
    };
  }
}

/**
 * Take Success Screenshot Action
 */
class TakeSuccessScreenshotAction extends IPaymentAction {
  constructor(config = {}) {
    super(ACTION_TYPES.TAKE_SUCCESS_SCREENSHOT, config);
  }

  canExecute(context) {
    return context.page && context.TEST_CASE_ID_FULL_PATH;
  }

  async execute(context) {
    const { page, TEST_CASE_ID_FULL_PATH } = context;
    const path = `${TEST_CASE_ID_FULL_PATH}/success-pay-page.png`;

    await takeScreenshotAndSave(path, page);

    return {
      action: this.actionType,
      success: true,
      path,
    };
  }
}

/**
 * Generate Subscription Action
 */
class GenerateSubscriptionAction extends IPaymentAction {
  constructor(config = {}) {
    super(ACTION_TYPES.GENERATE_SUBSCRIPTION, config);
  }

  canExecute(context) {
    return context.page && context.data && context.TEST_CASE_ID_FULL_PATH;
  }

  async execute(context) {
    const { page, data, TEST_CASE_ID_FULL_PATH } = context;
    const env = process.env.ENV || "DEV";
    const url = SUBSCRIPTION_PAGE_URL[env.toUpperCase()];

    await generateSubscription(page, url, data, TEST_CASE_ID_FULL_PATH);

    return {
      action: this.actionType,
      success: true,
      url,
    };
  }
}

/**
 * Handle SPEI Payment Flow Action
 * Manages the SPEI-specific flow after payment button click
 */
class HandleSpeiPaymentFlowAction extends IPaymentAction {
  constructor(config = {}) {
    super(ACTION_TYPES.HANDLE_SPEI_PAYMENT_FLOW, config);
  }

  canExecute(context) {
    return context.page && context.paymentType === "SPEI";
  }

  async execute(context) {
    const { page } = context;

    const result = await handleSpeiPaymentFlow(page);

    return {
      action: this.actionType,
      success: result.success,
      concepto: result.concepto,
      amount: result.amount,
      apiResponse: result.apiResponse,
      message: result.message,
      error: result.error,
    };
  }
}

module.exports = {
  NavigateToCheckoutAction,
  FillEmailAction,
  FillPhoneAction,
  FillCardAction,
  ClickSaveMyInfoAction,
  ClickPayButtonAction,
  WaitPaymentTransitionAction,
  VerifySuccessPageAction,
  GetSummaryAmountAction,
  TakeFormScreenshotAction,
  TakeSuccessScreenshotAction,
  GenerateSubscriptionAction,
  HandleSpeiPaymentFlowAction,
};
