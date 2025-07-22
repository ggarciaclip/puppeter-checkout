const mlog = require("mocha-logger");
const { addLogEntry } = require("./fileLogger");

const SIZE_LOG_WIDTH = 144;

// Check if verbose logging is enabled via environment variable or command line
const isVerboseLogging =
  process.env.VERBOSE_LOGS === "true" ||
  process.argv.includes("--verbose") ||
  process.argv.includes("--verbose-logs");

// Important log keywords that should always be shown
const IMPORTANT_LOG_KEYWORDS = [
  "💰 Paying in:",
  "🎉 Saving screenshot for success pay page:",
  "📝 Save logs:",
  "💾 Write JSON Logs results:",
  "error",
  "Error",
  "ERROR",
  "failed",
  "Failed",
  "FAILED",
];

function shouldShowLog(headerString) {
  if (isVerboseLogging) {
    return true; // Show all logs if verbose mode is enabled
  }

  // Always show important logs
  return IMPORTANT_LOG_KEYWORDS.some((keyword) =>
    headerString.toLowerCase().includes(keyword.toLowerCase())
  );
}

function centerHeader(header, size) {
  try {
    let totalLength = size;
    let headerLength = header.length;

    // If header is longer than available size, truncate it
    if (headerLength > totalLength) {
      return header.substring(0, totalLength);
    }

    let paddingLength = Math.floor((totalLength - headerLength) / 2);

    // Ensure paddingLength is never negative
    paddingLength = Math.max(0, paddingLength);

    let paddedHeader =
      " ".repeat(paddingLength) + header + " ".repeat(paddingLength);

    // If the total length is odd and the header length is even (or vice versa), add one more space to the end
    if (paddedHeader.length < totalLength) {
      paddedHeader += " ";
    }

    return paddedHeader;
  } catch (e) {
    // If there's still an error, return the header as-is
    return header;
  }
}

function logHeader(data, headerString, testCaseId = null) {
  // Only show log if it meets our filtering criteria
  if (!shouldShowLog(headerString)) {
    // Even if we don't show it in console, still save it to file with testCaseId
    if (testCaseId) {
      addLogEntry(headerString, "INFO", data, testCaseId);
    }
    return;
  }

  mlog.log(`${headerString}`);

  // Save to file logger with testCaseId
  if (testCaseId) {
    addLogEntry(headerString, "INFO", data, testCaseId);
  }

  if (data !== null) {
    Object.entries(data).forEach(([key, value]) => {
      mlog.log(`${key}:`, value);
      // Also save individual data entries with testCaseId
      if (testCaseId) {
        addLogEntry(
          `${key}: ${JSON.stringify(value)}`,
          "DATA",
          null,
          testCaseId
        );
      }
    });
  }
}

function logStart(paymentType, testCaseId = null) {
  const spaces = " ".repeat(28);
  const spacesEnd = " ".repeat(40 - paymentType.length);
  const slash = "-".repeat(80);

  mlog.log(`[${slash}]`);
  mlog.log(`[${spaces}🚀 Running ${paymentType}${spacesEnd}]`);

  // Save to file logger with testCaseId
  if (testCaseId) {
    addLogEntry(`🚀 Running ${paymentType}`, "START", null, testCaseId);
  }
}

function logPaymentStatus(testCaseId, isSuccess, errorMessage = null) {
  const status = isSuccess ? "✅ APROBADO" : "❌ RECHAZADO";
  const emoji = isSuccess ? "🎉" : "💔";
  const headerString = `${emoji} Pago ${status}: ${testCaseId}`;

  const val = centerHeader(headerString, SIZE_LOG_WIDTH);
  mlog.log("================================================================");
  mlog.log(`${val}`);
  mlog.log("================================================================");

  // Save to file logger with the specific testCaseId
  const logLevel = isSuccess ? "SUCCESS" : "ERROR";
  addLogEntry(headerString, logLevel, { errorMessage }, testCaseId);

  if (!isSuccess && errorMessage) {
    mlog.log(`Razón del rechazo: ${errorMessage}`);
    mlog.log(
      "----------------------------------------------------------------"
    );
    addLogEntry(
      `Razón del rechazo: ${errorMessage}`,
      "ERROR",
      null,
      testCaseId
    );
  }
}

