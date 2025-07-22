const { strategyFactory } = require("../factories/StrategyFactory");
const { logHeader, logPaymentStatus } = require("../../lib/logger");
const {
  getTypeConditionsMap,
  getFlowConditionsMap,
} = require("../../helpers/conditionsHelper");

/**
 * Payment Strategy Manager
 * Main coordinator for payment strategy execution
 */
class PaymentStrategyManager {
  constructor() {
    this.strategyFactory = strategyFactory;
    this.currentStrategy = null;
    this.executionContext = null;
  }

  /**
   * Execute payment flow using the strategy pattern
   * @param {Object} data - Payment data containing all necessary information
   * @param {Object} page - Puppeteer page instance
   * @param {string} testRunId - Test run identifier
   * @param {Array} resultsRun - Results array to populate
   * @returns {Promise<Object>} Execution result
   */
  async executePaymentFlow(data, page, testRunId, resultsRun) {
    const {
      test_case_id,
      payment_request_type,
      payment_flow_type,
      card,
      email,
      phone,
      payment_request_id,
      payment_type = "CARD", // Extract payment_type with default
      request_log_list,
      i,
    } = data;

    let executionResult = {
      success: false,
      strategy: null,
      testCaseId: test_case_id,
      executedActions: [],
      errors: [],
      displayedAmount: null,
      status: "FAILED",
    };

    try {
      // Create strategy based on payment type and flow
      this.currentStrategy = this.strategyFactory.createStrategy(
        payment_request_type,
        payment_flow_type
      );

      logHeader(
        {},
        `🎯 Selected Strategy: ${this.currentStrategy.getStrategyName()}`
      );
      logHeader(
        {},
        `📝 Strategy Description: ${this.currentStrategy.getDescription()}`
      );

      // Set context for the strategy
      this.currentStrategy.setContext(payment_request_type, payment_flow_type);

      // Build execution context
      this.executionContext = this.buildExecutionContext(
        data,
        page,
        testRunId,
        resultsRun
      );

      // Execute the strategy
      const strategyResult = await this.currentStrategy.execute(
        this.executionContext
      );

      // Update execution result
      executionResult = {
        ...executionResult,
        success: strategyResult.success,
        strategy: strategyResult.strategy,
        executedActions: strategyResult.executedActions,
        errors: strategyResult.errors,
        displayedAmount: this.executionContext.displayed_amount,
        status: strategyResult.success ? "OK" : "FAILED",
      };

      logHeader(
        {},
        `✅ Strategy Execution Completed: ${
          strategyResult.success ? "SUCCESS" : "FAILED"
        }`
      );
    } catch (error) {
      const errorMessage = `Strategy execution failed: ${error.message}`;
      logHeader({}, `❌ ${errorMessage}`);

      executionResult.errors.push({
        type: "strategy_execution",
        error: errorMessage,
        details: error.stack,
      });

      executionResult.status = `Failed reason: { ${error.message} }`;
    }

    // Log payment status
    const isPaymentSuccessful = executionResult.status === "OK";
    const errorMessage = isPaymentSuccessful ? null : executionResult.status;
    logPaymentStatus(test_case_id, isPaymentSuccessful, errorMessage);

    return executionResult;
  }

  /**
   * Build execution context for the strategy
   * @param {Object} data - Payment data
   * @param {Object} page - Puppeteer page instance
   * @param {string} testRunId - Test run identifier
   * @param {Array} resultsRun - Results array
   * @returns {Object} Execution context
   */
  buildExecutionContext(data, page, testRunId, resultsRun) {
    const {
      test_case_id,
      payment_request_type,
      payment_flow_type,
      card,
      email,
      phone,
      payment_request_id,
      payment_type = "CARD", // Extract payment_type with default
      request_log_list,
      i,
    } = data;

    const env = (process.env.ENV || "DEV").toUpperCase();
    const SAVE_TEST_DIR = "completed_tests/test_runs";

    const TEST_CASE_ID_FULL_PATH = `${SAVE_TEST_DIR}/${env}-${payment_request_type.toLowerCase()}/${testRunId}/${test_case_id.toString()}`;

    return {
      // Core data
      page,
      data,
      testRunId,
      resultsRun,

      // Payment information
      test_case_id,
      payment_request_type,
      payment_flow_type,
      payment_request_id,
      paymentType: payment_type, // Add payment type to context

      // Form data
      card,
      email,
      phone,

      // Execution context
      i: i || 0,
      env,
      TEST_CASE_ID_FULL_PATH,

      // Logging
      request_log_list,

      // Amount (will be populated during execution)
      displayed_amount: null,

      // Condition maps
      _t: getTypeConditionsMap(payment_request_type),
      _f: getFlowConditionsMap(payment_flow_type),
    };
  }

  /**
   * Get available strategies
   * @returns {Array<Object>} Available strategies
   */
  getAvailableStrategies() {
    return this.strategyFactory.getAvailableStrategies();
  }

  /**
   * Check if a strategy is supported
   * @param {string} paymentType - Payment type
   * @param {string} flowType - Flow type
   * @returns {boolean} Whether strategy is supported
   */
  isStrategySupported(paymentType, flowType) {
    return this.strategyFactory.isStrategySupported(paymentType, flowType);
  }

  /**
   * Get current strategy
   * @returns {BasePaymentStrategy|null} Current strategy
   */
  getCurrentStrategy() {
    return this.currentStrategy;
  }

  /**
   * Get execution context
   * @returns {Object|null} Current execution context
   */
  getExecutionContext() {
    return this.executionContext;
  }

  /**
   * Reset manager state
   */
  reset() {
    this.currentStrategy = null;
    this.executionContext = null;
  }

  /**
   * Get strategy statistics
   * @returns {Object} Strategy usage statistics
   */
  getStrategiesInfo() {
    const strategies = this.getAvailableStrategies();
    const actionDefinitions = this.strategyFactory.getActionDefinitions();
    const conditionMappings = this.strategyFactory.getConditionMappings();

    return {
      totalStrategies: strategies.length,
      strategies,
      totalActions: Object.keys(actionDefinitions).length,
      actionDefinitions,
      conditionMappings,
      supportedPaymentTypes: [...new Set(strategies.map((s) => s.paymentType))],
      supportedFlowTypes: [...new Set(strategies.map((s) => s.flowType))],
    };
  }
}

// Singleton instance
const paymentStrategyManager = new PaymentStrategyManager();

module.exports = {
  PaymentStrategyManager,
  paymentStrategyManager,
};
