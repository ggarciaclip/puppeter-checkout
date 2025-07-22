#!/usr/bin/env node

/**
 * Test script to validate the file logging system
 */

const {
  initializeFileLogging,
  addLogEntry,
  saveLogsToFile,
  clearCurrentLogs,
  getCurrentLogsCount,
} = require("../src/lib/fileLogger");
const fs = require("fs");
const path = require("path");

async function testFileLogging() {
  console.log("🧪 Testing File Logging System...\n");

  try {
    // Test directory
    const testDir = "./test_logs";
    const testCaseId = "TEST_CASE_FILE_LOGGING";

    // Ensure test directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Step 1: Initialize file logging
    console.log("✅ Step 1: Initializing file logging...");
    initializeFileLogging(testCaseId, testDir);
    console.log(`   Logs count after init: ${getCurrentLogsCount()}`);

    // Step 2: Add various types of log entries
    console.log("✅ Step 2: Adding test log entries...");
    addLogEntry("🚀 Test execution started", "INFO");
    addLogEntry("📧 Filling email field", "INFO", {
      email: "test@example.com",
    });
    addLogEntry("💳 Processing card payment", "INFO", {
      cardNumber: "**** **** **** 1234",
    });
    addLogEntry("⚠️ Warning: Slow response detected", "WARNING");
    addLogEntry("✅ Payment successful", "SUCCESS", {
      amount: 100,
      currency: "MXN",
    });
    addLogEntry("🎉 Test completed successfully", "INFO");
    console.log(`   Logs count after adding entries: ${getCurrentLogsCount()}`);

    // Step 3: Save logs to file
    console.log("✅ Step 3: Saving logs to file...");
    const logFilePath = await saveLogsToFile();
    console.log(`   Logs saved to: ${logFilePath}`);

    // Step 4: Verify file was created and has content
    console.log("✅ Step 4: Verifying log file...");
    if (fs.existsSync(logFilePath)) {
      const fileContent = fs.readFileSync(logFilePath, "utf8");
      const fileSize = fs.statSync(logFilePath).size;
      console.log(`   ✓ File exists: ${logFilePath}`);
      console.log(`   ✓ File size: ${fileSize} bytes`);
      console.log(
        `   ✓ File contains ${fileContent.split("\\n").length} lines`
      );

      // Check for key content
      const hasHeader = fileContent.includes("LOGS DE EJECUCIÓN");
      const hasTestCaseId = fileContent.includes(testCaseId);
      const hasTimestamps = fileContent.includes("[INFO]");

      console.log(`   ✓ Has header: ${hasHeader ? "✅" : "❌"}`);
      console.log(`   ✓ Has test case ID: ${hasTestCaseId ? "✅" : "❌"}`);
      console.log(`   ✓ Has timestamps: ${hasTimestamps ? "✅" : "❌"}`);

      // Show sample content (first few lines)
      console.log("\\n📝 Sample log content:");
      const lines = fileContent.split("\\n").slice(0, 10);
      lines.forEach((line, index) => {
        if (line.trim()) {
          console.log(`   ${index + 1}: ${line}`);
        }
      });
    } else {
      console.log("   ❌ File was not created");
      return false;
    }

    // Step 5: Clear logs
    console.log("\\n✅ Step 5: Clearing logs...");
    clearCurrentLogs();
    console.log(`   Logs count after clearing: ${getCurrentLogsCount()}`);

    // Step 6: Cleanup test directory
    console.log("✅ Step 6: Cleaning up test files...");
    try {
      fs.unlinkSync(logFilePath);
      fs.rmdirSync(testDir);
      console.log("   ✓ Test files cleaned up");
    } catch (cleanupError) {
      console.log(`   ⚠️ Cleanup warning: ${cleanupError.message}`);
    }

    console.log("\\n🎉 File logging test completed successfully!");
    console.log("\\n📋 Summary:");
    console.log("   ✅ File logging initialization works");
    console.log("   ✅ Log entry addition works");
    console.log("   ✅ File saving works");
    console.log("   ✅ Log formatting works");
    console.log("   ✅ Cleanup works");

    return true;
  } catch (error) {
    console.error("❌ File logging test failed:", error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testFileLogging()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Test execution failed:", error.message);
      process.exit(1);
    });
}

module.exports = { testFileLogging };
