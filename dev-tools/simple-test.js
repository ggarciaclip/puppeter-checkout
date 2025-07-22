// Simple test to verify file logging system
console.log("🧪 Simple test starting...");

try {
  const {
    initializeFileLogging,
    addLogEntry,
  } = require("../src/lib/fileLogger");

  console.log("✅ Successfully imported fileLogger");

  // Test basic functionality
  initializeFileLogging("TEST_SIMPLE", "/tmp/test-simple");
  console.log("✅ Successfully initialized file logging");

  addLogEntry("Test message", "INFO", null, "TEST_SIMPLE");
  console.log("✅ Successfully added log entry");

  console.log("🎉 All basic tests passed!");
} catch (error) {
  console.error("❌ Error:", error.message);
  console.error("Stack:", error.stack);
}
