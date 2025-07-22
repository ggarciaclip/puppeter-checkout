#!/usr/bin/env node

/**
 * Test script to verify that log isolation works correctly in cluster environment
 * This simulates multiple test cases running concurrently like in the real cluster
 */

const {
  initializeFileLogging,
  addLogEntry,
  saveLogsToFile,
  clearCurrentLogs,
} = require("../src/lib/fileLogger");
const path = require("path");
const fs = require("fs");

// Test directory
const TEST_DIR = "/tmp/cluster-log-isolation-test";

/**
 * Simulate a single test case execution
 */
async function simulateTestCase(testCaseId, delayMs = 0) {
  console.log(`🚀 Starting test case: ${testCaseId}`);

  // Initialize logging for this test case
  const testCaseDir = path.join(TEST_DIR, testCaseId);
  if (!fs.existsSync(testCaseDir)) {
    fs.mkdirSync(testCaseDir, { recursive: true });
  }

  // Initialize file logging
  initializeFileLogging(testCaseId, testCaseDir);

  // Log various actions with random delays to simulate real execution
  // Pass testCaseId explicitly to all logging calls
  await new Promise((resolve) => setTimeout(resolve, Math.random() * delayMs));
  addLogEntry(`📊 PARAMETERS for ${testCaseId}`, "INFO", null, testCaseId);

  await new Promise((resolve) => setTimeout(resolve, Math.random() * delayMs));
  addLogEntry(
    `📁 GENERATING DIRECTORY for ${testCaseId}`,
    "INFO",
    null,
    testCaseId
  );

  await new Promise((resolve) => setTimeout(resolve, Math.random() * delayMs));
  addLogEntry(`💳 Filling Card for ${testCaseId}`, "INFO", null, testCaseId);

  await new Promise((resolve) => setTimeout(resolve, Math.random() * delayMs));
  addLogEntry(
    `🏦 Selecting Payment Method for ${testCaseId}`,
    "INFO",
    null,
    testCaseId
  );

  await new Promise((resolve) => setTimeout(resolve, Math.random() * delayMs));
  addLogEntry(
    `💰 Processing payment for ${testCaseId}`,
    "INFO",
    null,
    testCaseId
  );

  await new Promise((resolve) => setTimeout(resolve, Math.random() * delayMs));
  addLogEntry(
    `✅ Payment successful for ${testCaseId}`,
    "SUCCESS",
    null,
    testCaseId
  );

  // Save logs
  const logFilePath = await saveLogsToFile(testCaseId);
  console.log(`📝 Logs saved for ${testCaseId}: ${logFilePath}`);

  // Clean up
  clearCurrentLogs(testCaseId);
  console.log(`🧹 Cleaned logs for ${testCaseId}`);

  return testCaseId;
}

/**
 * Main test function
 */
async function testClusterLogIsolation() {
  console.log("🧪 Testing Cluster Log Isolation\n");

  // Clean up test directory
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });

  // Simulate 4 concurrent test cases (like in the real cluster with maxConcurrency: 4)
  const testCases = [
    "GUEST_USD_TC1",
    "REGISTER_MXN_TC2",
    "GUEST_EUR_TC3",
    "REGISTER_USD_TC4",
  ];

  console.log("🚀 Starting 4 concurrent test cases...\n");

  // Run all test cases concurrently (like Promise.all(parameters.map((p) => cluster.execute(p))))
  const results = await Promise.all(
    testCases.map((testCase) => simulateTestCase(testCase, 200))
  );

  console.log("\n✅ All test cases completed:", results);

  // Verify isolation by checking log files
  console.log("\n🔍 Verifying log isolation...\n");

  let allIsolated = true;

  for (const testCase of testCases) {
    const logFile = path.join(TEST_DIR, testCase, "logs.txt");

    if (!fs.existsSync(logFile)) {
      console.log(`❌ Log file not found for ${testCase}`);
      allIsolated = false;
      continue;
    }

    const logContent = fs.readFileSync(logFile, "utf8");

    // Check that this log file only contains logs for this specific test case
    const hasOwnLogs = logContent.includes(testCase);
    const hasOtherLogs = testCases.some(
      (otherCase) => otherCase !== testCase && logContent.includes(otherCase)
    );

    if (hasOwnLogs && !hasOtherLogs) {
      console.log(`✅ ${testCase}: Logs correctly isolated`);
    } else {
      console.log(`❌ ${testCase}: Log isolation failed`);
      console.log(`   - Has own logs: ${hasOwnLogs}`);
      console.log(`   - Has other logs: ${hasOtherLogs}`);
      if (hasOtherLogs) {
        const contaminatingCases = testCases.filter(
          (otherCase) =>
            otherCase !== testCase && logContent.includes(otherCase)
        );
        console.log(
          `   - Contaminating cases: ${contaminatingCases.join(", ")}`
        );
      }
      allIsolated = false;
    }

    // Show log stats
    const lines = logContent.split("\n").length;
    const logEntries = (logContent.match(/\[\d{1,2}:\d{2}:\d{2}\]/g) || [])
      .length;
    console.log(`   - Log lines: ${lines}, Log entries: ${logEntries}`);
  }

  console.log("\n📊 Summary:");
  if (allIsolated) {
    console.log("🎉 SUCCESS: All logs are properly isolated!");
    console.log(
      "✅ Cluster parallel execution will not mix logs between test cases"
    );
  } else {
    console.log("💥 FAILURE: Log isolation is not working correctly");
    console.log("❌ Logs are being mixed between concurrent test cases");
  }

  console.log(`\n📁 Test results available in: ${TEST_DIR}`);
}

// Run the test
if (require.main === module) {
  testClusterLogIsolation().catch(console.error);
}

module.exports = { testClusterLogIsolation, simulateTestCase };
