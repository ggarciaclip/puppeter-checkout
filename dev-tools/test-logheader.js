const { logHeader } = require("../src/lib/logger");
const {
  initializeFileLogging,
  saveLogsToFile,
} = require("../src/lib/fileLogger");
const fs = require("fs");

async function testLogHeader() {
  console.log("🧪 Testing logHeader functionality...");

  const dir = "/tmp/logheader-test-" + Date.now();
  fs.mkdirSync(dir, { recursive: true });

  const testCaseId = "LOGHEADER_TEST";
  initializeFileLogging(testCaseId, dir);

  console.log("✅ Testing logHeader with testCaseId...");
  logHeader({ card: "1234****5678" }, "Test with testCaseId", testCaseId);

  console.log("✅ Testing logHeader without testCaseId...");
  logHeader({}, "Test without testCaseId");

  console.log("✅ Saving logs...");
  const logFile = await saveLogsToFile(testCaseId);
  const content = fs.readFileSync(logFile, "utf8");

  const hasWithId = content.includes("with testCaseId");
  const hasWithoutId = content.includes("without testCaseId");

  console.log('✅ File content includes "with testCaseId":', hasWithId);
  console.log('✅ File content excludes "without testCaseId":', !hasWithoutId);

  if (hasWithId && !hasWithoutId) {
    console.log("🎉 logHeader is working correctly for isolation!");
  } else {
    console.log("❌ logHeader isolation needs fixing");
  }

  console.log("\n📄 Sample content:");
  console.log(content.split("\n").slice(5, 10).join("\n"));
}

testLogHeader().catch(console.error);
