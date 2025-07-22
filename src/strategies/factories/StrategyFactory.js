const fs = require("fs");
const path = require("path");
const {
  HostedCheckoutGuestStrategy,
  HostedCheckoutRegisterStrategy,
  LinkDePagoGuestStrategy,
  LinkDePagoRegisterStrategy,
  SubscriptionGuestStrategy,
  SubscriptionRegisterStrategy,
} = require("../concrete/PaymentStrategies");

/**
 * Strategy Factory
 * Creates strategy instances based on payment type and flow
 */
class StrategyFactory {
  constructor() {
    this.strategiesConfig = null;
    this.strategyMap = new Map();
    this.loadStrategiesConfig();
    this.initializeStrategyMap();
  }

  /**
   * Load strategies configuration from JSON file
   */
  loadStrategiesConfig() {
    try {
      const configPath = path.join(
        __dirname,
        "../../../payment-flow-strategies.json"
      );
      const configData = fs.readFileSync(configPath, "utf8");
      this.strategiesConfig = JSON.parse(configData);
    } catch (error) {
      console.error("Failed to load strategies configuration:", error);
      throw new Error(
        "Cannot initialize StrategyFactory without configuration"
      );
    }
  }

  /**
   * Initialize the strategy type to class mapping
   */
  initializeStrategyMap() {
    this.strategyMap.set("HOSTED_CHECKOUT:GUEST", HostedCheckoutGuestStrategy);
    this.strategyMap.set(
      "HOSTED_CHECKOUT:REGISTER",
      HostedCheckoutRegisterStrategy
    );
    this.strategyMap.set("LINK_DE_PAGO:GUEST", LinkDePagoGuestStrategy);
    this.strategyMap.set("LINK_DE_PAGO:REGISTER", LinkDePagoRegisterStrategy);
    this.strategyMap.set("SUBSCRIPTION:GUEST", SubscriptionGuestStrategy);
    this.strategyMap.set("SUBSCRIPTION:REGISTER", SubscriptionRegisterStrategy);
  }

  /**
   * Create a strategy instance
   * @param {string} paymentType - The payment type (HOSTED_CHECKOUT, LINK_DE_PAGO, SUBSCRIPTION)
   * @param {string} flowType - The flow type (GUEST, REGISTER)
   * @returns {BasePaymentStrategy} Strategy instance
   */
  createStrategy(paymentType, flowType) {
    const strategyKey = `${paymentType}:${flowType}`;
    const StrategyClass = this.strategyMap.get(strategyKey);

    if (!StrategyClass) {
      throw new Error(`Unknown strategy: ${strategyKey}`);
    }

    // Get strategy configuration from JSON
    const strategyConfig = this.getStrategyConfig(paymentType, flowType);

    if (!strategyConfig) {
      throw new Error(`No configuration found for strategy: ${strategyKey}`);
    }

    return new StrategyClass(strategyConfig);
  }

  /**
   * Get strategy configuration from loaded JSON
   * @param {string} paymentType - The payment type
   * @param {string} flowType - The flow type
   * @returns {Object} Strategy configuration
   */
  getStrategyConfig(paymentType, flowType) {
    if (
      !this.strategiesConfig ||
      !this.strategiesConfig.payment_flow_strategies
    ) {
      return null;
    }

    const paymentStrategies =
      this.strategiesConfig.payment_flow_strategies[paymentType];
    if (!paymentStrategies) {
      return null;
    }

    return paymentStrategies[flowType];
  }

  /**
   * Get all available strategy combinations
   * @returns {Array<Object>} Array of available strategies
   */
  getAvailableStrategies() {
    const strategies = [];

    for (const [key, StrategyClass] of this.strategyMap) {
      const [paymentType, flowType] = key.split(":");
      const config = this.getStrategyConfig(paymentType, flowType);

      strategies.push({
        paymentType,
        flowType,
        strategyKey: key,
        strategyName: config?.strategy_name,
        description: config?.description,
        className: StrategyClass.name,
      });
    }

    return strategies;
  }

  /**
   * Check if a strategy combination is supported
   * @param {string} paymentType - The payment type
   * @param {string} flowType - The flow type
   * @returns {boolean} Whether the strategy is supported
   */
  isStrategySupported(paymentType, flowType) {
    const strategyKey = `${paymentType}:${flowType}`;
    return this.strategyMap.has(strategyKey);
  }

  /**
   * Register a new strategy
   * @param {string} paymentType - The payment type
   * @param {string} flowType - The flow type
   * @param {Class} StrategyClass - The strategy class
   */
  registerStrategy(paymentType, flowType, StrategyClass) {
    const strategyKey = `${paymentType}:${flowType}`;
    this.strategyMap.set(strategyKey, StrategyClass);
  }

  /**
   * Get the action definitions from configuration
   * @returns {Object} Action definitions
   */
  getActionDefinitions() {
    return this.strategiesConfig?.action_definitions || {};
  }

  /**
   * Get the condition mappings from configuration
   * @returns {Object} Condition mappings
   */
  getConditionMappings() {
    return this.strategiesConfig?.condition_mappings || {};
  }
}

// Singleton instance
const strategyFactory = new StrategyFactory();

module.exports = {
  StrategyFactory,
  strategyFactory,
};
