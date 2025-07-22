// Test script para verificar que el aislamiento de logs por test case funciona correctamente
const {
  initializeFileLogging,
  addLogEntry,
  saveLogsToFile,
  getActiveTestCaseIds,
  clearCurrentLogs,
} = require("../src/lib/fileLogger");
const { logHeader } = require("../src/lib/logger");
const fs = require("fs");
const path = require("path");

console.log("🧪 Testing Log Isolation Between Test Cases...\n");

async function testLogIsolation() {
  // Clear any existing logs
  clearCurrentLogs();

  // Test directory
  const testDir = path.join(__dirname, "temp-test-logs");

  try {
    // Simulate two parallel test cases
    const testCase1 = "TEST_CASE_001";
    const testCase2 = "TEST_CASE_002";

    // Initialize both test cases
    initializeFileLogging(testCase1, path.join(testDir, testCase1));
    initializeFileLogging(testCase2, path.join(testDir, testCase2));

    console.log("✅ Initialized test cases:", getActiveTestCaseIds());

    // Simulate logs from test case 1
    process.env.CURRENT_TEST_CASE_ID = testCase1;
    logHeader({}, `📧 Filling Email: ${testCase1}`);
    logHeader({}, `💳 Filling Card: ${testCase1}`);

    // Simulate logs from test case 2
    process.env.CURRENT_TEST_CASE_ID = testCase2;
    logHeader({}, `📧 Filling Email: ${testCase2}`);
    logHeader({}, `🏦 Selecting SPEI Payment: ${testCase2}`);

    // Add more logs to test case 1
    process.env.CURRENT_TEST_CASE_ID = testCase1;
    logHeader({}, `💰 Processing payment: ${testCase1}`);

    // Save logs for both test cases
    const logFile1 = await saveLogsToFile(testCase1);
    const logFile2 = await saveLogsToFile(testCase2);

    console.log(`\n📁 Log files created:`);
    console.log(`   ${testCase1}: ${logFile1}`);
    console.log(`   ${testCase2}: ${logFile2}`);

    // Verify isolation by reading the files
    if (fs.existsSync(logFile1) && fs.existsSync(logFile2)) {
      const content1 = fs.readFileSync(logFile1, "utf8");
      const content2 = fs.readFileSync(logFile2, "utf8");

      console.log(`\n🔍 Verification Results:`);

      // Check that each file only contains its own test case logs
      const case1HasOwnLogs =
        content1.includes(`Filling Email: ${testCase1}`) &&
        content1.includes(`Processing payment: ${testCase1}`);
      const case1HasOtherLogs = content1.includes(testCase2);

      const case2HasOwnLogs =
        content2.includes(`Filling Email: ${testCase2}`) &&
        content2.includes(`SPEI Payment: ${testCase2}`);
      const case2HasOtherLogs = content2.includes(testCase1);

      console.log(`   ${testCase1} file:`);
      console.log(`     ✅ Contains own logs: ${case1HasOwnLogs}`);
      console.log(
        `     ${
          case1HasOtherLogs ? "❌" : "✅"
        } Contains other test logs: ${case1HasOtherLogs}`
      );

      console.log(`   ${testCase2} file:`);
      console.log(`     ✅ Contains own logs: ${case2HasOwnLogs}`);
      console.log(
        `     ${
          case2HasOtherLogs ? "❌" : "✅"
        } Contains other test logs: ${case2HasOtherLogs}`
      );

      const isolationWorking =
        case1HasOwnLogs &&
        !case1HasOtherLogs &&
        case2HasOwnLogs &&
        !case2HasOtherLogs;

      console.log(
        `\n🎯 Overall Result: ${
          isolationWorking ? "✅ ISOLATION WORKING" : "❌ ISOLATION FAILED"
        }`
      );

      if (isolationWorking) {
        console.log(
          "🎉 Log isolation is working correctly! Each test case only contains its own logs."
        );
      } else {
        console.log(
          "🚨 Log isolation is NOT working. Logs are being mixed between test cases."
        );
      }
    } else {
      console.log("❌ Could not read log files for verification");
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    // Cleanup
    delete process.env.CURRENT_TEST_CASE_ID;
    clearCurrentLogs();

    // Remove test directory
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
        console.log("🧹 Test files cleaned up");
      }
    } catch (cleanupError) {
      console.warn("⚠️ Could not cleanup test files:", cleanupError.message);
    }
  }
}

if (require.main === module) {
  testLogIsolation();
}

module.exports = { testLogIsolation };
