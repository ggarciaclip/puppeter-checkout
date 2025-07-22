const cashStores = require("../enums/cashStores-elements.json");
const { logHeader, logHeaderError } = require("../lib/logger");

/**
 * Handle cash payment flow after clicking pay button
 * @param {Object} page - Puppeteer page object
 * @param {string} testCaseId - Test case ID for logging
 */
async function handleCashPaymentFlow(page, testCaseId) {
  try {
    logHeader({}, `💵 Iniciando flujo de pago en efectivo: ${testCaseId}`);

    // Wait for store selector page to load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Validate that all store selectors are present
    logHeader(
      {},
      `🏪 Validando selectores de tiendas disponibles: ${testCaseId}`
    );

    const availableStores = [];
    const missingStores = [];

    for (const store of cashStores) {
      try {
        const element = await page.$(store.clickableElementSelector);
        if (element) {
          availableStores.push(store.name);
          logHeader({}, `✅ Tienda disponible: ${store.name}`);
        } else {
          missingStores.push(store.name);
          logHeader({}, `❌ Tienda no encontrada: ${store.name}`);
        }
      } catch (error) {
        missingStores.push(store.name);
        logHeader(
          {},
          `⚠️ Error validando tienda ${store.name}: ${error.message}`
        );
      }
    }

    logHeader({}, `📊 Resumen de validación:`);
    logHeader({}, `   ✅ Tiendas disponibles: ${availableStores.length}`);
    logHeader({}, `   ❌ Tiendas faltantes: ${missingStores.length}`);

    if (availableStores.length === 0) {
      throw new Error(
        "No se encontraron tiendas disponibles para pago en efectivo"
      );
    }

    // Click on the first available store (OXXO)
    const firstStore = cashStores.find((store) =>
      availableStores.includes(store.name)
    );
    logHeader({}, `🎯 Seleccionando primera tienda: ${firstStore.name}`);

    await page.click(firstStore.clickableElementSelector);
    logHeader({}, `✅ Click realizado en: ${firstStore.name}`);

    // Wait for page to load after store selection
    logHeader(
      {},
      `⏳ Esperando carga de página después de seleccionar tienda...`
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verify that barcode SVG exists
    logHeader({}, `🔍 Verificando existencia del código de barras...`);

    try {
      await page.waitForSelector("#barcodeImage", { timeout: 10000 });
      logHeader({}, `✅ Código de barras encontrado: #barcodeImage`);

      // Take screenshot of the barcode page
      logHeader({}, `📸 Capturando screenshot de página con código de barras`);
    } catch (barcodeError) {
      logHeader(
        {},
        `❌ Error: Código de barras no encontrado - ${barcodeError.message}`
      );
      throw new Error(
        `Código de barras no encontrado: ${barcodeError.message}`
      );
    }

    logHeader(
      {},
      `🎉 Flujo de pago en efectivo completado exitosamente: ${testCaseId}`
    );
  } catch (error) {
    logHeaderError(
      {},
      `❌ Error en flujo de pago en efectivo: ${error.message}`,
      error
    );
    throw error;
  }
}

module.exports = { handleCashPaymentFlow };
