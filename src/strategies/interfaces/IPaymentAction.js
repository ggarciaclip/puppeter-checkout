/**
 * Payment Action Interface
 * Defines the contract for individual payment actions
 */
class IPaymentAction {
  /**
   * Constructor for payment action
   * @param {string} actionType - The type of action
   * @param {Object} config - Action configuration
   */
  constructor(actionType, config = {}) {
    this.actionType = actionType;
    this.config = config;
  }

  /**
   * Get the action type
   * @returns {string} The action type
   */
  getActionType() {
    return this.actionType;
  }

  /**
   * Get the action configuration
   * @returns {Object} The action configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Check if this action can be executed in the given context
   * @param {Object} context - Execution context
   * @returns {boolean} Whether action can be executed
   */
  canExecute(context) {
    throw new Error("canExecute() must be implemented by concrete action");
  }

  /**
   * Execute the action
   * @param {Object} context - Execution context containing page, data, etc.
   * @returns {Promise<Object>} Action execution result
   */
  async execute(context) {
    throw new Error("execute() must be implemented by concrete action");
  }

  /**
   * Get the error message for this action
   * @returns {string} Error message
   */
  getErrorMessage() {
    return this.config.errorMessage || `Error executing ${this.actionType}`;
  }

  /**
   * Validate action parameters
   * @param {Object} context - Execution context
   * @returns {boolean} Whether parameters are valid
   */
  validateParameters(context) {
    return true; // Override in concrete classes
  }
}

module.exports = { IPaymentAction };
