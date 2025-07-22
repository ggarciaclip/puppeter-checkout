#!/usr/bin/env node

/**
 * Quick test to verify that the core logging functions work correctly
 * with the actual framework components
 */

const {
  initializeFileLogging,
  addLogEntry,
  saveLogsToFile,
  clearCurrentLogs,
} = require("../src/lib/fileLogger");
const { logHeader, logHeaderError } = require("../src/lib/logger");
const path = require("path");
const fs = require("fs");

async function testFrameworkIntegration() {
  console.log("🧪 Testing framework integration...\n");

  const testDir = "/tmp/framework-integration-test";
  const testCaseId = "INTEGRATION_TEST_001";
  const testCaseDir = path.join(testDir, testCaseId);

  // Clean up
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testCaseDir, { recursive: true });

  // Test the integration
  console.log("1. Initializing file logging...");
  initializeFileLogging(testCaseId, testCaseDir);

  console.log("2. Testing logHeader with testCaseId...");
  logHeader({ card: "1234****5678" }, "📊 PARAMETERS", testCaseId);

  console.log(
    "3. Testing logHeader without testCaseId (should not log to file)..."
  );
  logHeader({}, "🔧 Console only message");

  console.log("4. Testing addLogEntry directly...");
  addLogEntry("💳 Direct log entry", "INFO", { step: "manual" }, testCaseId);

  console.log("5. Testing logHeaderError...");
  try {
    throw new Error("Test error for logging");
  } catch (error) {
    logHeaderError({}, "❌ Test error occurred", error, testCaseId);
  }

  console.log("6. Saving logs...");
  const logFilePath = await saveLogsToFile(testCaseId);

  console.log("7. Verifying log file...");
  if (fs.existsSync(logFilePath)) {
    const content = fs.readFileSync(logFilePath, "utf8");
    const lines = content.split("\n").length;
    const hasTestCase = content.includes(testCaseId);
    const hasConsoleOnly = content.includes("Console only message");

    console.log(`✅ Log file created: ${logFilePath}`);
    console.log(`✅ Log lines: ${lines}`);
    console.log(`✅ Contains test case ID: ${hasTestCase}`);
    console.log(`✅ Console-only message excluded: ${!hasConsoleOnly}`);

    // Show a sample of the content
    console.log("\n📄 Sample log content:");
    console.log(content.split("\n").slice(5, 15).join("\n"));

    if (hasTestCase && !hasConsoleOnly) {
      console.log("\n🎉 Framework integration is working correctly!");
      return true;
    } else {
      console.log("\n❌ Framework integration has issues");
      return false;
    }
  } else {
    console.log("❌ Log file was not created");
    return false;
  }
}

if (require.main === module) {
  testFrameworkIntegration().catch(console.error);
}

module.exports = { testFrameworkIntegration };
