#!/usr/bin/env node

// Simple test
console.log("🧪 Testing framework integration...");

const {
  initializeFileLogging,
  addLogEntry,
  saveLogsToFile,
} = require("../src/lib/fileLogger");
const fs = require("fs");

async function quickTest() {
  const testCaseId = "QUICK_TEST";
  const testDir = "/tmp/quick-test";

  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  console.log("✅ Initializing...");
  initializeFileLogging(testCaseId, testDir);

  console.log("✅ Adding log entry...");
  addLogEntry("Test message", "INFO", null, testCaseId);

  console.log("✅ Saving logs...");
  const logFile = await saveLogsToFile(testCaseId);

  console.log("✅ Checking result...");
  if (fs.existsSync(logFile)) {
    const content = fs.readFileSync(logFile, "utf8");
    console.log(
      "✅ Success! Log file created with content length:",
      content.length
    );
    console.log("📄 First few lines:");
    console.log(content.split("\n").slice(0, 5).join("\n"));
  } else {
    console.log("❌ Log file not created");
  }
}

quickTest().catch(console.error);
