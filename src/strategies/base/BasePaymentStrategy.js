const { IPaymentStrategy } = require("../interfaces/IPaymentStrategy");
const {
  getTypeConditionsMap,
  getFlowConditionsMap,
} = require("../../helpers/conditionsHelper");
const { logHeader } = require("../../lib/logger");
const { run } = require("../../helpers/runFn");

/**
 * Base Payment Strategy Class
 * Provides common functionality for all payment strategies
 */
class BasePaymentStrategy extends IPaymentStrategy {
  constructor(strategyConfig) {
    super();
    this.strategyName = strategyConfig.strategy_name;
    this.description = strategyConfig.description;
    this.actions = strategyConfig.actions || [];
    this.skipActions = strategyConfig.skip_actions || [];
    this.specialConditions = strategyConfig.special_conditions || {};
    this.paymentType = null;
    this.flowType = null;
  }

  /**
   * Get the strategy name
   */
  getStrategyName() {
    return this.strategyName;
  }

  /**
   * Get the strategy description
   */
  getDescription() {
    return this.description;
  }

  /**
   * Get the list of actions for this strategy
   */
  getActions() {
    return this.actions;
  }

  /**
   * Get actions that should be skipped for this strategy
   */
  getSkipActions() {
    return this.skipActions;
  }

  /**
   * Get special conditions for this strategy
   */
  getSpecialConditions() {
    return this.specialConditions;
  }

  /**
   * Set payment and flow types for condition evaluation
   */
  setContext(paymentType, flowType) {
    this.paymentType = paymentType;
    this.flowType = flowType;
  }

  /**
   * Check if an action should be executed based on conditions
   */
  shouldExecuteAction(actionName, context) {
    // Check if action is in skip list
    if (this.skipActions.includes(actionName)) {
      return false;
    }

    // Find the action configuration
    const actionConfig = this.actions.find(
      (action) => action.action === actionName
    );
    if (!actionConfig) {
      return false;
    }

    // If action is not required, it's optional
    if (!actionConfig.required) {
      return true;
    }

    // Evaluate condition
    return this.evaluateCondition(actionConfig.condition, context);
  }

  /**
   * Evaluate a condition string against the current context
   */
  evaluateCondition(condition, context) {
    if (condition === "always") {
      return true;
    }

    if (condition === "never") {
      return false;
    }

    // Get condition maps
    const _t = getTypeConditionsMap(context.payment_request_type);
    const _f = getFlowConditionsMap(context.payment_flow_type);

    try {
      // Create a safe evaluation context
      const evalContext = {
        _t,
        _f,
        // Add any other context variables needed
      };

      // Simple condition evaluation
      // For more complex conditions, you might want to use a proper expression evaluator
      return this.safeEvaluateCondition(condition, evalContext);
    } catch (error) {
      console.warn(`Failed to evaluate condition "${condition}":`, error);
      return false;
    }
  }

  /**
   * Safely evaluate a condition string
   */
  safeEvaluateCondition(condition, evalContext) {
    // Replace condition placeholders with actual values
    let evaluatedCondition = condition;

    // Handle _t.get() calls
    evaluatedCondition = evaluatedCondition.replace(
      /_t\.get\('([^']+)'\)/g,
      (match, key) => (evalContext._t.get(key) ? "true" : "false")
    );

    // Handle _f.get() calls
    evaluatedCondition = evaluatedCondition.replace(
      /_f\.get\('([^']+)'\)/g,
      (match, key) => (evalContext._f.get(key) ? "true" : "false")
    );

    // Handle && and || operators
    evaluatedCondition = evaluatedCondition.replace(/&&/g, " && ");
    evaluatedCondition = evaluatedCondition.replace(/\|\|/g, " || ");

    // For simple boolean expressions, use eval (in a controlled way)
    // In production, consider using a proper expression parser
    try {
      return Function(`"use strict"; return (${evaluatedCondition})`)();
    } catch (error) {
      console.warn(
        `Failed to evaluate condition: ${evaluatedCondition}`,
        error
      );
      return false;
    }
  }

  /**
   * Get ordered actions to execute
   */
  getOrderedActions() {
    return this.actions
      .filter((action) => !this.skipActions.includes(action.action))
      .sort((a, b) => a.step - b.step);
  }

  /**
   * Execute the complete strategy flow
   */
  async execute(context) {
    const result = {
      strategy: this.strategyName,
      success: false,
      executedActions: [],
      skippedActions: [],
      errors: [],
    };

    logHeader({}, `🎯 Executing Strategy: ${this.strategyName}`);
    logHeader({}, `📝 Description: ${this.description}`);

    const orderedActions = this.getOrderedActions();

    for (const actionConfig of orderedActions) {
      const actionName = actionConfig.action;

      try {
        if (this.shouldExecuteAction(actionName, context)) {
          logHeader(
            {},
            `⚡ Executing Action: ${actionName} (Step ${actionConfig.step})`
          );

          // Execute action through the action factory
          await this.executeAction(actionConfig, context);

          result.executedActions.push({
            action: actionName,
            step: actionConfig.step,
            success: true,
          });
        } else {
          logHeader(
            {},
            `⏭️  Skipping Action: ${actionName} (Step ${actionConfig.step})`
          );

          result.skippedActions.push({
            action: actionName,
            step: actionConfig.step,
            reason: "condition_not_met",
          });
        }
      } catch (error) {
        const errorMsg = `Failed to execute action ${actionName}: ${error.message}`;
        logHeader({}, `❌ Error: ${errorMsg}`);

        result.errors.push({
          action: actionName,
          step: actionConfig.step,
          error: errorMsg,
        });

        // If action is required, stop execution
        if (actionConfig.required) {
          throw new Error(errorMsg);
        }
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Execute a single action
   * This method should be implemented by concrete strategies or use an action factory
   */
  async executeAction(actionConfig, context) {
    throw new Error(
      "executeAction() must be implemented by concrete strategy or use ActionFactory"
    );
  }
}

module.exports = { BasePaymentStrategy };
