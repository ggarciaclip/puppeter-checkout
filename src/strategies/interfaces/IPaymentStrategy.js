/**
 * Base Strategy Interface
 * Defines the minimum contract that all payment strategies must implement
 */
class IPaymentStrategy {
  /**
   * Get the strategy name
   * @returns {string} The strategy name
   */
  getStrategyName() {
    throw new Error(
      "getStrategyName() must be implemented by concrete strategy"
    );
  }

  /**
   * Get the strategy description
   * @returns {string} The strategy description
   */
  getDescription() {
    throw new Error(
      "getDescription() must be implemented by concrete strategy"
    );
  }

  /**
   * Get the list of actions for this strategy
   * @returns {Array} Array of action configurations
   */
  getActions() {
    throw new Error("getActions() must be implemented by concrete strategy");
  }

  /**
   * Get actions that should be skipped for this strategy
   * @returns {Array} Array of action names to skip
   */
  getSkipActions() {
    return [];
  }

  /**
   * Get special conditions for this strategy
   * @returns {Object} Object containing special conditions
   */
  getSpecialConditions() {
    return {};
  }

  /**
   * Check if an action should be executed based on conditions
   * @param {string} actionName - The action to check
   * @param {Object} context - The execution context
   * @returns {boolean} Whether the action should be executed
   */
  shouldExecuteAction(actionName, context) {
    throw new Error(
      "shouldExecuteAction() must be implemented by concrete strategy"
    );
  }

  /**
   * Execute the complete strategy flow
   * @param {Object} context - Execution context containing page, data, etc.
   * @returns {Promise<Object>} Execution result
   */
  async execute(context) {
    throw new Error("execute() must be implemented by concrete strategy");
  }
}

module.exports = { IPaymentStrategy };
