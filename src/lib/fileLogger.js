const fs = require("fs");
const path = require("path");
const { getFormattedDateTime } = require("./date_utils");

// Map to store logs for each test case separately (keyed by test case ID)
const testCaseLogsMap = new Map();

/**
 * Initialize file logging for a specific test case
 * @param {string} testCaseId - The test case identifier (used as unique key)
 * @param {string} testCaseDir - The directory path for the test case
 */
function initializeFileLogging(testCaseId, testCaseDir) {
  // Initialize logs array for this specific test case
  testCaseLogsMap.set(testCaseId, {
    logs: [],
    directory: testCaseDir,
  });

  // Add initial log entries for this specific test case
  addLogEntry(
    `🚀 INICIO DE EJECUCIÓN: ${testCaseId}`,
    "INFO",
    null,
    testCaseId
  );
  addLogEntry(`📁 Directorio: ${testCaseDir}`, "INFO", null, testCaseId);
  addLogEntry(
    `⏰ Timestamp: ${getFormattedDateTime()}`,
    "INFO",
    null,
    testCaseId
  );
  addLogEntry("=".repeat(80), "SEPARATOR", null, testCaseId);
}

/**
 * Add a log entry to a specific test case's logs
 * @param {string} message - The log message
 * @param {string} level - The log level (INFO, ERROR, WARNING, SUCCESS, etc.)
 * @param {Object} data - Optional data object to include
 * @param {string} testCaseId - The test case ID (required for cluster isolation)
 */
function addLogEntry(message, level = "INFO", data = null, testCaseId) {
  if (!testCaseId) {
    console.warn(
      `⚠️ Cannot add log entry - testCaseId is required: ${message}`
    );
    return;
  }

  // Filter out debug logs with 🐛 emoji to keep log files clean
  if (message.includes("🐛")) {
    return; // Skip saving debug logs to file
  }

  // Ensure test case exists in map
  if (!testCaseLogsMap.has(testCaseId)) {
    // Auto-initialize if not exists
    testCaseLogsMap.set(testCaseId, {
      logs: [],
      directory: null,
    });
  }

  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data,
  };

  testCaseLogsMap.get(testCaseId).logs.push(logEntry);
}

/**
 * Format a log entry for text output
 * @param {Object} logEntry - The log entry object
 * @returns {string} Formatted log string
 */
function formatLogEntry(logEntry) {
  const time = new Date(logEntry.timestamp).toLocaleTimeString();
  let formattedMessage = `[${time}] [${logEntry.level}] ${logEntry.message}`;

  if (logEntry.data && Object.keys(logEntry.data).length > 0) {
    formattedMessage += "\n" + JSON.stringify(logEntry.data, null, 2);
  }

  return formattedMessage;
}

/**
 * Save all accumulated logs to a text file for a specific test case
 * @param {string} testCaseId - The test case ID to save logs for (required)
 * @param {string} customPath - Optional custom file path
 */
async function saveLogsToFile(testCaseId, customPath = null) {
  if (!testCaseId) {
    console.warn(`⚠️ Cannot save logs - testCaseId is required`);
    return null;
  }

  if (!testCaseLogsMap.has(testCaseId)) {
    console.warn(`⚠️ No logs found for test case: ${testCaseId}`);
    return null;
  }

  const testCaseData = testCaseLogsMap.get(testCaseId);
  const testCaseDir = testCaseData.directory;

  if (!testCaseDir && !customPath) {
    console.warn(`⚠️ No directory available for test case: ${testCaseId}`);
    return null;
  }

  const filePath = customPath || path.join(testCaseDir, "logs.txt");

  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Add completion log to this specific test case
    addLogEntry(`🏁 FIN DE EJECUCIÓN: ${testCaseId}`, "INFO", null, testCaseId);
    // Log removed: total log count is too verbose
    addLogEntry("=".repeat(80), "SEPARATOR", null, testCaseId);

    // Get logs for this specific test case
    const testCaseLogs = testCaseData.logs;

    // Format all logs
    const formattedLogs = testCaseLogs.map(formatLogEntry).join("\n");

    // Create header with test case specific information
    const header = [
      "=".repeat(80),
      `📋 LOGS DE EJECUCIÓN - ${testCaseId}`,
      `📅 Generado: ${getFormattedDateTime()}`,
      `📁 Directorio: ${testCaseDir}`,
      "=".repeat(80),
      "",
    ].join("\n");

    // Write to file
    const fullContent = header + formattedLogs;
    fs.writeFileSync(filePath, fullContent, "utf8");

    // Use dynamic import to avoid circular dependency
    try {
      const { logDebugger } = require("./logger");
      logDebugger(
        `✅ Logs guardados exitosamente para ${testCaseId}:`,
        { filePath },
        testCaseId,
        "success"
      );
    } catch (e) {
      // Fallback to console if logger not available
      console.log(
        `✅ Logs guardados exitosamente para ${testCaseId}: ${filePath}`
      );
    }
    return filePath;
  } catch (error) {
    // Use dynamic import to avoid circular dependency
    try {
      const { logDebugger } = require("./logger");
      logDebugger(
        `❌ Error guardando logs para ${testCaseId}:`,
        { error: error.message },
        testCaseId,
        "error"
      );
    } catch (e) {
      // Fallback to console if logger not available
      console.error(
        `❌ Error guardando logs para ${testCaseId}: ${error.message}`
      );
    }
    throw error;
  }
}

/**
 * Get current logs count for a specific test case
 * @param {string} testCaseId - The test case ID (required)
 */
function getCurrentLogsCount(testCaseId) {
  if (!testCaseId || !testCaseLogsMap.has(testCaseId)) {
    return 0;
  }
  return testCaseLogsMap.get(testCaseId).logs.length;
}

/**
 * Clear logs for a specific test case
 * @param {string} testCaseId - The test case ID to clear (required)
 */
function clearCurrentLogs(testCaseId) {
  if (!testCaseId) {
    console.warn(`⚠️ Cannot clear logs - testCaseId is required`);
    return;
  }

  if (testCaseLogsMap.has(testCaseId)) {
    testCaseLogsMap.delete(testCaseId);
  }
}

/**
 * Get all current logs for a specific test case
 * @param {string} testCaseId - The test case ID (required)
 */
function getCurrentLogs(testCaseId) {
  if (!testCaseId || !testCaseLogsMap.has(testCaseId)) {
    return [];
  }
  return [...testCaseLogsMap.get(testCaseId).logs];
}

module.exports = {
  initializeFileLogging,
  addLogEntry,
  saveLogsToFile,
  getCurrentLogsCount,
  clearCurrentLogs,
  getCurrentLogs,
  formatLogEntry,
};
