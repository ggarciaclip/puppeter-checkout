#!/usr/bin/env node

/**
 * Script para probar la funcionalidad del dashboard
 * Genera datos de prueba simulados y luego crea el dashboard
 */

const fs = require("fs");
const path = require("path");
const { DashboardGenerator } = require("./src/lib/dashboardGenerator");

async function createTestData() {
  console.log("🔄 Creando datos de prueba simulados...");

  const testDataDir = path.join(process.cwd(), "completed_tests", "test_runs");

  // Crear estructura de directorios de prueba
  const testStructure = [
    {
      paymentType: "DEV-link_de_pago",
      runId: "01_15_14.30.45",
      testCases: [
        {
          id: "GUEST_MXN_SUCCESS",
          files: [
            "success-pay-page.png",
            "form-page-fill.png",
            "logs.txt",
            "logs.json",
            "test-execution.mp4",
          ],
        },
        {
          id: "REGISTER_USD_ERROR",
          files: ["error-ocurred.png", "logs.txt", "logs.json"],
        },
      ],
    },
    {
      paymentType: "DEV-hosted_checkout",
      runId: "01_15_15.45.30",
      testCases: [
        {
          id: "GUEST_MXN_INSTALLMENTS",
          files: [
            "success-pay-page.png",
            "form-page-fill.png",
            "installments-selection.png",
            "logs.txt",
            "logs.json",
            "test-execution.mp4",
          ],
        },
      ],
    },
  ];

  for (const structure of testStructure) {
    const paymentDir = path.join(testDataDir, structure.paymentType);
    const runDir = path.join(paymentDir, structure.runId);

    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    for (const testCase of structure.testCases) {
      const testCaseDir = path.join(runDir, testCase.id);

      if (!fs.existsSync(testCaseDir)) {
        fs.mkdirSync(testCaseDir, { recursive: true });
      }

      // Crear archivos de prueba
      for (const file of testCase.files) {
        const filePath = path.join(testCaseDir, file);

        if (file.endsWith(".txt")) {
          // Logs de texto simulados
          const logs = `
💳 Iniciando validación de installments: ${testCase.id}
✅ Selector de installments encontrado
🖱️ Haciendo click en el selector de installments...
📋 Esperando que aparezca la lista de installments...
✅ Lista de installments encontrada
🔍 Buscando llamada a API de installments...
✅ Llamada a API de installments encontrada
📊 Se encontraron 3 installments en la respuesta de la API
🏷️ Extrayendo installments de los labels en la UI...
🔄 Mapeando installments de API con UI...
✅ 3 cuotas: API=$1683.48 UI=$1683.48
✅ 6 cuotas: API=$3366.96 UI=$3366.96
✅ 12 cuotas: API=$6733.92 UI=$6733.92
🎯 Seleccionando una opción de installment...
🎯 Intentando seleccionar: 6 cuotas
✅ Parent span clickeado exitosamente para installment 6 (Strategy 1)
✅ Verificación: Radio ahora está SELECCIONADO
🎉 Validación de installments completada: 3/3 válidos - INSTALLMENT OBLIGATORIO SELECCIONADO ✅
✅ ÉXITO: Installment seleccionado exitosamente
🎯 Cantidad de cuotas: 6
💰 Monto mensual: $280.58
💳 Total a pagar: $1683.48
📝 Texto completo: 6 x $280.58 (+$0.00)
✅ Método de verificación: input-value
🔍 Estado verificado: SÍ
📸 Saving screenshot for form page fill (post-installments): ${testCase.id}
📊 ESTADO FINAL DE INSTALLMENTS para screenshot:
✅ Radio seleccionado: true
🎯 Installment confirmado: 6 (label-installment-6)
📝 Input value: 6 x $280.58
💳 Clicking Pay Button: ${testCase.id}
⏳ Waiting for payment transition: ${testCase.id}
💰 Processing payment success: ${testCase.id}
🎉 Saving screenshot for success pay page: ${testCase.id}
✅ Success screenshot saved: ${testCase.id}
💾 Verificando y guardando datos de usuario exitoso: ${testCase.id}
📝 Save logs: ${testCase.id}
💾 Write JSON Logs results: ${testCase.id}
          `.trim();
          fs.writeFileSync(filePath, logs);
        } else if (file.endsWith(".json")) {
          // Logs JSON simulados
          const jsonLogs = {
            testCaseId: testCase.id,
            timestamp: new Date().toISOString(),
            requests: [
              {
                url: "https://api.payclip.com/api/installments",
                method: "GET",
                statusCode: 200,
                response: {
                  installments: [
                    {
                      quantity: 3,
                      amount: 561.16,
                      fee: 0,
                      total_amount: 1683.48,
                    },
                    {
                      quantity: 6,
                      amount: 280.58,
                      fee: 0,
                      total_amount: 1683.48,
                    },
                    {
                      quantity: 12,
                      amount: 140.29,
                      fee: 0,
                      total_amount: 1683.48,
                    },
                  ],
                },
              },
              {
                url: "https://api.payclip.com/api/payments",
                method: "POST",
                statusCode: 200,
                response: {
                  status: "approved",
                  payment_id: "pay_test_12345",
                },
              },
            ],
            installmentValidation: {
              success: true,
              selectedInstallment: {
                quantity: 6,
                monthlyAmount: 280.58,
                totalAmount: 1683.48,
                verified: true,
              },
            },
          };
          fs.writeFileSync(filePath, JSON.stringify(jsonLogs, null, 2));
        } else if (file.endsWith(".png")) {
          // Crear archivos PNG vacíos (simulados)
          fs.writeFileSync(filePath, Buffer.alloc(1000, 0x89)); // PNG header simulado
        } else if (file.endsWith(".mp4")) {
          // Crear archivos MP4 vacíos (simulados)
          fs.writeFileSync(filePath, Buffer.alloc(5000, 0x00)); // Video simulado
        }
      }
    }
  }

  console.log("✅ Datos de prueba creados exitosamente");
}