/**
 * Extract line number and file information from error stack trace
 * @param {Error} error - The error object
 * @returns {string} - Formatted line information
 */
function getErrorLineInfo(error) {
  if (!error || !error.stack) {
    return "";
  }

  try {
    const stackLines = error.stack.split("\n");
    // Find the first line that contains a file path (usually the second line)
    for (let i = 1; i < stackLines.length; i++) {
      const line = stackLines[i];
      // Look for patterns like "/path/to/file.js:123:45" or "at functionName (/path/to/file.js:123:45)"
      const match = line.match(/at\s+.*?\(?(\/.*?\.js):(\d+):(\d+)\)?/);
      if (match) {
        const [, filePath, lineNumber, columnNumber] = match;
        const fileName = filePath.split("/").pop(); // Get just the filename
        return ` [${fileName}:${lineNumber}:${columnNumber}]`;
      }
    }

    // Fallback: try simpler pattern
    const firstRelevantLine = stackLines.find((line) => line.includes(".js:"));
    if (firstRelevantLine) {
      const match = firstRelevantLine.match(/([^\/]*\.js):(\d+):(\d+)/);
      if (match) {
        const [, fileName, lineNumber, columnNumber] = match;
        return ` [${fileName}:${lineNumber}:${columnNumber}]`;
      }
    }

    return "";
  } catch (parseError) {
    return "";
  }
}

/**
 * Enhanced logHeader function for errors with line information
 * @param {Object} data - Additional data to log
 * @param {string} headerString - The header message
 * @param {Error} error - Optional error object to extract line info from
 * @param {string} testCaseId - The test case ID for log isolation
 */
function logHeaderError(data, headerString, error, testCaseId = null) {
  const lineInfo = getErrorLineInfo(error);
  const enhancedHeader = `${headerString}${lineInfo}`;
  logHeader(data, enhancedHeader, testCaseId);
}

/**
 * Debug logger function using mocha-logger with file logging integration
 * @param {string} message - The debug message to log
 * @param {Object} data - Optional additional data to log
 * @param {string} testCaseId - Optional test case ID for log isolation
 * @param {string} level - Log level: 'log', 'success', 'error', 'pending'
 */
function logDebugger(message, data = null, testCaseId = null, level = "log") {
  // Get caller info for better debugging
  const stack = new Error().stack;
  let callerInfo = "";

  try {
    const stackLines = stack.split("\n");
    if (stackLines.length > 2) {
      const callerLine = stackLines[2];
      const match = callerLine.match(/at\s+.*?\(?(\/.*?\.js):(\d+):(\d+)\)?/);
      if (match) {
        const [, filePath, lineNumber] = match;
        const fileName = filePath.split("/").pop();
        callerInfo = ` [${fileName}:${lineNumber}]`;
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }

  const fullMessage = `🐛 ${message}${callerInfo}`;

  // Use appropriate mocha-logger function based on level
  switch (level) {
    case "success":
      mlog.success(fullMessage);
      break;
    case "error":
      mlog.error(fullMessage);
      break;
    case "pending":
      mlog.pending(fullMessage);
      break;
    default:
      // Only show debug logs if verbose logging is enabled or contains important keywords
      if (shouldShowLog(message)) {
        mlog.log(fullMessage);
      }
      break;
  }

  // Always save to file logger for debugging purposes
  addLogEntry(fullMessage, level.toUpperCase(), data, testCaseId);
}

/**
 * Thread-safe debug logger for video recording operations
 * @param {string} threadId - The thread ID for isolation
 * @param {string} message - The debug message
 * @param {Object} data - Optional additional data
 */
function logThreadDebug(threadId, message, data = null) {
  const shortThreadId = threadId ? threadId.slice(-8) : "unknown";
  const threadMessage = `🧵 Thread ${shortThreadId}: ${message}`;
  logDebugger(threadMessage, data, null, "log");
}

module.exports = {
  logHeader,
  logStart,
  logPaymentStatus,
  logHeaderError,
  getErrorLineInfo,
  logDebugger,
  logThreadDebug,
};
