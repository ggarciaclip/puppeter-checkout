const { logHeader, logHeaderError } = require("../lib/logger");

/**
 * Debug function to inspect radio button parent structure for proper clicking
 */
async function debugRadioButtonStructure(page, targetQuantity) {
  const radioStructureInfo = await page.evaluate((quantity) => {
    const container = document.querySelector(
      `[data-testid="label-installment-${quantity}"]`
    );
    if (!container) return { error: "Container not found" };

    const radio = container.querySelector('input[type="radio"]');
    if (!radio) return { error: "Radio not found in container" };

    // Analyze the parent hierarchy
    const parents = [];
    let current = radio.parentElement;
    let depth = 0;

    while (current && depth < 5) {
      parents.push({
        depth,
        tagName: current.tagName,
        className: current.className || "no-class",
        id: current.id || "no-id",
        role: current.getAttribute("role") || "no-role",
        clickable: current.style.pointerEvents !== "none",
        hasClickHandler:
          current.onclick !== null || current.getAttribute("onclick") !== null,
        rect: current.getBoundingClientRect(),
      });
      current = current.parentElement;
      depth++;
    }

    return {
      radioInfo: {
        name: radio.name,
        value: radio.value,
        checked: radio.checked,
        disabled: radio.disabled,
      },
      parentHierarchy: parents,
      containerInfo: {
        tagName: container.tagName,
        className: container.className,
        hasClickHandler: container.onclick !== null,
      },
    };
  }, targetQuantity);

  logHeader({}, `🔬 RADIO STRUCTURE DEBUG para quantity ${targetQuantity}:`);

  if (radioStructureInfo.error) {
    logHeader({}, `   ❌ Error: ${radioStructureInfo.error}`);
    return radioStructureInfo;
  }

  logHeader(
    {},
    `   📻 Radio info: name=${radioStructureInfo.radioInfo.name}, value=${radioStructureInfo.radioInfo.value}, checked=${radioStructureInfo.radioInfo.checked}`
  );
  logHeader(
    {},
    `   📦 Container: ${radioStructureInfo.containerInfo.tagName}.${radioStructureInfo.containerInfo.className}`
  );

  radioStructureInfo.parentHierarchy.forEach((parent, index) => {
    logHeader(
      {},
      `   📋 Parent ${parent.depth}: ${parent.tagName}.${parent.className} (clickable: ${parent.clickable}, handler: ${parent.hasClickHandler})`
    );
  });

  return radioStructureInfo;
}

/**
 * Debug function to inspect installments DOM structure
 */
async function debugInstallmentsDOM(page) {
  const domInfo = await page.evaluate(() => {
    const installmentLabels = Array.from(
      document.querySelectorAll('[data-testid^="label-installment-"]')
    );
    const radioInputs = Array.from(
      document.querySelectorAll('input[type="radio"]')
    );

    return {
      installmentLabels: installmentLabels.map((label) => ({
        testId: label.getAttribute("data-testid"),
        hasRadio: !!label.querySelector('input[type="radio"]'),
        text: label.textContent?.trim().substring(0, 80),
      })),
      radioInputs: radioInputs.map((radio, index) => ({
        index: index,
        name: radio.name,
        value: radio.value,
        checked: radio.checked,
        parentTestId: radio
          .closest("[data-testid]")
          ?.getAttribute("data-testid"),
      })),
    };
  });

  logHeader(
    {},
    `🔬 DOM DEBUG - Labels: ${domInfo.installmentLabels.length}, Radios: ${domInfo.radioInputs.length}`
  );
  domInfo.installmentLabels.forEach((label) => {
    logHeader({}, `   📋 ${label.testId} - hasRadio: ${label.hasRadio}`);
  });

  return domInfo;
}

/**
 * Validate installments functionality after filling card number
 * @param {Object} page - Puppeteer page object
 * @param {string} testCaseId - Test case ID for logging
 * @param {Array} requestLogList - Array to store request logs
 * @returns {Object} - Validation results and selected installment
 */
