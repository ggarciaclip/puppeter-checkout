/**
 * Script para probar las correcciones de installments y screenshot timing
 * Este script ejecuta una prueba específica para verificar:
 * 1. La validación de installments funciona correctamente
 * 2. El screenshot se toma después de la selección de installments
 * 3. Los logs muestran información detallada del éxito
 */

const { Cluster } = require("puppeteer-cluster");
const { taskCheckoutPay } = require("./src/runner/clusterTask");
const { getFormattedDateTime } = require("./src/lib/date_utils");

// Configuración de prueba
const TEST_CONFIG = {
  // Usar una tarjeta que sabemos tiene installments
  email: "test.installments@example.com",
  card: "4000000000000002", // Visa test card
  phone: "5512345678",
  payment_request_id: "test_installments_" + Date.now(),
  payment_flow_type: "GUEST",
  payment_request_type: "LINK_DE_PAGO",
  payment_type: "CARD",
};

async function testInstallmentsFix() {
  const startTime = Date.now();
  console.log(
    `🚀 Iniciando prueba de corrección de installments: ${getFormattedDateTime()}`
  );

  let cluster = null;

  try {
    // Configurar cluster con una sola instancia para debugging
    cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT,
      maxConcurrency: 1,
      puppeteerOptions: {
        headless: false, // Modo visible para debugging
        defaultViewport: { width: 1280, height: 1080 },
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      },
      timeout: 60000,
      retryLimit: 0,
    });

    console.log("📱 Cluster inicializado, ejecutando prueba...");

    // Crear data de prueba
    const testData = {
      test_case_id: `INSTALLMENTS_FIX_TEST_${Date.now()}`,
      ...TEST_CONFIG,
      request_log_list: [],
      i: 0,
    };

    const test_run_id = getFormattedDateTime().replace(/[:.]/g, "_");
    const results_run = [];

    // Definir la tarea
    cluster.task(async ({ page, data }) => {
      return await taskCheckoutPay(page, data, test_run_id, results_run);
    });

    console.log(
      `🔄 Ejecutando prueba con test_case_id: ${testData.test_case_id}`
    );

    // Ejecutar la prueba
    await cluster.execute(testData);

    console.log("✅ Prueba completada exitosamente");

    // Mostrar resultados
    console.log("\n📊 RESULTADOS DE LA PRUEBA:");
    console.log(
      `   ⏱️  Duración: ${((Date.now() - startTime) / 1000).toFixed(2)}s`
    );
    console.log(`   📁 Test Case ID: ${testData.test_case_id}`);
    console.log(`   🎯 Payment Request ID: ${testData.payment_request_id}`);

    if (results_run.length > 0) {
      const result = results_run[0];
      console.log(`   📋 Estado final: ${result[9]}`); // status is at index 9
      console.log(`   💳 Tarjeta usada: ${result[1]}`);
      console.log(`   💰 Monto: ${result[6]}`);
    }

    console.log("\n🔍 VERIFICACIÓN MANUAL REQUERIDA:");
    console.log("   1. ¿Se seleccionó un installment exitosamente?");
    console.log(
      "   2. ¿El screenshot 'form-page-fill.png' muestra el installment seleccionado?"
    );
    console.log(
      "   3. ¿Los logs muestran información detallada del installment seleccionado?"
    );
    console.log("   4. ¿No hay errores de 'INSTALLMENT_SELECTION_MANDATORY'?");
  } catch (error) {
    console.error("❌ Error durante la prueba:", error);

    // Mostrar información del error para debugging
    console.error("\n🔍 INFORMACIÓN DE ERROR:");
    console.error(`   📝 Mensaje: ${error.message}`);
    console.error(`   📍 Tipo: ${error.name}`);

    if (error.message.includes("INSTALLMENT_SELECTION_MANDATORY")) {
      console.error("\n🚨 ERROR ESPECÍFICO DE INSTALLMENTS:");
      console.error("   - La validación de installments aún está fallando");
      console.error(
        "   - Revisar los logs detallados en la carpeta de test results"
      );
      console.error(
        "   - Verificar que los selectores de installments sean correctos"
      );
    }

    throw error;
  } finally {
    if (cluster) {
      await cluster.close();
      console.log("🧹 Cluster cerrado");
    }
  }
}

// Ejecutar la prueba
if (require.main === module) {
  testInstallmentsFix()
    .then(() => {
      console.log("\n🎉 ¡Prueba de installments completada!");
      console.log(
        "📁 Revisa los archivos generados en completed_tests/ para verificar:"
      );
      console.log(
        "   - form-page-fill.png (debe mostrar installment seleccionado)"
      );
      console.log(
        "   - logs.txt (debe contener información detallada del éxito)"
      );
      console.log("   - success-pay-page.png (si el pago fue exitoso)");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Prueba falló:", error.message);
      process.exit(1);
    });
}

module.exports = { testInstallmentsFix };
