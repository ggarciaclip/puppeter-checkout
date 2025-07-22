const fs = require("fs");
const path = require("path");
const { logHeader, logHeaderError } = require("./logger");
const { addLogEntry } = require("./fileLogger");

// Maximum number of test runs to keep per payment type
const MAX_TEST_RUNS_PER_TYPE = 8;

/**
 * Clean old test runs for a specific payment type, keeping only the latest MAX_TEST_RUNS_PER_TYPE
 * @param {string} paymentType - The payment type directory (e.g., "DEV-link_de_pago")
 * @param {string} baseDir - Base directory for test runs (default: "completed_tests/test_runs")
 */
async function cleanOldTestRuns(
  paymentType,
  baseDir = "completed_tests/test_runs"
) {
  try {
    const paymentTypeDir = path.join(baseDir, paymentType);

    // Check if the payment type directory exists
    if (!fs.existsSync(paymentTypeDir)) {
      logHeader({}, `📁 Directory doesn't exist yet: ${paymentType}`);
      return { cleaned: 0, kept: 0 };
    }

    // Get all test run directories and sort them by creation time (newest first)
    const testRunDirs = fs
      .readdirSync(paymentTypeDir)
      .filter((dir) => {
        const fullPath = path.join(paymentTypeDir, dir);
        return fs.statSync(fullPath).isDirectory();
      })
      .map((dir) => {
        const fullPath = path.join(paymentTypeDir, dir);
        const stats = fs.statSync(fullPath);
        return {
          name: dir,
          path: fullPath,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt); // Sort by creation time, newest first

    const totalRuns = testRunDirs.length;

    if (totalRuns <= MAX_TEST_RUNS_PER_TYPE) {
      logHeader(
        {},
        `✅ No cleanup needed for ${paymentType}: ${totalRuns}/${MAX_TEST_RUNS_PER_TYPE} runs`
      );
      addLogEntry(
        `✅ No cleanup needed for ${paymentType}: ${totalRuns}/${MAX_TEST_RUNS_PER_TYPE} runs`,
        "INFO"
      );
      return { cleaned: 0, kept: totalRuns };
    }

    // Keep the newest MAX_TEST_RUNS_PER_TYPE and mark the rest for deletion
    const runsToKeep = testRunDirs.slice(0, MAX_TEST_RUNS_PER_TYPE);
    const runsToDelete = testRunDirs.slice(MAX_TEST_RUNS_PER_TYPE);

    logHeader(
      {},
      `🧹 Cleaning old test runs for ${paymentType}: keeping ${runsToKeep.length}, deleting ${runsToDelete.length}`
    );
    addLogEntry(
      `🧹 Cleaning old test runs for ${paymentType}: keeping ${runsToKeep.length}, deleting ${runsToDelete.length}`,
      "INFO"
    );

    let deletedCount = 0;
    let deletedSize = 0;

    // Delete old test runs
    for (const testRun of runsToDelete) {
      try {
        const sizeBeforeDelete = await getDirectorySize(testRun.path);
        await deleteDirectoryRecursive(testRun.path);
        deletedCount++;
        deletedSize += sizeBeforeDelete;

        logHeader(
          {},
          `🗑️ Deleted old test run: ${testRun.name} (${formatBytes(
            sizeBeforeDelete
          )})`
        );
        addLogEntry(
          `🗑️ Deleted old test run: ${testRun.name} (${formatBytes(
            sizeBeforeDelete
          )})`,
          "INFO"
        );
      } catch (deleteError) {
        logHeaderError(
          {},
          `⚠️ Error deleting ${testRun.name}: ${deleteError.message}`,
          deleteError
        );
        addLogEntry(
          `⚠️ Error deleting ${testRun.name}: ${deleteError.message}`,
          "WARNING"
        );
      }
    }

    const summary = {
      cleaned: deletedCount,
      kept: runsToKeep.length,
      sizeCleaned: deletedSize,
      keptRuns: runsToKeep.map((r) => r.name),
      deletedRuns: runsToDelete.slice(0, deletedCount).map((r) => r.name),
    };

    logHeader(
      {},
      `✅ Cleanup completed for ${paymentType}: ${deletedCount} runs deleted, ${formatBytes(
        deletedSize
      )} freed`
    );
    addLogEntry(
      `✅ Cleanup completed for ${paymentType}: ${deletedCount} runs deleted, ${formatBytes(
        deletedSize
      )} freed`,
      "SUCCESS"
    );

    return summary;
  } catch (error) {
    logHeaderError(
      {},
      `❌ Error during cleanup for ${paymentType}: ${error.message}`,
      error
    );
    addLogEntry(
      `❌ Error during cleanup for ${paymentType}: ${error.message}`,
      "ERROR"
    );
    throw error;
  }
}

/**
 * Clean old test runs for all payment types
 * @param {string} baseDir - Base directory for test runs
 */
async function cleanAllOldTestRuns(baseDir = "completed_tests/test_runs") {
  try {
    logHeader(
      {},
      `🧹 Starting automatic cleanup of old test runs (keeping ${MAX_TEST_RUNS_PER_TYPE} per type)`
    );
    addLogEntry(
      `🧹 Starting automatic cleanup of old test runs (keeping ${MAX_TEST_RUNS_PER_TYPE} per type)`,
      "INFO"
    );

    if (!fs.existsSync(baseDir)) {
      logHeader({}, `📁 Test runs directory doesn't exist: ${baseDir}`);
      return { totalCleaned: 0, totalKept: 0 };
    }

    // Get all payment type directories
    const paymentTypes = fs.readdirSync(baseDir).filter((dir) => {
      const fullPath = path.join(baseDir, dir);
      return fs.statSync(fullPath).isDirectory();
    });

    if (paymentTypes.length === 0) {
      logHeader({}, `📁 No payment type directories found in ${baseDir}`);
      return { totalCleaned: 0, totalKept: 0 };
    }

    let totalCleaned = 0;
    let totalKept = 0;
    let totalSizeCleaned = 0;
    const cleanupResults = [];

    // Clean each payment type
    for (const paymentType of paymentTypes) {
      try {
        const result = await cleanOldTestRuns(paymentType, baseDir);
        totalCleaned += result.cleaned;
        totalKept += result.kept;
        totalSizeCleaned += result.sizeCleaned || 0;
        cleanupResults.push({
          paymentType,
          ...result,
        });
      } catch (error) {
        logHeaderError(
          {},
          `⚠️ Failed to clean ${paymentType}: ${error.message}`,
          error
        );
        addLogEntry(
          `⚠️ Failed to clean ${paymentType}: ${error.message}`,
          "WARNING"
        );
      }
    }

    // Summary
    logHeader(
      {},
      `🎉 Global cleanup completed: ${totalCleaned} runs deleted, ${totalKept} runs kept, ${formatBytes(
        totalSizeCleaned
      )} freed`
    );
    addLogEntry(
      `🎉 Global cleanup completed: ${totalCleaned} runs deleted, ${totalKept} runs kept, ${formatBytes(
        totalSizeCleaned
      )} freed`,
      "SUCCESS"
    );

    return {
      totalCleaned,
      totalKept,
      totalSizeCleaned,
      paymentTypes: cleanupResults,
    };
  } catch (error) {
    logHeaderError(
      {},
      `❌ Error during global cleanup: ${error.message}`,
      error
    );
    addLogEntry(`❌ Error during global cleanup: ${error.message}`, "ERROR");
    throw error;
  }
}

/**
 * Get the size of a directory in bytes
 * @param {string} dirPath - Directory path
 */
async function getDirectorySize(dirPath) {
  let totalSize = 0;

  try {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        totalSize += await getDirectorySize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    // If we can't read the directory, return 0
    return 0;
  }

  return totalSize;
}

/**
 * Delete a directory and all its contents recursively
 * @param {string} dirPath - Directory path to delete
 */
async function deleteDirectoryRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);

    if (stats.isDirectory()) {
      await deleteDirectoryRecursive(itemPath);
    } else {
      fs.unlinkSync(itemPath);
    }
  }

  fs.rmdirSync(dirPath);
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - Size in bytes
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Get test run statistics for a payment type
 * @param {string} paymentType - The payment type directory
 * @param {string} baseDir - Base directory for test runs
 */
