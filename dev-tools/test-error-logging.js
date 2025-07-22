// Test script para verificar que logHeaderError funciona correctamente
const { logHeaderError, getErrorLineInfo } = require("./src/lib/logger");

console.log("🧪 Testando logHeaderError...\n");

// Simular un error
try {
  throw new Error("Error de prueba en línea específica");
} catch (error) {
  console.log("📍 Error stack trace:");
  console.log(error.stack);
  console.log("\n📍 Información de línea extraída:");
  console.log(getErrorLineInfo(error));
  console.log("\n📍 Log con error info:");
  logHeaderError({}, `❌ Error de prueba: ${error.message}`, error);
}

console.log("\n✅ Test completado.");
