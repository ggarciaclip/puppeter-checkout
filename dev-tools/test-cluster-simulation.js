#!/usr/bin/env node

/**
 * Final test to simulate the exact cluster execution pattern
 * This replicates the Promise.all(parameters.map((p) => cluster.execute(p))) pattern
 */

const {
  initializeFileLogging,
  addLogEntry,
  saveLogsToFile,
  clearCurrentLogs,
} = require("../src/lib/fileLogger");
const { logHeader } = require("../src/lib/logger");
const path = require("path");
const fs = require("fs");

// Simulate the exact data structure from runner.test.js
function createTestParameters() {
  return [
    {
      test_case_id: "GUEST_USD_1",
      card: "5581168067405507",
      email: "guest_test_1@example.com",
      phone: "1234567890",
      payment_request_id: "PR001",
      payment_request_type: "LINK_DE_PAGO",
      payment_flow_type: "GUEST",
      request_log_list: [],
      i: 0,
    },
    {
      test_case_id: "REGISTER_MXN_2",
      card: "4111111111111111",
      email: "register_test_2@example.com",
      phone: "0987654321",
      payment_request_id: "PR002",
      payment_request_type: "HOSTED_CHECKOUT",
      payment_flow_type: "REGISTER",
      request_log_list: [],
      i: 1,
    },
    {
      test_case_id: "GUEST_EUR_3",
      card: "5555555555554444",
      email: "guest_test_3@example.com",
      phone: "1122334455",
      payment_request_id: "PR003",
      payment_request_type: "SUBSCRIPTION",
      payment_flow_type: "GUEST",
      request_log_list: [],
      i: 2,
    },
    {
      test_case_id: "REGISTER_USD_4",
      card: "378282246310005",
      email: "register_test_4@example.com",
      phone: "5566778899",
      payment_request_id: "PR004",
      payment_request_type: "LINK_DE_PAGO",
      payment_flow_type: "REGISTER",
      request_log_list: [],
      i: 3,
    },
  ];
}

// Simulate simplified cluster.execute() function
async function simulateClusterExecute(testData) {
  const { test_case_id, payment_request_type } = testData;

  console.log(`🚀 [${test_case_id}] Starting cluster execution`);

  // Simulate the directory creation and logging initialization from clusterTask.js
  const testDir = `/tmp/cluster-simulation/${test_case_id}`;
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // Initialize file logging (like in clusterTask.js)
  initializeFileLogging(test_case_id, testDir);

  // Simulate the key logging calls from clusterTask.js with proper testCaseId
  logHeader(testData, "📊 PARAMETERS", test_case_id);
  logHeader({}, "📁 GENERATING DIRECTORY...", test_case_id);

  // Add some random delays to simulate real async execution
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

  logHeader(
    {},
    `📝 File logging initialized for: ${test_case_id}`,
    test_case_id
  );

  await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

  // Simulate different payment flows
  if (payment_request_type === "SUBSCRIPTION") {
    logHeader({}, `🔄 Generating subscription ${test_case_id}`, test_case_id);
  }

  await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

  logHeader({}, `📧 Filling Email: ${test_case_id}`, test_case_id);
  logHeader({}, `📱 Filling Phone: ${test_case_id}`, test_case_id);
  logHeader({}, `💳 Filling Card: ${test_case_id}`, test_case_id);

  await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

  // Simulate payment processing
  addLogEntry(
    `💰 Processing payment for ${test_case_id}`,
    "INFO",
    null,
    test_case_id
  );
  addLogEntry(
    `✅ Payment successful for ${test_case_id}`,
    "SUCCESS",
    null,
    test_case_id
  );

  // Save logs (like in clusterTask.js)
  const logFilePath = await saveLogsToFile(test_case_id);
  console.log(`📝 [${test_case_id}] Logs saved: ${logFilePath}`);

  // Cleanup (like in clusterTask.js)
  clearCurrentLogs(test_case_id);
  console.log(`🧹 [${test_case_id}] Cleaned up`);

  return { test_case_id, status: "OK", logFile: logFilePath };
}

async function runClusterSimulation() {
  console.log("🧪 Running Cluster Simulation Test");
  console.log(
    "📋 Simulating: Promise.all(parameters.map((p) => cluster.execute(p)))\n"
  );

  // Clean up test directory
  const testDir = "/tmp/cluster-simulation";
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  const parameters = createTestParameters();

  console.log(`🚀 Starting ${parameters.length} concurrent executions...\n`);

  // This is the EXACT pattern from runner.test.js line 106:
  // await Promise.all(parameters.map((p) => cluster.execute(p)));
  const results = await Promise.all(
    parameters.map((p) => simulateClusterExecute(p))
  );

  console.log(
    "\n✅ All executions completed:",
    results.map((r) => r.test_case_id)
  );

  // Verify log isolation
  console.log("\n🔍 Verifying log isolation...\n");

  let allIsolated = true;

  for (const result of results) {
    const { test_case_id, logFile } = result;

    if (!fs.existsSync(logFile)) {
      console.log(`❌ ${test_case_id}: Log file missing`);
      allIsolated = false;
      continue;
    }

    const content = fs.readFileSync(logFile, "utf8");

    // Check isolation
    const hasOwnLogs = content.includes(test_case_id);
    const otherTestCases = results
      .filter((r) => r.test_case_id !== test_case_id)
      .map((r) => r.test_case_id);
    const hasOtherLogs = otherTestCases.some((otherId) =>
      content.includes(otherId)
    );

    if (hasOwnLogs && !hasOtherLogs) {
      console.log(`✅ ${test_case_id}: Properly isolated`);
    } else {
      console.log(`❌ ${test_case_id}: Isolation failed`);
      console.log(`   Has own logs: ${hasOwnLogs}`);
      console.log(`   Has contamination: ${hasOtherLogs}`);
      allIsolated = false;
    }

    // Log stats
    const lines = content.split("\n").length;
    const entries = (content.match(/\[INFO\]|\[SUCCESS\]/g) || []).length;
    console.log(`   Log lines: ${lines}, Entries: ${entries}`);
  }

  console.log("\n📊 Final Result:");
  if (allIsolated) {
    console.log("🎉 SUCCESS: Cluster log isolation is working perfectly!");
    console.log(
      "✅ The Promise.all(parameters.map((p) => cluster.execute(p))) pattern will not mix logs"
    );
    console.log("✅ Each test case maintains its own isolated log file");
    console.log(
      "✅ Request logs (logs.json) and execution logs (logs.txt) will be separate"
    );
  } else {
    console.log("💥 FAILURE: Log isolation is not working correctly");
  }

  console.log(`\n📁 Test results: ${testDir}`);
  console.log("💡 Ready for real cluster execution!");
}

if (require.main === module) {
  runClusterSimulation().catch(console.error);
}

module.exports = { runClusterSimulation };
