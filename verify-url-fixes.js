#!/usr/bin/env node

/**
 * URL Access Error Verification Script
 *
 * This script verifies that all instances of unsafe URL access have been fixed
 * and demonstrates the proper error handling for page.url() calls.
 */

const path = require("path");
const fs = require("fs");

console.log("🔍 Verifying URL access fixes...\n");

// Files that should have URL access fixes
const filesToCheck = [
  "src/runner/clusterTask.js",
  "src/image/takeScreenshot.js",
  "src/runner/clusterTaskWithStrategy.js",
];

// Pattern that should NOT exist (unsafe URL access)
const unsafePatterns = [
  /\.url\(\)\.catch/g,
  /targetPage\.url\(\)(?!\s*;?\s*$)/g, // url() not followed by immediate end
];

// Pattern that SHOULD exist (safe URL access)
const safePatterns = [
  /if\s*\(\s*.*Page\s*&&\s*!.*Page\.isClosed\(\)\s*\)\s*\{[\s\S]*?\.url\(\)/g,
  /try\s*\{[\s\S]*?\.url\(\)[\s\S]*?\}\s*catch/g,
];

let hasErrors = false;

for (const filePath of filesToCheck) {
  const fullPath = path.join(__dirname, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    continue;
  }

  const content = fs.readFileSync(fullPath, "utf8");

  console.log(`📁 Checking: ${filePath}`);

  // Check for unsafe patterns
  for (const pattern of unsafePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`❌ Found unsafe URL access pattern: ${pattern}`);
      console.log(`   Matches: ${matches.join(", ")}`);
      hasErrors = true;
    }
  }

  // Check for safe patterns
  let hasSafePatterns = false;
  for (const pattern of safePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      hasSafePatterns = true;
      break;
    }
  }

  if (content.includes(".url()") && !hasSafePatterns) {
    console.log(`⚠️  Found .url() calls but no safe patterns detected`);
    hasErrors = true;
  } else if (content.includes(".url()")) {
    console.log(`✅ Safe URL access patterns found`);
  } else {
    console.log(`ℹ️  No URL access in this file`);
  }

  console.log("");
}

// Additional verification: Check for any remaining instances
console.log("🔍 Additional verification...\n");

// Check for any .url().catch patterns in the entire src directory
const { execSync } = require("child_process");

try {
  const result = execSync('grep -r "\\.url()\\." src/', { encoding: "utf8" });
  if (result.trim()) {
    console.log("❌ Found potential unsafe URL patterns:");
    console.log(result);
    hasErrors = true;
  } else {
    console.log("✅ No unsafe URL patterns found in grep search");
  }
} catch (error) {
  // No matches found - this is good!
  console.log("✅ No unsafe URL patterns found in grep search");
}

console.log("\n" + "=".repeat(50));

if (hasErrors) {
  console.log("❌ VERIFICATION FAILED: Found unsafe URL access patterns");
  console.log("\n💡 Recommended actions:");
  console.log("1. Fix any remaining unsafe URL access patterns");
  console.log("2. Clear any cached processes or test runs");
  console.log("3. Restart the testing framework");
  process.exit(1);
} else {
  console.log("✅ VERIFICATION PASSED: All URL access patterns are safe");
  console.log("\n💡 If you're still seeing URL errors:");
  console.log("1. The error might be from a cached test run");
  console.log("2. Try restarting the test framework");
  console.log("3. Clear any background processes");
  console.log("4. The error might be from Puppeteer internals (not our code)");
}

console.log("\n🏁 Verification complete!");
