#!/usr/bin/env node

/**
 * Quick script to update clusterTask.js systematically
 */

const fs = require("fs");
const path = require("path");

const CLUSTER_TASK_FILE = path.join(__dirname, "../src/runner/clusterTask.js");

function quickUpdate() {
  console.log("🚀 Doing quick systematic update...\n");

  let content = fs.readFileSync(CLUSTER_TASK_FILE, "utf8");

  // Most common patterns to update
  const patterns = [
    // Simple logHeader calls with empty object
    [/logHeader\(\{\}, (`[^`]+`)\);/g, "logHeader({}, $1, test_case_id);"],

    // logHeader calls with data object
    [/logHeader\((data), (`[^`]+`)\);/g, "logHeader($1, $2, test_case_id);"],

    // Simple logHeaderError calls with 3 params
    [
      /logHeaderError\(\s*\{\}\s*,\s*(`[^`]+`)\s*,\s*([^,)]+)\s*\);/g,
      "logHeaderError({}, $1, $2, test_case_id);",
    ],
  ];

  let totalChanges = 0;

  patterns.forEach(([regex, replacement], index) => {
    const matches = content.match(regex) || [];
    content = content.replace(regex, replacement);
    console.log(`Pattern ${index + 1}: ${matches.length} replacements`);
    totalChanges += matches.length;
  });

  // Write back
  fs.writeFileSync(CLUSTER_TASK_FILE, content, "utf8");

  console.log(`\n✅ Made ${totalChanges} total replacements`);
  console.log("📝 Note: Some multiline calls may still need manual updates");
}

if (require.main === module) {
  quickUpdate();
}

module.exports = { quickUpdate };
