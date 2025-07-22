const mlog = require("mocha-logger");
const path = require("path");
const { ACTION_ERROR_MESSAGES } = require("../constants/errorMessage");
const { run } = require("../helpers/runFn");
const {
  fillEmail,
  fillPhone,
  fillCard,
  clickSpeiPayment,
  clickCashPayment,
  handleSpeiPaymentFlow,
  handleCashPaymentFlow,
  payCheckout,
  waitForPaymentTransition,
  clickSaveMyInfo,
  isSaveMyInfoChecked,
  getSummaryAmount,
  validateInstallments,
} = require("../actions/module/actions-module");
const { getSuccessPaymentPage } = require("../actions/getSuccessPaymentPage");
const { generateSubscription } = require("./subscriptionTask");
const { writeFile, createDirectory } = require("../lib/fs_utils");
const { getFormattedDateTime } = require("../lib/date_utils");
const {
  takeScreenshotAndSave,
  forceMandatoryScreenshot,
} = require("../image/takeScreenshot");
const { formatRequestLogs } = require("../lib/formatRequestLogs");
const {
  convertImagesToVideo,
  deleteScreenshotsDirectory,
} = require("../lib/videoUtils");
const { videoManager } = require("../lib/threadSafeVideoManager");
const { saveSuccessfulUser } = require("../lib/successfulUsersManager");
// const PuppeteerScreenRecorder = require("puppeteer-screen-recorder"); // Removed due to installation issues
const {
  PAYMENT_FLOWS,
  PAYMENT_REQUEST_TYPES,
} = require("../enums/paymentFlowTypes");
const {
  DEV,
  CHECKOUT_PAGE_URL,
  SECURE_API,
  SUBSCRIPTION_PAGE_URL,
} = require("../constants/environment");
const {
  logHeader,
  logPaymentStatus,
  logHeaderError,
  logDebugger,
  logThreadDebug,
} = require("../lib/logger");
const {
  initializeFileLogging,
  saveLogsToFile,
  addLogEntry,
  clearCurrentLogs,
} = require("../lib/fileLogger");
const { cleanOldTestRuns } = require("../lib/testHistoryManager");
const {
  getTypeConditionsMap,
  getFlowConditionsMap,
} = require("../helpers/conditionsHelper");
require("dotenv").config();

const env = (process.env.ENV || DEV).toUpperCase(); // environment;
const SAVE_TEST_DIR = `completed_tests/test_runs`;
const RECORD_PAYMENT = Boolean(process.env.RECORD);

/**
 * Enhanced screenshot capture with retry logic and multiple page fallback
 */
async function takeScreenshotWithRetry(page, path, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await page.screenshot({
        path: path,
        fullPage: false,
        timeout: 5000,
      });
      return true;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return false;
}

