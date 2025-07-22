const { Cluster } = require("puppeteer-cluster");
const { readSheet } = require("../src/lib/excel_utils");
const {
  mappingTypeWithParameters,
} = require("../src/lib/mappingTypeToParameters");
const { validateParameters } = require("../src/validations/validateParameters");
const {
  filterParameters,
  noPresentTypeInFilters,
} = require("../src/runner/filterParameters");
const { PAYMENT_REQUEST_TYPES } = require("../src/enums/paymentFlowTypes");
const { taskCheckoutPay } = require("../src/runner/clusterTask");
const {
  generateTestRunId,
  generateRandomEmail,
} = require("../src/lib/parameterUtils");
const { createDirectory } = require("../src/lib/fs_utils");
const { generateSheet } = require("../src/lib/excel_utils");
const { logHeader, logStart } = require("../src/lib/logger");
const { createCheckouts } = require("../src/runner/checkoutCreator");
const { DashboardGenerator } = require("../src/lib/dashboardGenerator");
const mlog = require("mocha-logger");
var expect = require("expect.js");

require("dotenv").config();

const env = (process.env.ENV || "dev").toLowerCase();
const PARAMETERS_SHEET_NAME = `parameters_${env}.xlsx`;
const FILTER_OPTIONS = [
  { key: "JUST", value: process.env.JUST },
  { key: "TYPE", value: process.env.TYPE },
];

describe("Buyer Checkout Testing Payments", () => {
  let PARAMETERS_MAP;
  let cluster;
  let activeTasks = 0; // ✅ Contador de tareas activas

  before(async () => {
    const buffer = readSheet(PARAMETERS_SHEET_NAME);
    PARAMETERS_MAP = mappingTypeWithParameters(buffer);
    validateParameters(PARAMETERS_MAP);
    mlog.log(
      "Filter options => ",
      JSON.stringify(FILTER_OPTIONS.filter((v) => v.value))
    );

    cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT,
      maxConcurrency: 4,
    });
  });

  after(async () => {
    // ✅ AGREGAR: Verificar contador antes de cerrar
    while (activeTasks > 0) {
      console.log(`⏳ After hook esperando ${activeTasks} tareas activas...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    await cluster.idle();
    await cluster.close();
    console.log("🎉 Cluster cerrado después de completar todas las tareas");

    // 📊 GENERAR DASHBOARD
    try {
      console.log("\n🔄 Generando dashboard interactivo...");
      const dashboardGenerator = new DashboardGenerator();
      const dashboardPath = await dashboardGenerator.generate();

      console.log("\n" + "=".repeat(80));
      console.log("🎉 TODAS LAS PRUEBAS COMPLETADAS");
      console.log("=".repeat(80));
      console.log(`📊 Dashboard disponible en:`);
      console.log(`🌐 file://${dashboardPath}`);
      console.log(
        `\n📁 También puedes abrir: completed_tests/dashboard/index.html`
      );
      console.log("=".repeat(80));

      // Intentar abrir automáticamente el dashboard
      if (process.platform === "darwin") {
        const { spawn } = require("child_process");
        spawn("open", [dashboardPath], { detached: true, stdio: "ignore" });
        console.log("🚀 Abriendo dashboard automáticamente...");
      }
    } catch (dashboardError) {
      console.error("❌ Error generando dashboard:", dashboardError.message);
    }
  });

  const runTest = async (paymentType, createCheckout = false) => {
    const results_run = [];
    let test_run_id;
    let isSkipped = false;
    let hasParameters = true;

    try {
      if (noPresentTypeInFilters(FILTER_OPTIONS, paymentType)) {
        console.log(`Skip ${paymentType} tests`);
        isSkipped = true;
        expect(true).to.be(true);
        return;
      }

      logStart(paymentType);

      let parametersFromSheet = filterParameters(
        PARAMETERS_MAP.get(paymentType),
        FILTER_OPTIONS
      );

      if (!parametersFromSheet || parametersFromSheet.length === 0) {
        mlog.log(`No test cases parameters found for ${paymentType}`);
        hasParameters = false;
        return;
      }

      if (createCheckout) {
        //Create Multiple Hosted Checkouts
        parametersFromSheet = await createCheckouts(parametersFromSheet, env);
      }

      test_run_id = generateTestRunId(paymentType);
      await createDirectory(
        `completed_tests/test_runs/${env.toUpperCase()}-${paymentType.toLowerCase()}`,
        test_run_id
      );

      await cluster.task(async ({ page, data }) => {
        try {
          await taskCheckoutPay(page, data, test_run_id, results_run);
        } finally {
          // ✅ AGREGAR: Decrementar al terminar cada tarea
          activeTasks--;
          console.log(`✅ Tarea completada. Tareas restantes: ${activeTasks}`);
        }
      });

      const parameters = parametersFromSheet.map((data, i) => ({
        test_case_id: data.testCaseName,
        card: data.cardNumber,
        email: data.email,
        phone: data.phone,
        payment_request_id: data.prId,
        payment_request_type: data.prType,
        payment_flow_type: data.paymentFlow,
        payment_type: data.paymentType || "CARD", // Add payment type with default
        request_log_list: [],
        i,
      }));

      // ✅ AGREGAR: Incrementar contador
      activeTasks += parameters.length;
      console.log(
        `🚀 Iniciando ${parameters.length} tareas. Total activas: ${activeTasks}`
      );

      await Promise.allSettled(parameters.map((p) => cluster.execute(p)));

      // ✅ AGREGAR: Esperar a que el contador llegue a 0
      while (activeTasks > 0) {
        console.log(`⏳ Esperando ${activeTasks} tareas restantes...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSkipped && hasParameters) {
        logHeader({}, `📊 Write Excel results: ${test_run_id}`);
        generateSheet(
          results_run,
          `/completed_tests/test_runs/${env.toUpperCase()}-${paymentType.toLowerCase()}/${test_run_id}/${test_run_id}`
        );
      }
    }
  };
  //que filtre por el IT npm run test

  it("Pay Link de Pago", async () => {
    await runTest(PAYMENT_REQUEST_TYPES.LINK_DE_PAGO);
  });

  it("Create and Pay Hosted Checkout", async () => {
    const CreateHXOCheckouts = true;
    await runTest(PAYMENT_REQUEST_TYPES.HOSTED_CHECKOUT, CreateHXOCheckouts);
  });

  it("Create and Pay Subscription", async () => {
    await runTest(PAYMENT_REQUEST_TYPES.SUBSCRIPTION);
  });
});
