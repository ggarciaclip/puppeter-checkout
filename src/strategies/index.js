// Strategy Pattern Architecture Index
// This file exports all strategy-related components

// Interfaces
const { IPaymentStrategy } = require("./interfaces/IPaymentStrategy");
const { IPaymentAction } = require("./interfaces/IPaymentAction");

// Base classes
const { BasePaymentStrategy } = require("./base/BasePaymentStrategy");

// Concrete strategies
const {
  HostedCheckoutGuestStrategy,
  HostedCheckoutRegisterStrategy,
  LinkDePagoGuestStrategy,
  LinkDePagoRegisterStrategy,
  SubscriptionGuestStrategy,
  SubscriptionRegisterStrategy,
} = require("./concrete/PaymentStrategies");

// Actions
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
} = require("./actions/PaymentActions");

// Factories
const { ActionFactory, actionFactory } = require("./factories/ActionFactory");
const {
  StrategyFactory,
  strategyFactory,
} = require("./factories/StrategyFactory");

// Manager
const {
  PaymentStrategyManager,
  paymentStrategyManager,
} = require("./manager/PaymentStrategyManager");

// Enums
const { ACTION_TYPES, ACTION_CATEGORIES } = require("./enums/actionTypes");

module.exports = {
  // Interfaces
  IPaymentStrategy,
  IPaymentAction,

  // Base classes
  BasePaymentStrategy,

  // Concrete strategies
  HostedCheckoutGuestStrategy,
  HostedCheckoutRegisterStrategy,
  LinkDePagoGuestStrategy,
  LinkDePagoRegisterStrategy,
  SubscriptionGuestStrategy,
  SubscriptionRegisterStrategy,

  // Actions
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

  // Factories
  ActionFactory,
  actionFactory,
  StrategyFactory,
  strategyFactory,

  // Manager (main entry point)
  PaymentStrategyManager,
  paymentStrategyManager,

  // Enums
  ACTION_TYPES,
  ACTION_CATEGORIES,
};
