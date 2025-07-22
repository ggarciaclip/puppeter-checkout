#!/usr/bin/env node

/**
 * Script to manually update logHeader and logHeaderError calls in clusterTask.js
 * Since the calls are often multiline, we'll be more specific
 */

const fs = require("fs");
const path = require("path");

const CLUSTER_TASK_FILE = path.join(__dirname, "../src/runner/clusterTask.js");

function updateLogHeaderCalls() {
  console.log("📝 Reading clusterTask.js and showing logHeader calls...\n");

  let content = fs.readFileSync(CLUSTER_TASK_FILE, "utf8");
  const lines = content.split("\n");

  // Find all logHeader and logHeaderError calls
  const callsToUpdate = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (
      line.trim().startsWith("logHeader(") &&
      !line.includes("test_case_id")
    ) {
      callsToUpdate.push({
        line: i + 1,
        content: line.trim(),
        type: "logHeader",
      });
    }

    if (
      line.trim().startsWith("logHeaderError(") &&
      !line.includes("test_case_id")
    ) {
      callsToUpdate.push({
        line: i + 1,
        content: line.trim(),
        type: "logHeaderError",
      });
    }
  }

  console.log(`Found ${callsToUpdate.length} calls that need updating:\n`);

  callsToUpdate.forEach((call, index) => {
    console.log(`${index + 1}. Line ${call.line}: ${call.content}`);
  });

  console.log(
    '\n📝 These calls need to have ", test_case_id" added as the last parameter'
  );
  console.log(
    "💡 Since many are multiline, I'll show you the pattern to update manually"
  );

  return callsToUpdate;
}

if (require.main === module) {
  updateLogHeaderCalls();
}

module.exports = { updateLogHeaderCalls };