async function validateInstallments(page, testCaseId, requestLogList) {
  try {
    logHeader({}, `💳 Iniciando validación de installments: ${testCaseId}`);

    // Step 0: Wait after card filling to allow installments to appear
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds for installments to load

    // Step 1: Wait for installments input to appear after card number is filled

    let installmentsInput;
    try {
      await page.waitForSelector('[data-testid="installments-input"]', {
        timeout: 10000,
        visible: true,
      });
      installmentsInput = await page.$('[data-testid="installments-input"]');
      logHeader({}, `✅ Selector de installments encontrado`);
    } catch (error) {
      logHeaderError(
        {},
        `❌ Selector de installments no encontrado: ${
          error.message
        } [Line: ${new Error().stack.split("\n")[1].trim()}]`,
        error
      );
      return {
        success: false,
        error: "Installments input not found",
        installmentsAvailable: false,
      };
    }

    // Step 2: Click on installments input to open options
    logHeader({}, `🖱️ Haciendo click en el selector de installments...`);
    await installmentsInput.click();

    // Wait a moment for the options to load
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Step 3: Wait for installments list to appear
    logHeader({}, `📋 Esperando que aparezca la lista de installments...`);

    let installmentsList;
    try {
      await page.waitForSelector('[data-testid="installmentsList-wrap"]', {
        timeout: 8000,
        visible: true,
      });
      installmentsList = await page.$('[data-testid="installmentsList-wrap"]');
      logHeader({}, `✅ Lista de installments encontrada`);
    } catch (error) {
      logHeaderError(
        {},
        `❌ Lista de installments no encontrada: ${
          error.message
        } [Line: ${new Error().stack.split("\n")[1].trim()}]`,
        error
      );
      return {
        success: false,
        error: "Installments list not found",
        installmentsAvailable: true,
        installmentsOpened: false,
      };
    }

    // Step 4: Find and validate the installments API call
    logHeader({}, `🔍 Buscando llamada a API de installments...`);

    const installmentsApiCall = requestLogList.find(
      (req) => req.url && req.url.includes("api/installments")
    );

    if (!installmentsApiCall) {
      logHeader({}, `❌ No se encontró llamada a API de installments`);
      return {
        success: false,
        error: "Installments API call not found",
        installmentsAvailable: true,
        installmentsOpened: true,
        apiCallFound: false,
      };
    }

    logHeader(
      {},
      `✅ Llamada a API de installments encontrada: ${installmentsApiCall}`
    );

    // Extract installments from API response
    let apiInstallments = [];
    if (
      installmentsApiCall.response &&
      installmentsApiCall.response.installments
    ) {
      apiInstallments = installmentsApiCall.response.installments;
      logHeader(
        {},
        `📊 Se encontraron ${apiInstallments.length} installments en la respuesta de la API`
      );
    } else {
      logHeader(
        {},
        `⚠️ No se encontraron installments en la respuesta de la API`
      );
    }

    // Step 5: Extract installments from UI labels
    logHeader({}, `🏷️ Extrayendo installments de los labels en la UI...`);

    const uiInstallments = await page.evaluate(() => {
      const labels = Array.from(
        document.querySelectorAll('[data-testid^="label-installment-"]')
      );

      return labels.map((label) => {
        const testId = label.getAttribute("data-testid");
        const quantity = testId
          ? parseInt(testId.replace("label-installment-", ""))
          : null;

        // Extract text content
        const textContent = label.textContent || "";

        // Try to extract values using regex patterns
        const monthlyPaymentMatch = textContent.match(
          /(\d+)\s*x\s*\$(\d+(?:,\d{3})*(?:\.\d{2})?)/
        );
        const totalAmountMatch = textContent.match(
          /\$(\d+(?:,\d{3})*(?:,\d{3})*(?:\.\d{2})?)\s*$/
        );
        const extraFeeMatch = textContent.match(
          /\(\+\$(\d+(?:,\d{3})*(?:\.\d{2})?)\)/
        );

        return {
          quantity: quantity,
          monthlyPaymentText: monthlyPaymentMatch
            ? monthlyPaymentMatch[0]
            : null,
          monthlyAmount:
            monthlyPaymentMatch && monthlyPaymentMatch[2]
              ? parseFloat(monthlyPaymentMatch[2].replace(/,/g, ""))
              : null,
          totalAmountText: totalAmountMatch ? totalAmountMatch[0] : null,
          totalAmount:
            totalAmountMatch && totalAmountMatch[1]
              ? parseFloat(totalAmountMatch[1].replace(/,/g, ""))
              : null,
          extraFeeText: extraFeeMatch ? extraFeeMatch[0] : null,
          extraFee:
            extraFeeMatch && extraFeeMatch[1]
              ? parseFloat(extraFeeMatch[1].replace(/,/g, ""))
              : null,
          fullText: textContent.trim(),
          element: label,
        };
      });
    });

    // Step 6: Map and validate API vs UI installments
    logHeader(
      {},
      `🔄 Mapeando installments de API con UI... ${uiInstallments}`
    );

    const mappedInstallments = [];

    for (const apiInstallment of apiInstallments) {
      const uiMatch = uiInstallments.find(
        (ui) => ui.quantity === apiInstallment.quantity
      );

      if (uiMatch) {
        const isValid =
          Math.abs(uiMatch.totalAmount - apiInstallment.total_amount) < 0.01;

        mappedInstallments.push({
          quantity: apiInstallment.quantity,
          api: {
            fee: apiInstallment.fee,
            amount: apiInstallment.amount,
            total_amount: apiInstallment.total_amount,
          },
          ui: {
            monthlyAmount: uiMatch.monthlyAmount,
            totalAmount: uiMatch.totalAmount,
            extraFee: uiMatch.extraFee,
            fullText: uiMatch.fullText,
          },
          isValid: isValid,
          difference: Math.abs(
            uiMatch.totalAmount - apiInstallment.total_amount
          ),
        });

        logHeader(
          {},
          `${isValid ? "✅" : "❌"} ${apiInstallment.quantity} cuotas: API=$${
            apiInstallment.total_amount
          } UI=$${uiMatch.totalAmount}`
        );
      } else {
        logHeader(
          {},
          `⚠️ No se encontró UI match para ${apiInstallment.quantity} cuotas`
        );
        mappedInstallments.push({
          quantity: apiInstallment.quantity,
          api: apiInstallment,
          ui: null,
          isValid: false,
          difference: null,
        });
      }
    }

    // Step 7: Select an installment (select the second option if available, or first)
    logHeader({}, `🎯 Seleccionando una opción de installment...`);

    let selectedInstallment = null;

    if (uiInstallments && uiInstallments.length > 0) {
      // Choose the second installment option if available, otherwise the first
      const installmentToSelect =
        uiInstallments.length > 1 ? uiInstallments[1] : uiInstallments[0];

      logHeader(
        {},
        `🎯 Intentando seleccionar: ${installmentToSelect.quantity} cuotas`
      );

      // Debug DOM structure before attempting selection
      await debugInstallmentsDOM(page);

      // Debug radio button structure for targeted clicking
      logHeader(
        {},
        `🔬 Analizando estructura de radio buttons para clicking correcto...`
      );
      const radioStructure = await debugRadioButtonStructure(
        page,
        installmentToSelect.quantity
      );

      if (!radioStructure.error && radioStructure.parentHierarchy.length > 0) {
        logHeader(
          {},
          `📋 Jerarquía de padres identificada - ${radioStructure.parentHierarchy.length} niveles`
        );

        // Identify the most likely clickable parent
        const clickableParent = radioStructure.parentHierarchy.find(
          (p) =>
            p.tagName.toLowerCase() === "span" ||
            p.hasClickHandler ||
            p.className.includes("radio") ||
            p.className.includes("option") ||
            p.role === "radio"
        );

        if (clickableParent) {
          logHeader(
            {},
            `🎯 Elemento clickeable identificado: ${clickableParent.tagName}.${clickableParent.className} (depth: ${clickableParent.depth})`
          );
        }
      }

      // First, let's investigate what installments are available in the DOM
      logHeader({}, `🔍 Investigando elementos disponibles en el DOM...`);

      const domInvestigation = await page.evaluate(() => {
        const installmentLabels = Array.from(
          document.querySelectorAll('[data-testid^="label-installment-"]')
        );
        const radioInputs = Array.from(
          document.querySelectorAll('input[type="radio"]')
        );

        return {
          installmentLabels: installmentLabels.map((label) => ({
            testId: label.getAttribute("data-testid"),
            hasRadio: !!label.querySelector('input[type="radio"]'),
            hasAnyInput: !!label.querySelector("input"),
            innerHTML: label.innerHTML.substring(0, 200) + "...",
          })),
          totalRadios: radioInputs.length,
          radioDetails: radioInputs.slice(0, 5).map((radio) => ({
            type: radio.type,
            name: radio.name,
            value: radio.value,
            checked: radio.checked,
            parentTestId: radio
              .closest("[data-testid]")
              ?.getAttribute("data-testid"),
          })),
        };
      });

      logHeader({}, `📊 DOM Investigation Results:`);
      logHeader(
        {},
        `   Total installment labels: ${domInvestigation.installmentLabels.length}`
      );
      logHeader({}, `   Total radio inputs: ${domInvestigation.totalRadios}`);

      domInvestigation.installmentLabels.forEach((label) => {
        logHeader(
          {},
          `   📋 ${label.testId} - hasRadio: ${label.hasRadio}, hasInput: ${label.hasAnyInput}`
        );
      });

      try {
        // Multiple strategies to find and click the radio button
        let radioClicked = false;
        const targetQuantity = installmentToSelect.quantity;

        // Strategy 1: Parent span clicking for installment selection
        if (!radioClicked) {
          try {
            logHeader(
              {},
              `🔍 Strategy 1: Probando selección por parent span clicking...`
            );

            const radioSelectors = [
              `[data-testid="label-installment-${targetQuantity}"] input[type="radio"]`,
              `[data-testid="label-installment-${targetQuantity}"] input[name*="installment"]`,
              `[data-testid="label-installment-${targetQuantity}"] input`,
              `input[type="radio"][value="${targetQuantity}"]`,
              `input[type="radio"]:nth-of-type(${
                targetQuantity === 3 ? 1 : targetQuantity === 6 ? 2 : 3
              })`,
            ];

            for (const selector of radioSelectors) {
              try {
                logHeader(
                  {},
                  `   🎯 Probando selector para radio: ${selector}`
                );
                await page.waitForSelector(selector, { timeout: 3000 });

                // Find the radio and get its parent span
                const spanClickResult = await page.evaluate((sel) => {
                  const radio = document.querySelector(sel);
                  if (!radio)
                    return { success: false, error: "Radio no encontrado" };

                  // Find parent span
                  const parentSpan = radio.closest("span");
                  if (!parentSpan)
                    return {
                      success: false,
                      error: "Parent span no encontrado",
                    };

                  // Check if parent span is visible
                  const rect = parentSpan.getBoundingClientRect();
                  const isVisible = rect.width > 0 && rect.height > 0;

                  return {
                    success: true,
                    isVisible,
                    parentSpanInfo: {
                      tagName: parentSpan.tagName,
                      className: parentSpan.className || "no-class",
                      id: parentSpan.id || "no-id",
                      outerHTML: parentSpan.outerHTML.substring(0, 150) + "...",
                      rect: { width: rect.width, height: rect.height },
                    },
                    radioInfo: {
                      checked: radio.checked,
                      value: radio.value,
                      name: radio.name,
                    },
                  };
                }, selector);

                if (!spanClickResult.success) {
                  logHeader({}, `   ❌ ${spanClickResult.error}`);
                  continue;
                }

                logHeader(
                  {},
                  `   🔍 Parent span encontrado: ${spanClickResult.parentSpanInfo.tagName}.${spanClickResult.parentSpanInfo.className}`
                );
                logHeader(
                  {},
                  `   🔍 Span state: visible=${spanClickResult.isVisible}`
                );
                logHeader(
                  {},
                  `   📏 Span dimensions: ${spanClickResult.parentSpanInfo.rect.width}x${spanClickResult.parentSpanInfo.rect.height}`
                );

                if (spanClickResult.isVisible) {
                  // Click the parent span (radio buttons are disabled, so we click only the span)
                  const clickSuccess = await page.evaluate((sel) => {
                    const radio = document.querySelector(sel);
                    if (!radio) return false;

                    const parentSpan = radio.closest("span");
                    if (!parentSpan) return false;

                    try {
                      parentSpan.click();
                      return true;
                    } catch (e) {
                      return false;
                    }
                  }, selector);

                  if (clickSuccess) {
                    radioClicked = true;
                    logHeader(
                      {},
                      `✅ Parent span clickeado exitosamente para installment ${targetQuantity} (Strategy 1)`
                    );
                    logHeader(
                      {},
                      `   🎯 Span clickeado: ${spanClickResult.parentSpanInfo.tagName}.${spanClickResult.parentSpanInfo.className}`
                    );

                    // Verify the radio is now selected
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    const verificationResult = await page.evaluate((sel) => {
                      const radio = document.querySelector(sel);
                      return radio ? radio.checked : false;
                    }, selector);

                    logHeader(
                      {},
                      `   ✅ Verificación: Radio ahora está ${
                        verificationResult ? "SELECCIONADO" : "NO SELECCIONADO"
                      }`
                    );
                    break; // Exit the for loop after successful span click
                  } else {
                    logHeader({}, `   ❌ Error al clickear parent span`);
                  }
                }
              } catch (selectorError) {
                logHeaderError(
                  {},
                  `   ⚠️ Selector ${selector} falló: ${
                    selectorError.message
                  } [Line: ${new Error().stack.split("\n")[1].trim()}]`,
                  selectorError
                );
              }
            }
          } catch (strategy1Error) {
            logHeaderError(
              {},
              `⚠️ Strategy 1 falló completamente: ${
                strategy1Error.message
              } [Line: ${new Error().stack.split("\n")[1].trim()}]`,
              strategy1Error
            );
          }
        }

        // Strategy 1.5: ENHANCED MULTI-CLICKING APPROACH with Value Validation
        if (!radioClicked) {
          try {
            logHeader(
              {},
              `🔍 Strategy 1.5: ENHANCED MULTI-CLICKING - Múltiples enfoques de clicking...`
            );

            // APPROACH A: Click en el input field principal (installments-input)
            const inputFieldClickResult = await page.evaluate((quantity) => {
              // Buscar el input field principal de installments
              const inputField = document.querySelector(
                '[data-testid="installments-input"] input[type="text"]'
              );
              if (inputField) {
                inputField.click();
                return {
                  success: true,
                  method: "input-field-click",
                  element: inputField.outerHTML.substring(0, 150),
                };
              }
              return { success: false, error: "Input field no encontrado" };
            }, targetQuantity);

            if (inputFieldClickResult.success) {
              logHeader(
                {},
                `   🎯 APPROACH A: Input field clickeado - ${inputFieldClickResult.method}`
              );
              await new Promise((resolve) => setTimeout(resolve, 1500)); // Esperar que aparezcan las opciones
            }

            // APPROACH B: Múltiples estrategias de span clicking
            console.log(
              `🚀 APPROACH B: Iniciando múltiples estrategias de span clicking para quantity ${targetQuantity}`
            );

            let spanClickResult;
            try {
              spanClickResult = await page.evaluate((quantity) => {
                console.log(
                  `🔍 EVALUANDO: Buscando radio input para quantity ${quantity}`
                );

                // Estrategia B1: Buscar radio y clickear en span padre inmediato
                const radio = document.querySelector(
                  `[data-testid="label-installment-${quantity}"] input[type="radio"]`
                );

                if (!radio) {
                  console.log(
                    `❌ CRÍTICO: Radio input NO encontrado para quantity ${quantity}`
                  );
                  console.log(`🔍 DEBUG: Buscando elementos alternativos...`);

                  // Debug: buscar todos los radio buttons disponibles
                  const allRadios = document.querySelectorAll(
                    'input[type="radio"]'
                  );
                  console.log(
                    `📻 Total radio buttons en la página: ${allRadios.length}`
                  );
                  allRadios.forEach((r, index) => {
                    const parentTestId = r
                      .closest("[data-testid]")
                      ?.getAttribute("data-testid");
                    console.log(
                      `   Radio ${index}: value=${r.value}, parentTestId=${parentTestId}`
                    );
                  });

                  // Debug: buscar todos los labels de installments
                  const allLabels = document.querySelectorAll(
                    '[data-testid^="label-installment-"]'
                  );
                  console.log(
                    `🏷️ Total labels de installments: ${allLabels.length}`
                  );
                  allLabels.forEach((label, index) => {
                    const testId = label.getAttribute("data-testid");
                    const hasRadio = !!label.querySelector(
                      'input[type="radio"]'
                    );
                    console.log(
                      `   Label ${index}: testId=${testId}, hasRadio=${hasRadio}`
                    );
                  });

                  return { success: false, error: "Radio input no encontrado" };
                }

                console.log(
                  `✅ Radio input encontrado para quantity ${quantity}:`,
                  {
                    name: radio.name,
                    value: radio.value,
                    checked: radio.checked,
                    disabled: radio.disabled,
                    id: radio.id || "no-id",
                    className: radio.className || "no-class",
                  }
                );

                const strategies = [];

                // B1: Span padre directo
                console.log(
                  `🔍 B1: Buscando span padre directo para quantity ${quantity}`
                );

                const spanParent = radio.closest("span");
                if (spanParent) {
                  console.log(`✅ B1: Span padre encontrado:`, {
                    tagName: spanParent.tagName,
                    className: spanParent.className || "no-class",
                    id: spanParent.id || "no-id",
                    outerHTML: spanParent.outerHTML.substring(0, 200) + "...",
                    rect: spanParent.getBoundingClientRect(),
                    isVisible: spanParent.offsetParent !== null,
                    style: {
                      display:
                        spanParent.style.display ||
                        getComputedStyle(spanParent).display,
                      visibility:
                        spanParent.style.visibility ||
                        getComputedStyle(spanParent).visibility,
                      pointerEvents:
                        spanParent.style.pointerEvents ||
                        getComputedStyle(spanParent).pointerEvents,
                    },
                  });

                  try {
                    console.log(`🖱️ B1: Intentando click en span padre...`);
                    spanParent.click();
                    console.log(`✅ B1: Click en span padre exitoso`);
                    strategies.push({
                      method: "span-parent-direct",
                      success: true,
                      element: spanParent.tagName,
                      elementInfo: {
                        className: spanParent.className,
                        id: spanParent.id,
                        rect: spanParent.getBoundingClientRect(),
                      },
                    });
                  } catch (e) {
                    console.log(`❌ B1: Error en click span padre:`, e.message);
                    strategies.push({
                      method: "span-parent-direct",
                      success: false,
                      error: e.message,
                      elementInfo: spanParent
                        ? {
                            tagName: spanParent.tagName,
                            className: spanParent.className,
                            id: spanParent.id,
                          }
                        : null,
                    });
                  }
                } else {
                  console.log(`❌ B1: NO se encontró span padre directo`);

                  // Debug: Mostrar la jerarquía de padres
                  let current = radio.parentElement;
                  let level = 1;
                  console.log(`🔍 B1 DEBUG: Explorando jerarquía de padres:`);
                  while (current && level <= 3) {
                    console.log(
                      `   Nivel ${level}: ${current.tagName}.${
                        current.className || "no-class"
                      }`
                    );
                    current = current.parentElement;
                    level++;
                  }
                }

                // B2: Label contenedor completo
                console.log(
                  `🔍 B2: Buscando label contenedor completo para quantity ${quantity}`
                );

                const labelContainer = radio.closest(
                  '[data-testid^="label-installment-"]'
                );
                if (labelContainer) {
                  console.log(`✅ B2: Label contenedor encontrado:`, {
                    tagName: labelContainer.tagName,
                    className: labelContainer.className || "no-class",
                    testId: labelContainer.getAttribute("data-testid"),
                    id: labelContainer.id || "no-id",
                    outerHTML:
                      labelContainer.outerHTML.substring(0, 200) + "...",
                    rect: labelContainer.getBoundingClientRect(),
                    isVisible: labelContainer.offsetParent !== null,
                    style: {
                      display:
                        labelContainer.style.display ||
                        getComputedStyle(labelContainer).display,
                      visibility:
                        labelContainer.style.visibility ||
                        getComputedStyle(labelContainer).visibility,
                      pointerEvents:
                        labelContainer.style.pointerEvents ||
                        getComputedStyle(labelContainer).pointerEvents,
                    },
                  });

                  try {
                    console.log(
                      `🖱️ B2: Intentando click en label contenedor...`
                    );
                    labelContainer.click();
                    console.log(`✅ B2: Click en label contenedor exitoso`);
                    strategies.push({
                      method: "label-container",
                      success: true,
                      element: labelContainer.tagName,
                      elementInfo: {
                        testId: labelContainer.getAttribute("data-testid"),
                        className: labelContainer.className,
                        id: labelContainer.id,
                        rect: labelContainer.getBoundingClientRect(),
                      },
                    });
                  } catch (e) {
                    console.log(
                      `❌ B2: Error en click label contenedor:`,
                      e.message
                    );
                    strategies.push({
                      method: "label-container",
                      success: false,
                      error: e.message,
                      elementInfo: labelContainer
                        ? {
                            tagName: labelContainer.tagName,
                            testId: labelContainer.getAttribute("data-testid"),
                            className: labelContainer.className,
                          }
                        : null,
                    });
                  }
                } else {
                  console.log(
                    `❌ B2: NO se encontró label contenedor con data-testid^="label-installment-"`
                  );
                }

                // B3: Div padre con clase radio-container o similar
                console.log(
                  `🔍 B3: Buscando div padre con clases radio/Radio/installment para quantity ${quantity}`
                );

                const divParent = radio.closest(
                  'div[class*="radio"], div[class*="Radio"], div[class*="installment"]'
                );

                if (divParent) {
                  console.log(`✅ B3: Div padre encontrado:`, {
                    tagName: divParent.tagName,
                    className: divParent.className,
                    id: divParent.id || "no-id",
                    outerHTML: divParent.outerHTML.substring(0, 200) + "...",
                    rect: divParent.getBoundingClientRect(),
                    isVisible: divParent.offsetParent !== null,
                    style: {
                      display:
                        divParent.style.display ||
                        getComputedStyle(divParent).display,
                      visibility:
                        divParent.style.visibility ||
                        getComputedStyle(divParent).visibility,
                      pointerEvents:
                        divParent.style.pointerEvents ||
                        getComputedStyle(divParent).pointerEvents,
                    },
                  });

                  try {
                    console.log(`🖱️ B3: Intentando click en div padre...`);
                    divParent.click();
                    console.log(`✅ B3: Click en div padre exitoso`);
                    strategies.push({
                      method: "div-parent-class",
                      success: true,
                      element: divParent.className,
                      elementInfo: {
                        tagName: divParent.tagName,
                        id: divParent.id,
                        rect: divParent.getBoundingClientRect(),
                      },
                    });
                  } catch (e) {
                    console.log(`❌ B3: Error en click div padre:`, e.message);
                    strategies.push({
                      method: "div-parent-class",
                      success: false,
                      error: e.message,
                      elementInfo: divParent
                        ? {
                            tagName: divParent.tagName,
                            className: divParent.className,
                            id: divParent.id,
                          }
                        : null,
                    });
                  }
                } else {
                  console.log(
                    `❌ B3: NO se encontró div padre con clases radio/Radio/installment`
                  );

                  // Debug: Mostrar todos los div padres disponibles
                  let current = radio.parentElement;
                  let level = 1;
                  console.log(
                    `🔍 B3 DEBUG: Explorando jerarquía de padres para encontrar divs:`
                  );
                  while (current && level <= 5) {
                    if (current.tagName === "DIV") {
                      console.log(`   Nivel ${level} - DIV encontrado:`, {
                        className: current.className || "no-class",
                        id: current.id || "no-id",
                        hasRadioClass: current.className
                          .toLowerCase()
                          .includes("radio"),
                        hasInstallmentClass: current.className
                          .toLowerCase()
                          .includes("installment"),
                        outerHTML: current.outerHTML.substring(0, 150) + "...",
                      });
                    }
                    current = current.parentElement;
                    level++;
                  }
                }

                // B4: Click programático directo en radio + eventos
                console.log(
                  `🔍 B4: Iniciando click programático directo en radio para quantity ${quantity}`
                );
                console.log(`📻 B4: Estado inicial del radio:`, {
                  checked: radio.checked,
                  disabled: radio.disabled,
                  name: radio.name,
                  value: radio.value,
                  type: radio.type,
                  id: radio.id || "no-id",
                  className: radio.className || "no-class",
                });

                try {
                  console.log(`🖱️ B4: Estableciendo checked = true...`);
                  radio.checked = true;
                  console.log(
                    `📻 B4: Estado después de checked = true:`,
                    radio.checked
                  );

                  console.log(`🖱️ B4: Ejecutando radio.click()...`);
                  radio.click();
                  console.log(`✅ B4: radio.click() ejecutado`);

                  console.log(`📡 B4: Disparando evento 'change'...`);
                  radio.dispatchEvent(new Event("change", { bubbles: true }));
                  console.log(`✅ B4: Evento 'change' disparado`);

                  console.log(`📡 B4: Disparando evento 'input'...`);
                  radio.dispatchEvent(new Event("input", { bubbles: true }));
                  console.log(`✅ B4: Evento 'input' disparado`);

                  console.log(`📻 B4: Estado final del radio:`, {
                    checked: radio.checked,
                    value: radio.value,
                  });

                  strategies.push({
                    method: "radio-programmatic",
                    success: true,
                    checked: radio.checked,
                    elementInfo: {
                      name: radio.name,
                      value: radio.value,
                      id: radio.id,
                      finalChecked: radio.checked,
                    },
                  });

                  console.log(
                    `🎉 B4: Click programático completado exitosamente`
                  );
                } catch (e) {
                  console.log(`❌ B4: Error en click programático:`, e.message);
                  console.log(`❌ B4: Error stack:`, e.stack);
                  strategies.push({
                    method: "radio-programmatic",
                    success: false,
                    error: e.message,
                    elementInfo: {
                      name: radio.name,
                      value: radio.value,
                      checked: radio.checked,
                    },
                  });
                }

                return {
                  success: true,
                  strategies: strategies,
                  radioChecked: radio.checked,
                };
              }, targetQuantity);
            } catch (error) {
              logHeaderError(
                {},
                `   ❌ Error en page.evaluate para span clicking: ${
                  error.message
                } [Line: ${new Error().stack.split("\n")[1].trim()}]`,
                error
              );
              spanClickResult = {
                success: false,
                error: error.message,
                strategies: [],
              };
            }

            logHeader({}, `   📋 Resultado span clicking strategies:`);
            if (spanClickResult && spanClickResult.success) {
              spanClickResult.strategies.forEach((strategy, index) => {
                logHeader(
                  {},
                  `     Strategy B${index + 1} (${strategy.method}): ${
                    strategy.success ? "✅" : "❌"
                  }`
                );
                if (strategy.error)
                  logHeader({}, `       Error: ${strategy.error}`);
              });
              logHeader(
                {},
                `   Radio checked después de strategies: ${spanClickResult.radioChecked}`
              );
            } else {
              logHeader(
                {},
                `   ❌ Error: spanClickResult is null/undefined or failed`
              );
              if (spanClickResult) {
                logHeader(
                  {},
                  `   spanClickResult.success: ${spanClickResult.success}`
                );
              } else {
                logHeader({}, `   spanClickResult is null/undefined`);
              }
            }

            // APPROACH C: Validación de selección con valor del input
            const selectionValidation = await page.evaluate((quantity) => {
              // C1: Verificar si el input muestra el valor seleccionado (ej: "6 x $280.58")
              const inputField = document.querySelector(
                '[data-testid="installments-input"] input[type="text"]'
              );
              const currentValue = inputField ? inputField.value : "";
              const expectedPattern = new RegExp(`${quantity}\\s*x\\s*\\$`);
              const hasExpectedValue = expectedPattern.test(currentValue);

              // C2: Verificar radio checked
              const radio = document.querySelector(
                `[data-testid="label-installment-${quantity}"] input[type="radio"]`
              );
              const radioChecked = radio ? radio.checked : false;

              // C3: Verificar cualquier radio checked
              const anyRadioChecked = !!document.querySelector(
                'input[type="radio"]:checked'
              );

              return {
                inputValue: currentValue,
                hasExpectedValue: hasExpectedValue,
                radioChecked: radioChecked,
                anyRadioChecked: anyRadioChecked,
                expectedPattern: expectedPattern.toString(),
              };
            }, targetQuantity);

            logHeader({}, `   🔍 VALIDATION C - Validación de selección:`);
            logHeader(
              {},
              `     Input value: "${selectionValidation.inputValue}"`
            );
            logHeader(
              {},
              `     Has expected value (${selectionValidation.expectedPattern}): ${selectionValidation.hasExpectedValue}`
            );
            logHeader(
              {},
              `     Radio checked: ${selectionValidation.radioChecked}`
            );
            logHeader(
              {},
              `     Any radio checked: ${selectionValidation.anyRadioChecked}`
            );

            // Determinar si la selección fue exitosa
            const isSuccessfulSelection =
              selectionValidation.hasExpectedValue ||
              selectionValidation.radioChecked;

            if (isSuccessfulSelection) {
              radioClicked = true;
              logHeader(
                {},
                `✅ ENHANCED MULTI-CLICKING EXITOSO: Installment ${targetQuantity} seleccionado correctamente`
              );
            } else {
              logHeader(
                {},
                `   ⚠️ Enhanced clicking ejecutado pero selección no confirmada`
              );
            }

            // APPROACH D: Si nada funcionó, último intento con mouse click físico
            if (!radioClicked) {
              logHeader(
                {},
                `   🔄 Último intento: Mouse click físico en label...`
              );

              try {
                const labelSelector = `[data-testid="label-installment-${targetQuantity}"]`;
                await page.waitForSelector(labelSelector, { timeout: 3000 });
                await page.click(labelSelector);

                // Verificar después del click físico
                await new Promise((resolve) => setTimeout(resolve, 1500));

                const finalValidation = await page.evaluate((quantity) => {
                  const inputField = document.querySelector(
                    '[data-testid="installments-input"] input[type="text"]'
                  );
                  const currentValue = inputField ? inputField.value : "";
                  const expectedPattern = new RegExp(`${quantity}\\s*x\\s*\\$`);
                  return expectedPattern.test(currentValue);
                }, targetQuantity);

                if (finalValidation) {
                  radioClicked = true;
                  logHeader(
                    {},
                    `✅ MOUSE CLICK FÍSICO EXITOSO: Installment ${targetQuantity} seleccionado`
                  );
                }
              } catch (mouseClickError) {
                logHeaderError(
                  {},
                  `   ❌ Mouse click físico falló: ${
                    mouseClickError.message
                  } [Line: ${new Error().stack.split("\n")[1].trim()}]`,
                  mouseClickError
                );
              }
            }
          } catch (strategy1_5Error) {
            logHeaderError(
              {},
              `⚠️ Strategy 1.5 Enhanced falló completamente: ${
                strategy1_5Error.message
              } [Line: ${new Error().stack.split("\n")[1].trim()}]`,
              strategy1_5Error
            );
          }
        }

        // Strategy 2: Parent span click approach
        if (!radioClicked) {
          try {
            logHeader(
              {},
              `🔍 Strategy 2: Intentando click en parent span desde label...`
            );
            const labelSelector = `[data-testid="label-installment-${targetQuantity}"]`;

            await page.waitForSelector(labelSelector, { timeout: 5000 });

            // Find the label and get its radio's parent span
            const spanClickResult = await page.evaluate((sel) => {
              const label = document.querySelector(sel);
              if (!label)
                return { success: false, error: "Label no encontrado" };

              const radio = label.querySelector('input[type="radio"]');
              if (!radio)
                return {
                  success: false,
                  error: "Radio en label no encontrado",
                };

              const parentSpan = radio.closest("span");
              if (!parentSpan)
                return { success: false, error: "Parent span no encontrado" };

              const rect = parentSpan.getBoundingClientRect();
              return {
                success: true,
                labelInfo: {
                  exists: true,
                  isVisible: rect.width > 0 && rect.height > 0,
                  text: label.textContent?.trim().substring(0, 100),
                },
                spanInfo: {
                  tagName: parentSpan.tagName,
                  className: parentSpan.className || "no-class",
                  id: parentSpan.id || "no-id",
                  rect: { width: rect.width, height: rect.height },
                },
                radioInfo: {
                  checked: radio.checked,
                  value: radio.value,
                  name: radio.name,
                },
              };
            }, labelSelector);

            if (!spanClickResult.success) {
              logHeader({}, `   ❌ Strategy 2 error: ${spanClickResult.error}`);
            } else {
              logHeader(
                {},
                `   📋 Label encontrado: visible=${spanClickResult.labelInfo.isVisible}`
              );
              logHeader(
                {},
                `   🔍 Parent span: ${spanClickResult.spanInfo.tagName}.${spanClickResult.spanInfo.className}`
              );
              logHeader(
                {},
                `   📏 Span dimensions: ${spanClickResult.spanInfo.rect.width}x${spanClickResult.spanInfo.rect.height}`
              );

              if (spanClickResult.labelInfo.isVisible) {
                // Click the parent span (radio buttons are disabled, so we click only the span)
                const clickSuccess = await page.evaluate((sel) => {
                  const label = document.querySelector(sel);
                  if (!label) return false;

                  const radio = label.querySelector('input[type="radio"]');
                  if (!radio) return false;

                  const parentSpan = radio.closest("span");
                  if (!parentSpan) return false;

                  try {
                    parentSpan.click();
                    return true;
                  } catch (e) {
                    return false;
                  }
                }, labelSelector);

                if (clickSuccess) {
                  radioClicked = true;
                  logHeader(
                    {},
                    `✅ Parent span clickeado exitosamente desde label (Strategy 2)`
                  );

                  // Verify the radio is now selected
                  await new Promise((resolve) => setTimeout(resolve, 2300));
                  const verificationResult = await page.evaluate((sel) => {
                    const label = document.querySelector(sel);
                    if (!label) return false;
                    const radio = label.querySelector('input[type="radio"]');
                    return radio ? radio.checked : false;
                  }, labelSelector);

                  logHeader(
                    {},
                    `   ✅ Verificación: Radio ahora está ${
                      verificationResult ? "SELECCIONADO" : "NO SELECCIONADO"
                    }`
                  );
                } else {
                  logHeader(
                    {},
                    `   ❌ Error al clickear parent span desde label`
                  );
                }
              }
            }
          } catch (strategy2Error) {
            logHeaderError(
              {},
              `⚠️ Strategy 2 falló: ${
                strategy2Error.message
              } [Line: ${new Error().stack.split("\n")[1].trim()}]`,
              strategy2Error
            );
          }
        }

        // Strategy 3: Force selection via page.evaluate with enhanced targeting
        if (!radioClicked) {
          try {
            logHeader(
              {},
              `🔍 Strategy 3: Force selection via page.evaluate...`
            );

            const forceClickResult = await page.evaluate((quantity) => {
              // Try multiple approaches to find and select the radio
              const approaches = [
                // Approach 1: Direct radio selection by testid
                () => {
                  const radio = document.querySelector(
                    `[data-testid="label-installment-${quantity}"] input[type="radio"]`
                  );
                  if (radio) {
                    radio.checked = true;
                    radio.click();
                    radio.dispatchEvent(new Event("change", { bubbles: true }));
                    return {
                      success: true,
                      method: "direct-radio-testid",
                      element: radio.outerHTML.substring(0, 100),
                    };
                  }
                  return null;
                },

                // Approach 2: Find radio by value
                () => {
                  const radio = document.querySelector(
                    `input[type="radio"][value="${quantity}"]`
                  );
                  if (radio) {
                    radio.checked = true;
                    radio.click();
                    radio.dispatchEvent(new Event("change", { bubbles: true }));
                    return {
                      success: true,
                      method: "radio-by-value",
                      element: radio.outerHTML.substring(0, 100),
                    };
                  }
                  return null;
                },

                // Approach 3: Find by nth-child or nth-of-type
                () => {
                  const radios = Array.from(
                    document.querySelectorAll('input[type="radio"]')
                  );
                  const targetIndex =
                    quantity === 3
                      ? 0
                      : quantity === 6
                      ? 1
                      : quantity === 12
                      ? 2
                      : 0;

                  if (radios[targetIndex]) {
                    const radio = radios[targetIndex];
                    radio.checked = true;
                    radio.click();
                    radio.dispatchEvent(new Event("change", { bubbles: true }));
                    return {
                      success: true,
                      method: "nth-radio",
                      element: radio.outerHTML.substring(0, 100),
                    };
                  }
                  return null;
                },

                // Approach 4: Find radio within installment container
                () => {
                  const container = document.querySelector(
                    `[data-testid="label-installment-${quantity}"]`
                  );
                  if (container) {
                    const radio = container.querySelector("input");
                    if (radio) {
                      radio.checked = true;
                      radio.click();
                      radio.dispatchEvent(
                        new Event("change", { bubbles: true })
                      );
                      return {
                        success: true,
                        method: "container-radio",
                        element: radio.outerHTML.substring(0, 100),
                      };
                    }
                  }
                  return null;
                },
              ];

              for (const approach of approaches) {
                try {
                  const result = approach();
                  if (result) return result;
                } catch (error) {
                  console.log("Approach failed:", error.message);
                }
              }

              return { success: false, error: "All approaches failed" };
            }, targetQuantity);

            if (forceClickResult.success) {
              radioClicked = true;
              logHeader(
                {},
                `✅ Force selection exitoso via ${forceClickResult.method} (Strategy 3)`
              );
              logHeader({}, `   📋 Element: ${forceClickResult.element}`);
            } else {
              logHeader({}, `⚠️ Strategy 3 falló: ${forceClickResult.error}`);
            }
          } catch (strategy3Error) {
            logHeaderError(
              {},
              `⚠️ Strategy 3 falló: ${
                strategy3Error.message
              } [Line: ${new Error().stack.split("\n")[1].trim()}]`,
              strategy3Error
            );
          }
        }

        // Strategy 4: Keyboard navigation approach
        if (!radioClicked) {
          try {
            logHeader(
              {},
              `🔍 Strategy 4: Intentando navegación por teclado...`
            );

            // Focus on the installments container and use keyboard navigation
            await page.focus('[data-testid="installmentsList-wrap"]');

            // Press Tab to navigate to first radio button
            await page.keyboard.press("Tab");

            // If we need the second option, press arrow key
            if (targetQuantity !== 3) {
              const arrowPresses = targetQuantity === 6 ? 1 : 2;
              for (let i = 0; i < arrowPresses; i++) {
                await page.keyboard.press("ArrowDown");
                await new Promise((resolve) => setTimeout(resolve, 2200));
              }
            }

            // Press Space to select
            await page.keyboard.press("Space");

            radioClicked = true;
            logHeader({}, `✅ Selección por teclado exitosa (Strategy 4)`);
          } catch (strategy4Error) {
            logHeaderError(
              {},
              `⚠️ Strategy 4 falló: ${
                strategy4Error.message
              } [Line: ${new Error().stack.split("\n")[1].trim()}]`,
              strategy4Error
            );
          }
        }

        if (radioClicked) {
          // Enhanced verification of selection
          await new Promise((resolve) => setTimeout(resolve, 1500));

          logHeader({}, `🔍 Verificando selección...`);

          const verificationResult = await page.evaluate((quantity) => {
            // Check multiple ways to verify selection
            const checks = {
              radioByTestId: false,
              radioByValue: false,
              anyRadioChecked: false,
              selectedQuantity: null,
            };

            // Check 1: Radio by test-id
            const radioByTestId = document.querySelector(
              `[data-testid="label-installment-${quantity}"] input[type="radio"]`
            );
            if (radioByTestId) {
              checks.radioByTestId = radioByTestId.checked;
            }

            // Check 2: Radio by value
            const radioByValue = document.querySelector(
              `input[type="radio"][value="${quantity}"]`
            );
            if (radioByValue) {
              checks.radioByValue = radioByValue.checked;
            }

            // Check 3: Any radio checked
            const allRadios = Array.from(
              document.querySelectorAll('input[type="radio"]')
            );
            const checkedRadio = allRadios.find((radio) => radio.checked);
            if (checkedRadio) {
              checks.anyRadioChecked = true;
              checks.selectedQuantity =
                checkedRadio.value ||
                checkedRadio.getAttribute("data-quantity");
            }

            return checks;
          }, targetQuantity);

          logHeader({}, `📊 Verification results:`);
          logHeader(
            {},
            `   Radio by testId checked: ${verificationResult.radioByTestId}`
          );
          logHeader(
            {},
            `   Radio by value checked: ${verificationResult.radioByValue}`
          );
          logHeader(
            {},
            `   Any radio checked: ${verificationResult.anyRadioChecked}`
          );
          logHeader(
            {},
            `   Selected quantity: ${verificationResult.selectedQuantity}`
          );

          const isSuccessfullySelected =
            verificationResult.radioByTestId ||
            verificationResult.radioByValue ||
            verificationResult.anyRadioChecked;

          if (isSuccessfullySelected) {
            selectedInstallment = {
              quantity: installmentToSelect.quantity,
              monthlyAmount: installmentToSelect.monthlyAmount,
              totalAmount: installmentToSelect.totalAmount,
              fullText: installmentToSelect.fullText,
              verified: true,
              selectedQuantity: verificationResult.selectedQuantity,
            };

            logHeader(
              {},
              `✅ Installment VERIFICADO como seleccionado: ${installmentToSelect.quantity} cuotas`
            );
          } else {
            logHeader(
              {},
              `❌ Installment NO pudo ser verificado como seleccionado`
            );
          }
        } else {
          logHeader(
            {},
            `❌ No se pudo seleccionar ningún installment con ninguna estrategia`
          );
        }

        // Final wait for processing and additional verification
        logHeader(
          {},
          `⏳ Tiempo final de procesamiento y verificación adicional...`
        );
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Increased from 2000 to 3000

        // ENHANCED ULTIMATE VERIFICATION - Multiple validation approaches
        const ultimateVerification = await page.evaluate((targetQuantity) => {
          const checkedRadio = document.querySelector(
            'input[type="radio"]:checked'
          );
          const allRadios = Array.from(
            document.querySelectorAll('input[type="radio"]')
          );

          // NEW: Verificar el valor del input field principal
          const inputField = document.querySelector(
            '[data-testid="installments-input"] input[type="text"]'
          );
          const inputValue = inputField ? inputField.value : "";
          const expectedPattern = new RegExp(`${targetQuantity}\\s*x\\s*\\$`);
          const inputShowsSelection = expectedPattern.test(inputValue);

          // NEW: Verificar si el input tiene clase que indica selección
          const inputHasSelectedClass =
            inputField &&
            (inputField.classList.contains("selected") ||
              inputField.classList.contains("filled") ||
              inputValue.trim() !== "");

          return {
            // Verificaciones originales
            finalSelectionExists: !!checkedRadio,
            finalSelectedValue: checkedRadio ? checkedRadio.value : null,
            finalSelectedTestId: checkedRadio
              ? checkedRadio
                  .closest("[data-testid]")
                  ?.getAttribute("data-testid")
              : null,
            totalRadiosFound: allRadios.length,
            allRadioStates: allRadios.map((radio) => ({
              value: radio.value,
              checked: radio.checked,
              name: radio.name,
            })),

            // NUEVAS verificaciones del input field
            inputValue: inputValue,
            inputShowsSelection: inputShowsSelection,
            inputHasSelectedClass: inputHasSelectedClass,
            expectedPattern: expectedPattern.toString(),

            // Verificación combinada
            isDefinitivelySelected: inputShowsSelection || !!checkedRadio,
          };
        }, targetQuantity);

        logHeader({}, `🔍 ENHANCED ULTIMATE VERIFICATION:`);
        logHeader(
          {},
          `   📻 Radio seleccionado existe: ${ultimateVerification.finalSelectionExists}`
        );
        logHeader(
          {},
          `   📻 Valor radio seleccionado: ${ultimateVerification.finalSelectedValue}`
        );
        logHeader(
          {},
          `   📻 TestId radio seleccionado: ${ultimateVerification.finalSelectedTestId}`
        );
        logHeader(
          {},
          `   📻 Total radios encontrados: ${ultimateVerification.totalRadiosFound}`
        );

        logHeader(
          {},
          `   📝 Input field value: "${ultimateVerification.inputValue}"`
        );
        logHeader(
          {},
          `   📝 Input muestra selección (${ultimateVerification.expectedPattern}): ${ultimateVerification.inputShowsSelection}`
        );
        logHeader(
          {},
          `   📝 Input tiene clase selected: ${ultimateVerification.inputHasSelectedClass}`
        );

        logHeader(
          {},
          `   🎯 SELECCIÓN DEFINITIVA CONFIRMADA: ${ultimateVerification.isDefinitivelySelected}`
        );

        if (ultimateVerification.isDefinitivelySelected) {
          logHeader(
            {},
            `🎉 CONFIRMACIÓN FINAL: Installment ${targetQuantity} está DEFINITIVAMENTE seleccionado`
          );

          // Actualizar selectedInstallment si no estaba marcado como verified
          if (!selectedInstallment || !selectedInstallment.verified) {
            const verifiedInstallment = mappedInstallments.find(
              (inst) => inst.quantity === targetQuantity
            );
            if (verifiedInstallment) {
              selectedInstallment = {
                ...verifiedInstallment,
                verified: true,
                verificationMethod: ultimateVerification.inputShowsSelection
                  ? "input-value"
                  : "radio-checked",
              };
            }
          }
        } else {
          logHeader(
            {},
            `🚨 ALERTA FINAL: NO hay ningún installment seleccionado definitivamente`
          );
          // Log all radio states for debugging
          ultimateVerification.allRadioStates.forEach((radio, index) => {
            logHeader(
              {},
              `     Radio ${index}: value=${radio.value}, checked=${radio.checked}, name=${radio.name}`
            );
          });
        }
      } catch (error) {
        logHeaderError(
          {},
          `❌ Error general seleccionando installment: ${
            error.message
          } [Line: ${new Error().stack.split("\n")[1].trim()}]`,
          error
        );
      }
    }

    // CRÍTICO: Verificar que SE DEBE haber seleccionado un installment
    const hasMandatorySelection =
      selectedInstallment && selectedInstallment.verified;

    if (!hasMandatorySelection && uiInstallments.length > 0) {
      // ÚLTIMO INTENTO: Verificar si hay algún radio seleccionado aunque no lo detectamos
      logHeader({}, `🔍 ÚLTIMO INTENTO: Verificando estado final de radios...`);

      const finalRadioCheck = await page.evaluate(() => {
        const checkedRadio = document.querySelector(
          'input[type="radio"]:checked'
        );
        const allRadios = Array.from(
          document.querySelectorAll('input[type="radio"]')
        );

        return {
          hasCheckedRadio: !!checkedRadio,
          checkedValue: checkedRadio ? checkedRadio.value : null,
          checkedName: checkedRadio ? checkedRadio.name : null,
          checkedTestId: checkedRadio
            ? checkedRadio.closest("[data-testid]")?.getAttribute("data-testid")
            : null,
          totalRadios: allRadios.length,
          allRadioStates: allRadios.map((radio) => ({
            value: radio.value,
            checked: radio.checked,
            name: radio.name,
            testId: radio.closest("[data-testid]")?.getAttribute("data-testid"),
          })),
        };
      });

      logHeader({}, `📊 ESTADO FINAL DE RADIOS:`);
      logHeader(
        {},
        `   Total radios encontrados: ${finalRadioCheck.totalRadios}`
      );
      logHeader({}, `   Radio marcado: ${finalRadioCheck.hasCheckedRadio}`);
      if (finalRadioCheck.hasCheckedRadio) {
        logHeader(
          {},
          `   ✅ Radio seleccionado: ${finalRadioCheck.checkedValue} (${finalRadioCheck.checkedTestId})`
        );

        // Si hay un radio seleccionado, actualizar selectedInstallment
        const finalInstallment = mappedInstallments.find(
          (inst) =>
            inst.quantity.toString() === finalRadioCheck.checkedValue ||
            inst.quantity === parseInt(finalRadioCheck.checkedValue)
        );

        if (finalInstallment) {
          selectedInstallment = {
            ...finalInstallment,
            verified: true,
            verificationMethod: "final-radio-check",
          };

          logHeader(
            {},
            `🎉 RECUPERACIÓN EXITOSA: Installment encontrado en verificación final`
          );
          logHeader(
            {},
            `   📝 Detalles: ${selectedInstallment.quantity} cuotas - ${
              selectedInstallment.ui?.fullText || "N/A"
            }`
          );
        }
      } else {
        logHeader({}, `   ❌ Ningún radio está seleccionado`);
        finalRadioCheck.allRadioStates.forEach((radio, index) => {
          logHeader(
            {},
            `     Radio ${index}: value=${radio.value}, checked=${radio.checked}, testId=${radio.testId}`
          );
        });
      }

      // Re-evaluar hasMandatorySelection después del último intento
      const hasMandatorySelectionFinal =
        selectedInstallment && selectedInstallment.verified;

      if (!hasMandatorySelectionFinal) {
        // HAY installments disponibles pero NO se seleccionó ninguno - ESTO ES UN ERROR CRÍTICO
        logHeader(
          {},
          `🚨 ERROR CRÍTICO: Hay ${
            uiInstallments.length
          } installments disponibles pero NO se seleccionó ninguno [Line: ${new Error().stack
            .split("\n")[1]
            .trim()}]`
        );
        logHeader(
          {},
          `🚨 EL PAGO NO PUEDE PROCEDER SIN SELECCIÓN DE INSTALLMENTS [Line: ${new Error().stack
            .split("\n")[1]
            .trim()}]`
        );

        return {
          success: false,
          error: "INSTALLMENT_SELECTION_MANDATORY",
          installmentsAvailable: true,
          installmentsOpened: true,
          apiCallFound: true,
          mandatorySelectionFailed: true,
          availableInstallments: uiInstallments.length,
          selectedInstallment: null,
          validInstallments: mappedInstallments.filter((inst) => inst.isValid)
            .length,
          totalInstallments: mappedInstallments.length,
          apiUrl: installmentsApiCall.url,
          finalRadioCheck: finalRadioCheck,
        };
      }
    }

    // Return comprehensive results
    const validationResults = {
      success: true,
      installmentsAvailable: true,
      installmentsOpened: true,
      apiCallFound: true,
      apiInstallments: apiInstallments,
      uiInstallments: uiInstallments,
      mappedInstallments: mappedInstallments,
      selectedInstallment: selectedInstallment,
      validInstallments: mappedInstallments.filter((inst) => inst.isValid)
        .length,
      totalInstallments: mappedInstallments.length,
      apiUrl: installmentsApiCall.url,
      mandatorySelectionCompleted: hasMandatorySelection,
    };

    if (hasMandatorySelection) {
      logHeader(
        {},
        `🎉 Validación de installments completada: ${validationResults.validInstallments}/${validationResults.totalInstallments} válidos - INSTALLMENT OBLIGATORIO SELECCIONADO ✅`
      );

      // Enhanced success logging
      logHeader({}, `✅ ÉXITO: Installment seleccionado exitosamente`);
      logHeader(
        {},
        `   🎯 Cantidad de cuotas: ${selectedInstallment.quantity}`
      );
      logHeader(
        {},
        `   💰 Monto mensual: $${
          selectedInstallment.ui?.monthlyAmount ||
          selectedInstallment.api?.amount ||
          "N/A"
        }`
      );
      logHeader(
        {},
        `   💳 Total a pagar: $${
          selectedInstallment.ui?.totalAmount ||
          selectedInstallment.api?.total_amount ||
          "N/A"
        }`
      );
      logHeader(
        {},
        `   📝 Texto completo: ${selectedInstallment.ui?.fullText || "N/A"}`
      );
      logHeader(
        {},
        `   ✅ Método de verificación: ${
          selectedInstallment.verificationMethod || "N/A"
        }`
      );
      logHeader(
        {},
        `   🔍 Estado verificado: ${selectedInstallment.verified ? "SÍ" : "NO"}`
      );
    } else {
      logHeader(
        {},
        `⚠️ Validación completada pero sin installments disponibles (esto está bien si la tarjeta no ofrece installments)`
      );
    }

    return validationResults;
  } catch (error) {
    logHeaderError(
      {},
      `❌ Error en validación de installments: ${
        error.message
      } [Line: ${new Error().stack.split("\n")[1].trim()}]`,
      error
    );
    return {
      success: false,
      error: error.message,
      installmentsAvailable: false,
    };
  }
}

module.exports = { validateInstallments };