async function taskCheckoutPay(page, data, test_run_id, results_run) {
  const DEFAULT_PAGE_TIMEOUT = 15000;
  const TIMEOUT_WAIT_LOGS = 3000;
  const BASE_DIR = process.cwd();
  const {
    test_case_id,
    card,
    email,
    phone,
    payment_request_id,
    payment_flow_type,
    payment_request_type,
    payment_type = "CARD", // Add payment_type with default
    request_log_list,
    i,
  } = data;
  const _t = getTypeConditionsMap(payment_request_type);
  const _f = getFlowConditionsMap(payment_flow_type);

  let status = "OK";
  let displayed_amount;
  let TEST_CASE_ID_FULL_PATH;
  let recorder = null;

  // Thread-safe video recording variables
  let threadId = null;
  let threadVideoPath = null;
  let recordingInfo = null;
  const MIN_RECORDING_DURATION = 10000; // Minimum 10 seconds of recording

  let saveMyInfoWasChecked = false; // Track if save my info checkbox was checked

  try {
    logHeader(data, "📊 PARAMETERS", test_case_id);
    logHeader({}, "📁 GENERATING DIRECTORY...", test_case_id);

    createDirectory(
      `${SAVE_TEST_DIR}/${env}-${payment_request_type.toLocaleLowerCase()}/${test_run_id}`,
      test_case_id
    );

    /* 
    Structure => completed_tests/test_runs/Env+PaymentType/test_run_id/test_case_id 
    Example    => completed_tests/test_runs/DEV-link_de_pago/09_30_11.30.00/GUEST_MXN
     */
    TEST_CASE_ID_FULL_PATH = `${SAVE_TEST_DIR}/${env}-${payment_request_type.toLocaleLowerCase()}/${test_run_id}/${test_case_id.toString()}`;

    // Initialize file logging for this test case
    const fullTestCaseDir = `${BASE_DIR}/${TEST_CASE_ID_FULL_PATH}`;

    initializeFileLogging(test_case_id, fullTestCaseDir);
    logHeader(
      {},
      `📝 File logging initialized for: ${test_case_id}`,
      test_case_id
    );

    await page.setViewport({ width: 1280, height: 1080 });
    await page.setRequestInterception(true);
    page.setDefaultTimeout(DEFAULT_PAGE_TIMEOUT);

    const targetPage = page;

    targetPage.on("request", (request) => {
      if (request.resourceType() === "image") request.abort();
      request.continue();
    });

    targetPage.on("response", async (response) => {
      const request = response.request();
      const requestUrl = request?.url();

      // URLs to exclude from logging
      const excludedUrls = [
        "api.segment.io/v1/i",
        "dev-elements.payclip.com/api/risk",
        "api.segment.io",
        "analytics.payclip.com",
        "events.payclip.com",
        "/prevention_data/",
        "rum.browser-intake-datadoghq.com",
        "api.ipify.org",
      ];

      // Check if URL should be excluded
      const shouldExclude = excludedUrls.some(
        (excludedUrl) => requestUrl && requestUrl.includes(excludedUrl)
      );

      // Only log API requests (avoid logging static assets and excluded URLs)
      if (
        requestUrl &&
        !shouldExclude &&
        (requestUrl.includes("api") || requestUrl.includes("card_tokens"))
      ) {
        try {
          const headers = response.headers();
          const status = response.status();

          // Get request payload if available
          let requestPayload = null;
          try {
            if (request.postData()) {
              requestPayload = JSON.parse(request.postData());
            }
          } catch (e) {
            // Not JSON or no post data
            requestPayload = request.postData() || null;
          }

          // Get response body if available
          let responseBody = null;
          try {
            if (headers["content-type"]?.includes("application/json")) {
              responseBody = await response.json();
            } else {
              responseBody = await response.text();
            }
          } catch (e) {
            // Response already consumed or not readable
            responseBody = null;
          }

          // Skip card_tokens requests with null payload and response
          const isCardTokens = requestUrl.includes("card_tokens");
          const hasNullData = requestPayload === null && responseBody === null;

          if (isCardTokens && hasNullData) {
            logDebugger(
              `Skipping card_tokens with null data: ${requestUrl}`,
              null,
              test_case_id
            );
            return;
          }

          // Add to request log list
          request_log_list.push({
            url: requestUrl,
            method: request.method(),
            statusCode: status,
            headers: headers,
            payload: requestPayload,
            response: responseBody,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          logDebugger(
            `Error logging request to ${requestUrl}:`,
            { error: error.message },
            test_case_id,
            "error"
          );
        }
      }
    });

    const startWaitingForEvents = () => {
      promises.push(targetPage.waitForNavigation());
    };
    const promises = [];
    startWaitingForEvents();

    // Initialize thread-safe video recording if enabled
    if (RECORD_PAYMENT) {
      try {
        const baseVideoPath = `${TEST_CASE_ID_FULL_PATH}/screenshots`;
        const recording = videoManager.initializeRecording(
          test_case_id,
          baseVideoPath
        );

        threadId = recording.threadId;
        threadVideoPath = recording.videoPath;
        recordingInfo = recording.recordingInfo;

        logHeader(
          {},
          `📹 Iniciando grabación thread-safe: ${test_case_id} [Thread: ${threadId.slice(
            -8
          )}]`,
          test_case_id
        );

        // Take initial screenshot with thread-safe approach
        const initialResult = await videoManager.captureScreenshotSafe(
          threadId,
          page,
          targetPage
        );

        if (initialResult.success) {
          logHeader(
            {},
            `📸 Screenshot inicial thread-safe capturado: ${path.basename(
              initialResult.path
            )} [Thread: ${threadId.slice(-8)}]`,
            test_case_id
          );
        } else {
          logHeaderError(
            {},
            `⚠️ Error capturando screenshot inicial thread-safe`,
            new Error("Initial screenshot failed"),
            test_case_id
          );
        }

        // Setup thread-safe screenshot interval
        videoManager.setupScreenshotInterval(
          threadId,
          page,
          targetPage,
          test_case_id
        );

        logHeader(
          {},
          `⚡ Intervalo de screenshots thread-safe iniciado [Thread: ${threadId.slice(
            -8
          )}]`,
          test_case_id
        );
      } catch (recordingError) {
        logHeaderError(
          {},
          `❌ Error inicializando grabación thread-safe: ${recordingError.message}`,
          recordingError,
          test_case_id
        );
      }
    }

    if (_t.get("isSubscription")) {
      const url = SUBSCRIPTION_PAGE_URL[env];
      logHeader({}, `🔄 Generating subscription ${test_case_id}`, test_case_id);
      await run(
        async () =>
          await generateSubscription(
            targetPage,
            url,
            data,
            TEST_CASE_ID_FULL_PATH
          ),
        ACTION_ERROR_MESSAGES.GENERATING_SUBSCRIPTION
      );
    }

    if (_t.get("isNotSubscription")) {
      await targetPage.goto(`${CHECKOUT_PAGE_URL[env]}/${payment_request_id}`);
    }

    await Promise.all(promises);

    if (_t.get("isNotHostedCheckout") && _t.get("isNotSubscription")) {
      logHeader({}, `📧 Filling Email: ${test_case_id}`, test_case_id);
      await run(
        async () => await fillEmail(targetPage, email),
        ACTION_ERROR_MESSAGES.FILL_EMAIL
      );

      logHeader({}, `📱 Filling Phone: ${test_case_id}`, test_case_id);
      await run(
        async () => await fillPhone(targetPage, phone),
        ACTION_ERROR_MESSAGES.FILL_PHONE
      );
    }

    // Handle different payment types
    switch (payment_type) {
      case "SPEI":
        logHeader(
          {},
          `🏦 Selecting SPEI Payment: ${test_case_id}`,
          test_case_id
        );
        await run(
          async () => await clickSpeiPayment(targetPage),
          ACTION_ERROR_MESSAGES.CLICK_SPEI_PAYMENT ||
            "Error clicking SPEI payment button"
        );
        break;
      case "CASH":
        logHeader(
          {},
          `💵 Selecting Cash Payment: ${test_case_id}`,
          test_case_id
        );
        await run(
          async () => await clickCashPayment(targetPage),
          ACTION_ERROR_MESSAGES.CLICK_CASH_PAYMENT ||
            "Error clicking Cash payment button"
        );
        break;
      case "CARD":
      case "ONE_CLICK":
      default:
        logHeader({}, `💳 Filling Card: ${test_case_id}`, test_case_id);
        await run(
          async () => await fillCard(targetPage, card),
          ACTION_ERROR_MESSAGES.FILL_CARD
        );

        // Wait for card to be processed and page to stabilize
        logHeader(
          {},
          `⏳ Esperando que la página se estabilice después del llenado de tarjeta: ${test_case_id}`,
          test_case_id
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Validate installments after filling card (only for CARD payments)
        logHeader(
          {},
          `🔍 Validando installments después de llenar tarjeta: ${test_case_id}`,
          test_case_id
        );
        try {
          const installmentsResult = await validateInstallments(
            targetPage,
            test_case_id,
            request_log_list
          );

          if (installmentsResult.success) {
            logHeader(
              {},
              `✅ Validación de installments exitosa: ${installmentsResult.validInstallments}/${installmentsResult.totalInstallments} válidos`,
              test_case_id
            );

            if (installmentsResult.selectedInstallment) {
              // Enhanced logging for successful installment selection
              logHeader(
                {},
                `🎯 INSTALLMENT SELECCIONADO EXITOSAMENTE:`,
                test_case_id
              );
              logHeader(
                {},
                `   📊 Cantidad de cuotas: ${installmentsResult.selectedInstallment.quantity}`,
                test_case_id
              );
              logHeader(
                {},
                `   💰 Monto por cuota: $${
                  installmentsResult.selectedInstallment.ui?.monthlyAmount ||
                  installmentsResult.selectedInstallment.api?.amount ||
                  "N/A"
                }`,
                test_case_id
              );
              logHeader(
                {},
                `   💳 Total a pagar: $${
                  installmentsResult.selectedInstallment.ui?.totalAmount ||
                  installmentsResult.selectedInstallment.api?.total_amount ||
                  "N/A"
                }`,
                test_case_id
              );
              logHeader(
                {},
                `   📝 Descripción completa: ${
                  installmentsResult.selectedInstallment.ui?.fullText || "N/A"
                }`,
                test_case_id
              );
              logHeader(
                {},
                `   ✅ Verificado por: ${
                  installmentsResult.selectedInstallment.verificationMethod ||
                  "N/A"
                }`,
                test_case_id
              );
              logHeader(
                {},
                `   🔒 Estado validado: ${
                  installmentsResult.selectedInstallment.verified ? "SÍ" : "NO"
                }`,
                test_case_id
              );

              // Additional stabilization time after installment selection
              logHeader(
                {},
                `⏳ Tiempo adicional de estabilización después de selección de installments...`,
                test_case_id
              );
              await new Promise((resolve) => setTimeout(resolve, 3000));

              // Final verification of installment selection before continuing
              const finalVerification = await targetPage.evaluate(() => {
                const checkedRadio = document.querySelector(
                  'input[type="radio"]:checked'
                );
                return {
                  hasSelection: !!checkedRadio,
                  selectedValue: checkedRadio ? checkedRadio.value : null,
                  selectedTestId: checkedRadio
                    ? checkedRadio
                        .closest("[data-testid]")
                        ?.getAttribute("data-testid")
                    : null,
                };
              });

              if (finalVerification.hasSelection) {
                logHeader(
                  {},
                  `✅ Verificación final exitosa - Installment confirmado: ${finalVerification.selectedValue} (${finalVerification.selectedTestId})`,
                  test_case_id
                );
              } else {
                logHeader(
                  {},
                  `⚠️ ADVERTENCIA: Verificación final falló - No hay radio button seleccionado`,
                  test_case_id
                );
              }
            }
          } else {
            logHeader(
              {},
              `❌ Validación de installments falló: ${installmentsResult.error}`,
              test_case_id
            );

            // CRÍTICO: Si falla por selección obligatoria, DETENER EL PAGO
            if (
              installmentsResult.error === "INSTALLMENT_SELECTION_MANDATORY"
            ) {
              logHeader(
                {},
                `🚨 ERROR CRÍTICO: INSTALLMENTS DISPONIBLES PERO NO SELECCIONADOS`,
                test_case_id
              );
              logHeader(
                {},
                `🚨 DETENIENDO PROCESO - EL PAGO NO PUEDE CONTINUAR SIN SELECCIÓN DE INSTALLMENTS`,
                test_case_id
              );

              // Tomar screenshot del error
              const errorScreenshotPath = `${TEST_CASE_ID_FULL_PATH}/installments-selection-error.png`;
              await takeScreenshotAndSave(errorScreenshotPath, targetPage);

              // Lanzar error para detener el proceso
              throw new Error(
                `INSTALLMENT_SELECTION_MANDATORY: Hay ${installmentsResult.availableInstallments} installments disponibles pero no se seleccionó ninguno. El pago no puede proceder.`
              );
            }
          }
        } catch (installmentsError) {
          logHeaderError(
            {},
            `⚠️ Error en validación de installments: ${installmentsError.message}`,
            installmentsError
          );

          // Si es el error de selección obligatoria, re-lanzarlo para detener el proceso
          if (
            installmentsError.message.includes(
              "INSTALLMENT_SELECTION_MANDATORY"
            )
          ) {
            throw installmentsError;
          }
        }

        break;
    }

    // Handle save my info ONLY for REGISTER flows
    if (payment_flow_type === "REGISTER" && _t.get("isNotHostedCheckout")) {
      logHeader(
        {},
        `🔄 Iniciando flujo Save My Info para REGISTER: ${test_case_id}`,
        test_case_id
      );

      try {
        // First, check current state of the checkbox
        let initialChecked = await isSaveMyInfoChecked(targetPage);
        logHeader(
          {},
          `🔍 Estado inicial del checkbox: ${
            initialChecked ? "CHECKED ✅" : "UNCHECKED ❌"
          }`,
          test_case_id
        );

        // If not checked, click to check it
        if (!initialChecked) {
          await clickSaveMyInfo(targetPage);
          logHeader(
            {},
            `✅ Save my info clicked: ${test_case_id}`,
            test_case_id
          );

          // Wait a moment for the state to update
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Verify it's now checked
          saveMyInfoWasChecked = await isSaveMyInfoChecked(targetPage);
          logHeader(
            {},
            `🔍 Estado después del click: ${
              saveMyInfoWasChecked ? "CHECKED ✅" : "UNCHECKED ❌"
            }`,
            test_case_id
          );

          // If still not checked, try clicking again
          if (!saveMyInfoWasChecked) {
            logHeader(
              {},
              `🔄 Checkbox aún no marcado, intentando segundo click...`,
              test_case_id
            );
            await clickSaveMyInfo(targetPage);
            await new Promise((resolve) => setTimeout(resolve, 500));

            saveMyInfoWasChecked = await isSaveMyInfoChecked(targetPage);
            logHeader(
              {},
              `🔍 Estado después del segundo click: ${
                saveMyInfoWasChecked ? "CHECKED ✅" : "UNCHECKED ❌"
              }`,
              test_case_id
            );
          }
        } else {
          // Already checked, no need to click
          saveMyInfoWasChecked = true;
          logHeader(
            {},
            `✅ Checkbox ya estaba marcado: ${test_case_id}`,
            test_case_id
          );
        }

        // Final verification
        if (saveMyInfoWasChecked) {
          logHeader(
            {},
            `🎉 Save My Info confirmado como CHECKED para flujo REGISTER`,
            test_case_id
          );
        } else {
          logHeader(
            {},
            `⚠️ ADVERTENCIA: No se pudo marcar el checkbox Save My Info`,
            test_case_id
          );
        }
      } catch (error) {
        // Generate alert but continue execution
        logHeaderError(
          {},
          `⚠️ Error en flujo Save My Info: ${error.message}`,
          error
        );

        // Still try to check the checkbox status even if click failed
        try {
          saveMyInfoWasChecked = await isSaveMyInfoChecked(targetPage);
          logHeader(
            {},
            `🔍 Estado del checkbox después de error: ${
              saveMyInfoWasChecked ? "CHECKED ✅" : "UNCHECKED ❌"
            }`,
            test_case_id
          );
        } catch (checkError) {
          logHeader(
            {},
            `⚠️ No se pudo verificar estado del checkbox: ${checkError.message}`,
            test_case_id
          );
          saveMyInfoWasChecked = false;
        }
      }
    } else if (payment_flow_type !== "REGISTER") {
      logHeader(
        {},
        `ℹ️ Flujo ${payment_flow_type} - Omitiendo Save My Info (solo para REGISTER)`,
        test_case_id
      );
      saveMyInfoWasChecked = false;
    }

    //Get the payment amount in the checkout page
    displayed_amount = await getSummaryAmount(
      page,
      payment_request_type === PAYMENT_REQUEST_TYPES.SUBSCRIPTION
    );

    // CRITICAL PRE-PAYMENT VERIFICATION: Ensure installments are properly selected
    if (payment_type === "CARD" || payment_type === "ONE_CLICK") {
      logHeader(
        {},
        `🔍 VERIFICACIÓN CRÍTICA PRE-PAGO: Confirmando selección de installments...`,
        test_case_id
      );

      try {
        const prePaymentCheck = await targetPage.evaluate(() => {
          // Check for selected radio button
          const checkedRadio = document.querySelector(
            'input[type="radio"]:checked'
          );

          // Check if installments container is visible
          const installmentsContainer = document.querySelector(
            '[data-testid="installments-input"]'
          );
          const installmentsList = document.querySelector(
            '[data-testid="installmentsList-wrap"]'
          );

          // Get all radio buttons
          const allRadios = Array.from(
            document.querySelectorAll('input[type="radio"]')
          );

          // Try to click the first radio's parent span if no radio is checked
          let hasCheckedRadio = !!checkedRadio;

          if (allRadios.length > 0) {
            try {
              const firstRadio = allRadios[3];
              const parentSpan = firstRadio.closest("span");

              if (parentSpan) {
                logDebugger(
                  "🎯 Intentando click en parent span del primer radio:",
                  {
                    radioValue: firstRadio.value,
                    radioName: firstRadio.name,
                    spanClass: parentSpan.className || "no-class",
                    spanTag: parentSpan.tagName,
                  },
                  test_case_id
                );

                parentSpan.click();

                // Wait a moment and check if the first radio is now selected
                setTimeout(() => {
                  hasCheckedRadio = !!firstRadio.checked;
                  logDebugger(
                    "✅ Resultado después del click en parent span:",
                    {
                      success: hasCheckedRadio,
                      checkedValue: firstRadio.checked
                        ? firstRadio.value
                        : null,
                    },
                    test_case_id,
                    "success"
                  );
                }, 200);
              } else {
                logDebugger(
                  "❌ No se encontró parent span para el primer radio",
                  null,
                  test_case_id,
                  "error"
                );
                hasCheckedRadio = false;
              }
            } catch (error) {
              logDebugger(
                `❌ Error al hacer click en parent span: ${error.message}`,
                { error },
                test_case_id,
                "error"
              );
              hasCheckedRadio = false;
            }
          }

          return {
            hasCheckedRadio: hasCheckedRadio,
            checkedValue: checkedRadio ? checkedRadio.value : null,
            checkedTestId: checkedRadio
              ? checkedRadio
                  .closest("[data-testid]")
                  ?.getAttribute("data-testid")
              : null,
            installmentsContainerExists: !!installmentsContainer,
            installmentsListExists: !!installmentsList,
            totalRadios: allRadios.length,
            radioStates: allRadios.map((radio, index) => ({
              index,
              name: radio.name,
              value: radio.value,
              checked: radio.checked,
              testId: radio
                .closest("[data-testid]")
                ?.getAttribute("data-testid"),
              parentSpan: radio.closest("span")
                ? {
                    tagName: radio.closest("span").tagName,
                    className: radio.closest("span").className || "no-class",
                    id: radio.closest("span").id || "no-id",
                    outerHTML:
                      radio.closest("span").outerHTML.substring(0, 100) + "...",
                  }
                : null,
            })),
          };
        });

        // If no radio is selected and there are radios available, this is a critical issue
        if (prePaymentCheck.totalRadios > 0) {
          // Tomar screenshot del error crítico
          const criticalErrorScreenshotPath = `${TEST_CASE_ID_FULL_PATH}/installment-error.png`;
          await takeScreenshotAndSave(criticalErrorScreenshotPath, targetPage);

          // Lanzar error crítico para detener completamente el proceso
          throw new Error(
            `CRITICAL_PRE_PAYMENT_ERROR: Detectados ${prePaymentCheck.totalRadios} radio buttons de installments pero ninguno está seleccionado. El pago NO puede proceder sin selección obligatoria de installments.`
          );
        }
      } catch (verificationError) {
        logHeader(
          {},
          `⚠️ Error en verificación pre-pago: ${verificationError.message}`,
          test_case_id
        );
      }
    }

    // 📸 CRITICAL: Take form-page-fill screenshot AFTER installments validation/selection (when applicable)
    logHeader(
      {},
      `📸 Saving screenshot for form page fill (post-installments): ${test_case_id}`,
      test_case_id
    );
    const PATH_IMAGE_FORM_PAGE = `${TEST_CASE_ID_FULL_PATH}/form-page-fill.png`;
    await takeScreenshotAndSave(PATH_IMAGE_FORM_PAGE, targetPage);

    // Enhanced logging for successful installment validation
    if (payment_type === "CARD" || payment_type === "ONE_CLICK") {
      // Log final installment state for debugging
      try {
        const finalInstallmentState = await targetPage.evaluate(() => {
          const checkedRadio = document.querySelector(
            'input[type="radio"]:checked'
          );
          const installmentsInput = document.querySelector(
            '[data-testid="installments-input"]'
          );

          return {
            hasCheckedRadio: !!checkedRadio,
            checkedValue: checkedRadio ? checkedRadio.value : null,
            checkedTestId: checkedRadio
              ? checkedRadio
                  .closest("[data-testid]")
                  ?.getAttribute("data-testid")
              : null,
            inputValue: installmentsInput
              ? installmentsInput.value || installmentsInput.textContent
              : null,
            timestamp: new Date().toISOString(),
          };
        });

        logHeader(
          {},
          `📊 ESTADO FINAL DE INSTALLMENTS para screenshot:`,
          test_case_id
        );
        logHeader(
          {},
          `   ✅ Radio seleccionado: ${finalInstallmentState.hasCheckedRadio}`,
          test_case_id
        );
        if (finalInstallmentState.hasCheckedRadio) {
          logHeader(
            {},
            `   🎯 Installment confirmado: ${finalInstallmentState.checkedValue} (${finalInstallmentState.checkedTestId})`,
            test_case_id
          );
          logHeader(
            {},
            `   📝 Input value: ${finalInstallmentState.inputValue}`,
            test_case_id
          );
        }
      } catch (stateError) {
        logHeader(
          {},
          `⚠️ Error obteniendo estado final de installments: ${stateError.message}`,
          test_case_id
        );
      }
    }

    //Click pay button
    logHeader({}, `💳 Clicking Pay Button: ${test_case_id}`, test_case_id);
    await run(
      async () => await payCheckout(page, i),
      ACTION_ERROR_MESSAGES.PAY_CHECKOUT
    );

    // Handle different payment type flows after payment button click
    if (payment_type === "SPEI") {
      logHeader(
        {},
        `🏦 Handling SPEI payment flow: ${test_case_id}`,
        test_case_id
      );
      await run(
        async () => await handleSpeiPaymentFlow(targetPage),
        ACTION_ERROR_MESSAGES.HANDLE_SPEI_FLOW ||
          "Error handling SPEI payment flow"
      );
    } else if (payment_type === "CASH") {
      logHeader(
        {},
        `💵 Handling Cash payment flow: ${test_case_id}`,
        test_case_id
      );
      await run(
        async () => await handleCashPaymentFlow(targetPage, test_case_id),
        ACTION_ERROR_MESSAGES.HANDLE_CASH_FLOW ||
          "Error handling Cash payment flow"
      );
    }

    // Only proceed to payment transition and success page for non-CASH payments
    if (payment_type !== "CASH") {
      logHeader(
        {},
        `⏳ Waiting for payment transition: ${test_case_id}`,
        test_case_id
      );
      await run(
        async () =>
          await waitForPaymentTransition(
            page,
            payment_request_type === PAYMENT_REQUEST_TYPES.SUBSCRIPTION,
            false //3ds
          ),
        ACTION_ERROR_MESSAGES.WAIT_PAYMENT_TRANSITION,
        {
          page: targetPage,
          testCaseId: test_case_id,
          screenshotPath: TEST_CASE_ID_FULL_PATH,
        }
      );

      logHeader(
        {},
        `💰 Processing payment success: ${test_case_id}`,
        test_case_id
      );
      await run(
        async () =>
          await getSuccessPaymentPage(
            page,
            payment_request_type === PAYMENT_REQUEST_TYPES.SUBSCRIPTION
          ),
        ACTION_ERROR_MESSAGES.PAYMENT_SUCCESS
      );

      logHeader(
        {},
        `🎉 Saving screenshot for success pay page: ${test_case_id}`,
        test_case_id
      );
      const PATH_IMAGE_SUCCESS_PAGE = `${TEST_CASE_ID_FULL_PATH}/success-pay-page.png`;

      // CRITICAL: This screenshot MUST succeed before any cleanup
      try {
        await takeScreenshotAndSave(PATH_IMAGE_SUCCESS_PAGE, targetPage, 5); // 5 retries
        logHeader(
          {},
          `✅ Success screenshot saved: ${test_case_id}`,
          test_case_id
        );
      } catch (screenshotError) {
        logHeader(
          {},
          `🚨 CRITICAL: Failed to save success screenshot after retries: ${screenshotError.message}`
        );

        // EXTREME MEASURE: Force mandatory success screenshot
        try {
          logHeader(
            {},
            `🚨 EXTREME MEASURE: Forcing mandatory success screenshot: ${test_case_id}`,
            test_case_id
          );
          const availablePages = [targetPage, page].filter(
            (p) => p && !p.isClosed()
          );
          const forceSuccess = await forceMandatoryScreenshot(
            PATH_IMAGE_SUCCESS_PAGE,
            availablePages,
            test_case_id
          );

          if (forceSuccess) {
            logHeader(
              {},
              `🎯 FORCED success screenshot captured: ${test_case_id}`,
              test_case_id
            );
          } else {
            logHeader(
              {},
              `🚨 COMPLETE FAILURE: Could not capture mandatory success screenshot: ${test_case_id}`,
              test_case_id
            );
          }
        } catch (extremeError) {
          logHeader(
            {},
            `🚨 EXTREME FAILURE in success screenshot: ${extremeError.message}`,
            test_case_id
          );
        }
        // Continue execution but log the critical failure
      }

      // Check if this was a successful CARD payment and save user data
      if (payment_type === "CARD" || payment_type === "ONE_CLICK") {
        logHeader(
          {},
          `💾 Verificando y guardando datos de usuario exitoso: ${test_case_id}`,
          test_case_id
        );

        try {
          const userData = {
            email,
            card,
            testCaseId: test_case_id,
            paymentRequestId: payment_request_id,
            amount: displayed_amount,
            saveMyInfoChecked: saveMyInfoWasChecked,
          };

          await saveSuccessfulUser(userData);
        } catch (userSaveError) {
          logHeader(
            {},
            `⚠️ Error guardando datos de usuario exitoso: ${userSaveError.message}`,
            test_case_id
          );
        }
      }
    } else {
      // For CASH payments, take screenshot of barcode page instead
      logHeader(
        {},
        `🎉 Saving screenshot for cash payment barcode page: ${test_case_id}`,
        test_case_id
      );
      const PATH_IMAGE_BARCODE_PAGE = `${TEST_CASE_ID_FULL_PATH}/cash-barcode-page.png`;
      await takeScreenshotAndSave(PATH_IMAGE_BARCODE_PAGE, targetPage);
    }
  } catch (e) {
    status = `Failed reason: { ${e} }`;

    // Enhanced error context logging
    logDebugger(
      `💥 Critical error occurred in cluster task`,
      {
        errorMessage: e.message,
        errorType: e.name,
        errorStack: e.stack?.split("\n").slice(0, 3), // First 3 lines of stack
        testCaseId: test_case_id,
        paymentFlow: payment_flow,
        environment: env,
      },
      test_case_id,
      "error"
    );

    // Log page states before attempting emergency screenshot
    let mainPageUrl = "N/A";
    let targetPageUrl = "N/A";
    let browserConnected = false;

    try {
      if (page && !page.isClosed()) {
        mainPageUrl = await page.url();
      }
    } catch (urlError) {
      mainPageUrl = "URL_ERROR";
    }

    try {
      if (targetPage && !targetPage.isClosed()) {
        targetPageUrl = await targetPage.url();
      }
    } catch (urlError) {
      targetPageUrl = "URL_ERROR";
    }

    try {
      if (page) {
        browserConnected = await page.browser().isConnected();
      }
    } catch (browserError) {
      browserConnected = false;
    }

    logDebugger(
      `🔍 Page status diagnostics before emergency screenshot`,
      {
        mainPageExists: !!page,
        mainPageClosed: page ? page.isClosed() : "N/A",
        mainPageUrl,
        targetPageExists: !!targetPage,
        targetPageClosed: targetPage ? targetPage.isClosed() : "N/A",
        targetPageUrl,
        browserConnected,
      },
      test_case_id,
      "error"
    );

    logDebugger(
      `Critical error in cluster task: ${e}`,
      { error: e },
      test_case_id,
      "error"
    );
    logHeader(
      {},
      `🚨 CRITICAL ERROR: Attempting mandatory screenshot capture before cleanup: ${test_case_id}`,
      test_case_id
    );

    const PATH_IMAGE_ERROR_HAPPENED = `${TEST_CASE_ID_FULL_PATH}/error-ocurred.png`;

    // MANDATORY ERROR SCREENSHOT - Multiple attempts with different pages
    let screenshotSuccess = false;

    // Attempt 1: Try with the original page (might still be responsive)
    try {
      let originalPageUrl = "N/A";
      try {
        if (page && !page.isClosed()) {
          originalPageUrl = await page.url();
        }
      } catch (urlError) {
        originalPageUrl = "URL_ERROR";
      }

      logDebugger(
        `📸 Attempt 1: Starting error screenshot with original page`,
        {
          attempt: 1,
          pageExists: !!page,
          pageClosed: page ? page.isClosed() : "N/A",
          pageUrl: originalPageUrl,
          screenshotPath: PATH_IMAGE_ERROR_HAPPENED,
        },
        test_case_id,
        "log"
      );

      logHeader(
        {},
        `📸 Attempt 1: Error screenshot with original page: ${test_case_id}`,
        test_case_id
      );
      await takeScreenshotAndSave(PATH_IMAGE_ERROR_HAPPENED, page, 3);
      screenshotSuccess = true;
      let pageUrl = "N/A";
      try {
        if (page && !page.isClosed()) {
          pageUrl = await page.url();
        }
      } catch (urlError) {
        pageUrl = "URL_ERROR";
      }

      logDebugger(
        `✅ Attempt 1: Original page screenshot successful`,
        {
          attempt: 1,
          screenshotPath: PATH_IMAGE_ERROR_HAPPENED,
          pageUrl: pageUrl,
        },
        test_case_id,
        "success"
      );
      logHeader(
        {},
        `✅ Error screenshot captured successfully with original page: ${test_case_id}`,
        test_case_id
      );
    } catch (originalPageError) {
      logDebugger(
        `⚠️ Attempt 1: Original page screenshot failed`,
        {
          attempt: 1,
          errorMessage: originalPageError.message,
          errorType: originalPageError.name,
          pageExists: !!page,
          pageClosed: page ? page.isClosed() : "N/A",
        },
        test_case_id,
        "error"
      );
      logHeader(
        {},
        `⚠️ Original page screenshot failed: ${originalPageError.message}`,
        test_case_id
      );
    }

    // Attempt 2: Try with targetPage if original page failed
    if (!screenshotSuccess && targetPage && !targetPage.isClosed()) {
      try {
        logHeader(
          {},
          `📸 Attempt 2: Error screenshot with target page: ${test_case_id}`,
          test_case_id
        );
        await takeScreenshotAndSave(PATH_IMAGE_ERROR_HAPPENED, targetPage, 3);
        screenshotSuccess = true;
        logHeader(
          {},
          `✅ Error screenshot captured successfully with target page: ${test_case_id}`,
          test_case_id
        );
      } catch (targetPageError) {
        logHeader(
          {},
          `⚠️ Target page screenshot failed: ${targetPageError.message}`,
          test_case_id
        );
      }
    }

    // Final attempt with any available page
    if (!screenshotSuccess) {
      try {
        logHeader(
          {},
          `📸 Final attempt: Error screenshot with best available page: ${test_case_id}`,
          test_case_id
        );
        const bestPage =
          targetPage && !targetPage.isClosed() ? targetPage : page;
        await takeScreenshotAndSave(PATH_IMAGE_ERROR_HAPPENED, bestPage, 5); // More retries for final attempt
        screenshotSuccess = true;
        logHeader(
          {},
          `✅ Error screenshot captured on final attempt: ${test_case_id}`,
          test_case_id
        );
      } catch (finalError) {
        logHeaderError(
          {},
          `⚠️ Final regular attempt failed: ${finalError.message}`,
          finalError
        );

        // EXTREME MEASURE: Use force screenshot with all available pages
        try {
          logHeader(
            {},
            `🚨 EXTREME MEASURE: Attempting force screenshot capture: ${test_case_id}`,
            test_case_id
          );
          const availablePages = [page, targetPage].filter(
            (p) => p && !p.isClosed()
          );
          screenshotSuccess = await forceMandatoryScreenshot(
            PATH_IMAGE_ERROR_HAPPENED,
            availablePages,
            test_case_id
          );

          if (screenshotSuccess) {
            logHeader(
              {},
              `🎯 FORCE screenshot SUCCESS: ${test_case_id}`,
              test_case_id
            );
          }
        } catch (extremeError) {
          logHeaderError(
            {},
            `🚨 EXTREME FAILURE: ${extremeError.message}`,
            extremeError
          );
        }
      }
    }

    if (!screenshotSuccess) {
      logHeader(
        {},
        `🚨 COMPLETE FAILURE: No error screenshot could be captured for debugging: ${test_case_id}`,
        test_case_id
      );
    } else {
      logHeader(
        {},
        `✅ MANDATORY error screenshot secured: ${test_case_id}`,
        test_case_id
      );
    }
  } finally {
    // CRITICAL: Thread-safe video recording cleanup with minimum duration guarantee
    logHeader(
      {},
      `🔄 Iniciando cleanup thread-safe para: ${test_case_id}`,
      test_case_id
    );

    // Thread-safe cleanup and video generation
    if (RECORD_PAYMENT && threadId) {
      try {
        // Get recording statistics before cleanup
        const stats = videoManager.getRecordingStats(threadId);
        if (stats) {
          logHeader(
            {},
            `📊 Estadísticas thread-safe: ${stats.frameCount} frames, ${
              stats.errorCount
            } errores, ${Math.round(
              stats.duration / 1000
            )}s duración [Thread: ${stats.threadId}]`,
            test_case_id
          );

          // Ensure minimum recording duration
          if (stats.duration < MIN_RECORDING_DURATION) {
            const remainingTime = MIN_RECORDING_DURATION - stats.duration;
            logHeader(
              {},
              `⏳ Esperando tiempo mínimo thread-safe: ${Math.round(
                remainingTime / 1000
              )}s restantes [Thread: ${stats.threadId}]`,
              test_case_id
            );
            await new Promise((resolve) => setTimeout(resolve, remainingTime));
          }
        }

        // Convert to video using thread-safe manager
        const videoOutputPath = `${TEST_CASE_ID_FULL_PATH}/test-execution.mp4`;

        logHeader(
          {},
          `🎬 Iniciando conversión thread-safe a video... [Thread: ${threadId.slice(
            -8
          )}]`,
          test_case_id
        );

        const conversionResult = await videoManager.convertToVideoSafe(
          threadId,
          videoOutputPath,
          test_case_id
        );

        if (conversionResult.success) {
          logHeader(
            {},
            `✅ Video MP4 thread-safe creado exitosamente: ${
              conversionResult.frameCount
            } frames, ${Math.round(
              conversionResult.duration / 1000
            )}s [Thread: ${threadId.slice(-8)}]`,
            test_case_id
          );
        } else {
          logHeaderError(
            {},
            `⚠️ Error en conversión thread-safe: ${conversionResult.error}`,
            new Error(conversionResult.error),
            test_case_id
          );

          logHeader(
            {},
            `💡 Screenshots thread-safe disponibles en: ${threadVideoPath}/ (${
              conversionResult.frameCount
            } frames) [Thread: ${threadId.slice(-8)}]`,
            test_case_id
          );
        }

        // Cleanup thread resources
        videoManager.cleanupThread(threadId);
        logHeader(
          {},
          `🧹 Recursos thread-safe limpiados [Thread: ${threadId.slice(-8)}]`,
          test_case_id
        );
      } catch (threadCleanupError) {
        logHeaderError(
          {},
          `❌ Error en cleanup thread-safe: ${threadCleanupError.message}`,
          threadCleanupError,
          test_case_id
        );

        // Force cleanup even on error
        if (threadId) {
          videoManager.cleanupThread(threadId);
        }
      }
    }

    // CRITICAL: Save all accumulated logs to text file before any cleanup
    try {
      logHeader(
        {},
        `💾 Saving execution logs to file: ${test_case_id}`,
        test_case_id
      );
      const logFilePath = await saveLogsToFile(test_case_id);
      logHeader({}, `✅ Execution logs saved: ${logFilePath}`, test_case_id);
    } catch (logSaveError) {
      logHeaderError(
        {},
        `⚠️ Error saving execution logs: ${logSaveError.message}`,
        logSaveError
      );
      // Try to save with error indication
      try {
        addLogEntry(
          `🚨 Error saving main logs: ${logSaveError.message}`,
          "ERROR",
          null,
          test_case_id
        );
        await saveLogsToFile(test_case_id);
      } catch (fallbackError) {
        console.error(
          `🚨 CRITICAL: Could not save execution logs: ${fallbackError.message}`
        );
      }
    }

    // Log payment status based on whether there were errors
    const isPaymentSuccessful = status === "OK";
    const errorMessage = isPaymentSuccessful ? null : status;
    logPaymentStatus(test_case_id, isPaymentSuccessful, errorMessage);
    {
      //Generate result for excel
      const result_test_case = [
        test_case_id,
        card,
        email,
        phone,
        payment_request_id,
        payment_flow_type,
        displayed_amount,
        payment_request_type,
        getFormattedDateTime(),
        status,
      ];

      results_run.push(result_test_case);

      logHeader({}, `📝 Save logs: ${test_case_id}`, test_case_id);
      const PATH_LOG_SAVE_DIR =
        BASE_DIR + `/${TEST_CASE_ID_FULL_PATH}/logs.json`;

      logHeader(
        {},
        `💾 Write JSON Logs results: ${test_case_id}`,
        test_case_id
      );
      setTimeout(
        async () =>
          await writeFile(
            PATH_LOG_SAVE_DIR,
            formatRequestLogs(request_log_list),
            TIMEOUT_WAIT_LOGS
          )
      );

      // Clear file logger after saving all logs
      setTimeout(() => {
        try {
          clearCurrentLogs(test_case_id);
          logDebugger(
            `🧹 File logger cleaned for: ${test_case_id}`,
            null,
            test_case_id,
            "success"
          );
        } catch (cleanupError) {
          logDebugger(
            `⚠️ Error cleaning file logger: ${cleanupError.message}`,
            { error: cleanupError },
            test_case_id,
            "error"
          );
        }
      }, TIMEOUT_WAIT_LOGS + 1000);

      // Automatic cleanup of old test runs (keep only last 8 per payment type)
      setTimeout(async () => {
        try {
          const paymentType = `${env}-${payment_request_type.toLowerCase()}`;
          logHeader(
            {},
            `🧹 Starting automatic cleanup for: ${paymentType}`,
            test_case_id
          );
          addLogEntry(
            `🧹 Starting automatic cleanup for: ${paymentType}`,
            "INFO",
            null,
            test_case_id
          );

          const cleanupResult = await cleanOldTestRuns(paymentType);

          if (cleanupResult.cleaned > 0) {
            logHeader(
              {},
              `✅ Cleanup completed: ${cleanupResult.cleaned} old runs deleted, ${cleanupResult.kept} kept`,
              test_case_id
            );
            addLogEntry(
              `✅ Cleanup completed: ${cleanupResult.cleaned} old runs deleted, ${cleanupResult.kept} kept`,
              "SUCCESS",
              null,
              test_case_id
            );
          }
        } catch (cleanupError) {
          logHeader(
            {},
            `⚠️ Error during automatic cleanup: ${cleanupError.message}`,
            test_case_id
          );
          addLogEntry(
            `⚠️ Error during automatic cleanup: ${cleanupError.message}`,
            "WARNING",
            null,
            test_case_id
          );
        }
      }, TIMEOUT_WAIT_LOGS + 2000);
    }
  }
}

module.exports = { taskCheckoutPay };
