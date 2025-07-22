// Test script para verificar que los logs se aíslan correctamente por test case
const {
  initializeFileLogging,
  addLogEntry,
  saveLogsToFile,
  getActiveTestCaseIds,
} = require("./src/lib/fileLogger");

console.log("🧪 Testando aislamiento de logs por test case...\n");

// Simular múltiples test cases
const testCase1 = "TEST_CASE_001";
const testCase2 = "TEST_CASE_002";

// Inicializar test cases
console.log("📝 Inicializando test cases...");
initializeFileLogging(testCase1, `/tmp/test1`);
initializeFileLogging(testCase2, `/tmp/test2`);

console.log("🔍 Test cases activos:", getActiveTestCaseIds());

// Agregar logs específicos a cada test case
console.log("\n📋 Agregando logs específicos...");
addLogEntry(
  "Log específico para TEST_CASE_001 - Email",
  "INFO",
  null,
  testCase1
);
addLogEntry(
  "Log específico para TEST_CASE_002 - Email",
  "INFO",
  null,
  testCase2
);
addLogEntry(
  "Log específico para TEST_CASE_001 - Card",
  "INFO",
  null,
  testCase1
);
addLogEntry(
  "Log específico para TEST_CASE_002 - Card",
  "INFO",
  null,
  testCase2
);

// Guardar logs
console.log("\n💾 Guardando logs...");
saveLogsToFile(testCase1, "/tmp/logs_test1.txt")
  .then((file1) => {
    console.log(`✅ Test case 1 guardado: ${file1}`);

    return saveLogsToFile(testCase2, "/tmp/logs_test2.txt");
  })
  .then((file2) => {
    console.log(`✅ Test case 2 guardado: ${file2}`);

    // Verificar contenido
    const fs = require("fs");

    console.log("\n🔍 Contenido del archivo TEST_CASE_001:");
    const content1 = fs.readFileSync("/tmp/logs_test1.txt", "utf8");
    const lines1 = content1
      .split("\n")
      .filter((line) => line.includes("TEST_CASE_001"));
    console.log(`Líneas que contienen TEST_CASE_001: ${lines1.length}`);

    console.log("\n🔍 Contenido del archivo TEST_CASE_002:");
    const content2 = fs.readFileSync("/tmp/logs_test2.txt", "utf8");
    const lines2 = content2
      .split("\n")
      .filter((line) => line.includes("TEST_CASE_002"));
    console.log(`Líneas que contienen TEST_CASE_002: ${lines2.length}`);

    // Verificar aislamiento
    const contaminated1 = content1.includes("TEST_CASE_002");
    const contaminated2 = content2.includes("TEST_CASE_001");

    console.log(`\n🔍 Verificación de aislamiento:`);
    console.log(`Archivo 1 contiene logs de test case 2: ${contaminated1}`);
    console.log(`Archivo 2 contiene logs de test case 1: ${contaminated2}`);

    if (!contaminated1 && !contaminated2) {
      console.log("✅ ÉXITO: Los logs están correctamente aislados");
    } else {
      console.log("❌ FALLO: Los logs se están mezclando");
    }
  })
  .catch((error) => {
    console.error("❌ Error:", error.message);
  });
