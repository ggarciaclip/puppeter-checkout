const { fillEmail } = require("../fillEmail.js");
const { fillPhone } = require("../fillPhone.js");
const { fillCard } = require("../fillCard.js");
const { clickSpeiPayment } = require("../clickSpeiPayment.js");
const { clickCashPayment } = require("../clickCashPayment.js");
const { handleSpeiPaymentFlow } = require("../handleSpeiPaymentFlow.js");
const { handleCashPaymentFlow } = require("../handleCashPaymentFlow.js");
const { payCheckout } = require("../payCheckout.js");
const { waitForPaymentTransition } = require("../waitForPaymentTransition.js");
const {
  clickSaveMyInfo,
  isSaveMyInfoChecked,
} = require("../clickSaveMyInfo.js");
const { getSummaryAmount } = require("../getSummaryAmount.js");
const { validateInstallments } = require("../validateInstallments.js");

module.exports = {
  clickSaveMyInfo,
  isSaveMyInfoChecked,
  fillEmail,
  fillPhone,
  fillCard,
  clickSpeiPayment,
  clickCashPayment,
  handleSpeiPaymentFlow,
  handleCashPaymentFlow,
  waitForPaymentTransition,
  payCheckout,
  getSummaryAmount,
  validateInstallments,
};