function getTestRunStats(paymentType, baseDir = "completed_tests/test_runs") {
  try {
    const paymentTypeDir = path.join(baseDir, paymentType);

    if (!fs.existsSync(paymentTypeDir)) {
      return { exists: false, count: 0, totalSize: 0 };
    }

    const testRunDirs = fs
      .readdirSync(paymentTypeDir)
      .filter((dir) => {
        const fullPath = path.join(paymentTypeDir, dir);
        return fs.statSync(fullPath).isDirectory();
      })
      .map((dir) => {
        const fullPath = path.join(paymentTypeDir, dir);
        const stats = fs.statSync(fullPath);
        return {
          name: dir,
          createdAt: stats.birthtime,
          size: stats.size,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    return {
      exists: true,
      count: testRunDirs.length,
      runs: testRunDirs,
      needsCleanup: testRunDirs.length > MAX_TEST_RUNS_PER_TYPE,
      excess: Math.max(0, testRunDirs.length - MAX_TEST_RUNS_PER_TYPE),
    };
  } catch (error) {
    return { exists: false, count: 0, error: error.message };
  }
}

module.exports = {
  cleanOldTestRuns,
  cleanAllOldTestRuns,
  getTestRunStats,
  formatBytes,
  MAX_TEST_RUNS_PER_TYPE,
};
