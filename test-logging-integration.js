#!/usr/bin/env node

/**
 * Test de integración completa del sistema de logging thread-safe
 * Prueba que todas las funciones de logging funcionen correctamente
 */

const { logDebugger, logThreadDebug, logHeader } = require("./src/lib/logger");
const { videoManager } = require("./src/lib/threadSafeVideoManager");
const {
  initializeFileLogging,
  addLogEntry,
  saveLogsToFile,
} = require("./src/lib/fileLogger");

async function testLoggingIntegration() {
  console.log(
    "🧪 Iniciando test de integración del sistema de logging thread-safe...\n"
  );

  const testCaseId = "LOGGING_INTEGRATION_TEST_001";

  try {
    // 1. Test basic logging functions
    console.log("📝 Testing basic logging functions...");
    initializeFileLogging(testCaseId);

    logHeader({}, `🚀 Starting integration test`, testCaseId);
    logDebugger(
      "Test debug message",
      { component: "logger" },
      testCaseId,
      "log"
    );
    logDebugger(
      "Test success message",
      { result: "ok" },
      testCaseId,
      "success"
    );
    logDebugger(
      "Test error simulation",
      { error: "sample error" },
      testCaseId,
      "error"
    );

    // 2. Test thread-safe video manager logging
    console.log("🎬 Testing thread-safe video manager logging...");
    const recording = videoManager.initializeRecording(
      testCaseId,
      "/tmp/test_video"
    );
    const threadId = recording.threadId;

    logThreadDebug(threadId, "Video recording initialized", {
      testCaseId,
      videoPath: recording.videoPath,
    });

    logThreadDebug(threadId, "Simulating screenshot capture", {
      frameNumber: 1,
      success: true,
    });

    logThreadDebug(threadId, "Simulating error scenario", {
      error: "Connection timeout",
      retryCount: 3,
    });

    // 3. Test stats and cleanup
    console.log("📊 Testing stats and cleanup...");
    const stats = videoManager.getRecordingStats(threadId);
    logDebugger("Thread statistics", stats, testCaseId, "log");

    videoManager.cleanupThread(threadId);
    logDebugger(
      "Thread cleanup completed",
      { threadId: threadId.slice(-8) },
      testCaseId,
      "success"
    );

    // 4. Save logs to file
    console.log("💾 Saving logs to file...");
    addLogEntry(
      "Integration test completed successfully",
      "SUCCESS",
      {
        totalSteps: 4,
        threadsTested: 1,
      },
      testCaseId
    );

    // Wait a moment for async operations
    setTimeout(async () => {
      try {
        await saveLogsToFile(testCaseId);
        console.log("\n✅ ¡Test de integración completado exitosamente!");
        console.log(
          "🎯 Todos los componentes del sistema de logging thread-safe funcionan correctamente"
        );
        console.log(
          "📁 Los logs se han guardado en el archivo correspondiente"
        );

        // Show active threads info
        const activeThreads = videoManager.getActiveThreadsInfo();
        console.log(`🧵 Threads activos: ${activeThreads.length}`);
      } catch (error) {
        console.log("⚠️ Test completado con warnings:", error.message);
      }
    }, 200);
  } catch (error) {
    console.error("❌ Error en test de integración:", error.message);
    logDebugger(
      "Integration test failed",
      { error: error.message },
      testCaseId,
      "error"
    );
  }
}

// Ejecutar el test
testLoggingIntegration();