async function testDashboard() {
  try {
    console.log("🧪 Iniciando prueba del dashboard...");

    // Crear datos de prueba
    await createTestData();

    // Generar dashboard
    console.log("\n🔄 Generando dashboard...");
    const dashboardGenerator = new DashboardGenerator();
    const dashboardPath = await dashboardGenerator.generate();

    console.log("\n" + "=".repeat(80));
    console.log("🎉 PRUEBA DEL DASHBOARD COMPLETADA");
    console.log("=".repeat(80));
    console.log(`📊 Dashboard de prueba disponible en:`);
    console.log(`🌐 file://${dashboardPath}`);
    console.log(
      `\n📁 También puedes abrir: completed_tests/dashboard/index.html`
    );
    console.log("=".repeat(80));
    console.log("\n✨ CARACTERÍSTICAS DEL DASHBOARD:");
    console.log("   🔍 Filtros por tipo de pago y estado");
    console.log("   📊 Estadísticas generales");
    console.log("   📋 Lista expandible de test runs");
    console.log("   📄 Visualización de logs (texto y JSON)");
    console.log("   📸 Galería de screenshots");
    console.log("   🎥 Reproductor de videos");
    console.log("   📱 Diseño responsivo");
    console.log("=".repeat(80));

    // Intentar abrir automáticamente en macOS
    if (process.platform === "darwin") {
      const { spawn } = require("child_process");
      spawn("open", [dashboardPath], { detached: true, stdio: "ignore" });
      console.log("🚀 Abriendo dashboard automáticamente...");
    } else {
      console.log(
        "💡 Para abrir el dashboard, copia y pega la URL en tu navegador"
      );
    }
  } catch (error) {
    console.error("❌ Error en la prueba del dashboard:", error);
    throw error;
  }
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
  testDashboard()
    .then(() => {
      console.log("\n🎉 Prueba del dashboard completada exitosamente");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Error en la prueba:", error.message);
      process.exit(1);
    });
}

module.exports = { testDashboard, createTestData };
