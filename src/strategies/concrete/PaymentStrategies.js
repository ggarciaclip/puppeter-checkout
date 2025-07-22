const { BasePaymentStrategy } = require("../base/BasePaymentStrategy");
const { actionFactory } = require("../factories/ActionFactory");
const { run } = require("../../helpers/runFn");
const { ACTION_ERROR_MESSAGES } = require("../../constants/errorMessage");

/**
 * Hosted Checkout Guest Strategy
 */
class HostedCheckoutGuestStrategy extends BasePaymentStrategy {
  constructor(strategyConfig) {
    super(strategyConfig);
    this.paymentType = "HOSTED_CHECKOUT";
    this.flowType = "GUEST";
  }

  async executeAction(actionConfig, context) {
    const action = actionFactory.createAction(
      actionConfig.action,
      actionConfig
    );

    if (!action.canExecute(context)) {
      throw new Error(
        `Action ${actionConfig.action} cannot be executed with current context`
      );
    }

    // Use the existing run helper for consistent error handling
    const errorMessage =
      ACTION_ERROR_MESSAGES[actionConfig.action.toUpperCase()] ||
      action.getErrorMessage();

    return await run(async () => await action.execute(context), errorMessage);
  }
}

/**
 * Hosted Checkout Register Strategy
 */
class HostedCheckoutRegisterStrategy extends BasePaymentStrategy {
  constructor(strategyConfig) {
    super(strategyConfig);
    this.paymentType = "HOSTED_CHECKOUT";
    this.flowType = "REGISTER";
  }

  async executeAction(actionConfig, context) {
    const action = actionFactory.createAction(
      actionConfig.action,
      actionConfig
    );

    if (!action.canExecute(context)) {
      throw new Error(
        `Action ${actionConfig.action} cannot be executed with current context`
      );
    }

    const errorMessage =
      ACTION_ERROR_MESSAGES[actionConfig.action.toUpperCase()] ||
      action.getErrorMessage();

    return await run(async () => await action.execute(context), errorMessage);
  }
}

/**
 * Link De Pago Guest Strategy
 */
class LinkDePagoGuestStrategy extends BasePaymentStrategy {
  constructor(strategyConfig) {
    super(strategyConfig);
    this.paymentType = "LINK_DE_PAGO";
    this.flowType = "GUEST";
  }

  async executeAction(actionConfig, context) {
    const action = actionFactory.createAction(
      actionConfig.action,
      actionConfig
    );

    if (!action.canExecute(context)) {
      throw new Error(
        `Action ${actionConfig.action} cannot be executed with current context`
      );
    }

    const errorMessage =
      ACTION_ERROR_MESSAGES[actionConfig.action.toUpperCase()] ||
      action.getErrorMessage();

    return await run(async () => await action.execute(context), errorMessage);
  }
}

/**
 * Link De Pago Register Strategy
 */
class LinkDePagoRegisterStrategy extends BasePaymentStrategy {
  constructor(strategyConfig) {
    super(strategyConfig);
    this.paymentType = "LINK_DE_PAGO";
    this.flowType = "REGISTER";
  }

  async executeAction(actionConfig, context) {
    const action = actionFactory.createAction(
      actionConfig.action,
      actionConfig
    );

    if (!action.canExecute(context)) {
      throw new Error(
        `Action ${actionConfig.action} cannot be executed with current context`
      );
    }

    const errorMessage =
      ACTION_ERROR_MESSAGES[actionConfig.action.toUpperCase()] ||
      action.getErrorMessage();

    return await run(async () => await action.execute(context), errorMessage);
  }
}

/**
 * Subscription Guest Strategy
 */
class SubscriptionGuestStrategy extends BasePaymentStrategy {
  constructor(strategyConfig) {
    super(strategyConfig);
    this.paymentType = "SUBSCRIPTION";
    this.flowType = "GUEST";
  }

  async executeAction(actionConfig, context) {
    const action = actionFactory.createAction(
      actionConfig.action,
      actionConfig
    );

    if (!action.canExecute(context)) {
      throw new Error(
        `Action ${actionConfig.action} cannot be executed with current context`
      );
    }

    const errorMessage =
      ACTION_ERROR_MESSAGES[actionConfig.action.toUpperCase()] ||
      action.getErrorMessage();

    return await run(async () => await action.execute(context), errorMessage);
  }
}

/**
 * Subscription Register Strategy
 */
class SubscriptionRegisterStrategy extends BasePaymentStrategy {
  constructor(strategyConfig) {
    super(strategyConfig);
    this.paymentType = "SUBSCRIPTION";
    this.flowType = "REGISTER";
  }

  async executeAction(actionConfig, context) {
    const action = actionFactory.createAction(
      actionConfig.action,
      actionConfig
    );

    if (!action.canExecute(context)) {
      throw new Error(
        `Action ${actionConfig.action} cannot be executed with current context`
      );
    }

    const errorMessage =
      ACTION_ERROR_MESSAGES[actionConfig.action.toUpperCase()] ||
      action.getErrorMessage();

    return await run(async () => await action.execute(context), errorMessage);
  }
}

module.exports = {
  HostedCheckoutGuestStrategy,
  HostedCheckoutRegisterStrategy,
  LinkDePagoGuestStrategy,
  LinkDePagoRegisterStrategy,
  SubscriptionGuestStrategy,
  SubscriptionRegisterStrategy,
};
