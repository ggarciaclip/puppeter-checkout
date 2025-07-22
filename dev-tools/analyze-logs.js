#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Analyze existing log files to detect log mixing issues
 */
function analyzeExistingLogs() {
  console.log("🔍 Analyzing existing log files for mixing issues...\n");

  const testRunsDir = path.join(__dirname, "../completed_tests/test_runs");

  if (!fs.existsSync(testRunsDir)) {
    console.log("❌ Test runs directory not found:", testRunsDir);
    return;
  }

  const issues = [];
  let totalLogsAnalyzed = 0;
  let logsWithIssues = 0;

  // Walk through all test run directories
  function walkDirectory(dir) {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);

        if (item.isDirectory()) {
          walkDirectory(fullPath);
        } else if (item.name === "logs.txt") {
          analyzeLogFile(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Cannot read directory ${dir}: ${error.message}`);
    }
  }

  function analyzeLogFile(logFilePath) {
    try {
      const content = fs.readFileSync(logFilePath, "utf8");
      totalLogsAnalyzed++;

      // Extract the expected test case ID from the file path
      const pathParts = logFilePath.split(path.sep);
      const testCaseDir = pathParts[pathParts.length - 2]; // Directory name should be test case ID

      // Extract the test case ID from the header
      const headerMatch = content.match(/📋 LOGS DE EJECUCIÓN - (.+)/);
      const expectedTestCaseId = headerMatch ? headerMatch[1] : testCaseDir;

      // Find all log entries that mention test case IDs
      const testCaseReferences = [];
      const lines = content.split("\n");

      for (const line of lines) {
        // Look for patterns like "Filling Email: SOME_TEST_CASE" or "Processing: SOME_TEST_CASE"
        const matches = line.match(/:\s+([A-Z_]+(?:_[A-Z_]+)*)/g);
        if (matches) {
          for (const match of matches) {
            const potentialTestCaseId = match.substring(2); // Remove ": " prefix
            // Check if it looks like a test case ID (all caps with underscores)
            if (
              /^[A-Z][A-Z_]+[A-Z]$/.test(potentialTestCaseId) &&
              potentialTestCaseId.length > 5
            ) {
              testCaseReferences.push({
                line: line.trim(),
                testCaseId: potentialTestCaseId,
              });
            }
          }
        }
      }

      // Check for mixing issues
      const uniqueTestCaseIds = [
        ...new Set(testCaseReferences.map((ref) => ref.testCaseId)),
      ];
      const foreignTestCaseIds = uniqueTestCaseIds.filter(
        (id) => id !== expectedTestCaseId
      );

      if (foreignTestCaseIds.length > 0) {
        logsWithIssues++;
        const issue = {
          file: logFilePath,
          expectedTestCaseId,
          foreignTestCaseIds,
          mixedEntries: testCaseReferences.filter(
            (ref) => ref.testCaseId !== expectedTestCaseId
          ),
          relativePath: path.relative(process.cwd(), logFilePath),
        };
        issues.push(issue);
      }
    } catch (error) {
      console.warn(
        `Warning: Cannot analyze log file ${logFilePath}: ${error.message}`
      );
    }
  }

  // Start analysis
  walkDirectory(testRunsDir);

  // Report results
  console.log(`📊 Analysis Results:`);
  console.log(`   Total log files analyzed: ${totalLogsAnalyzed}`);
  console.log(`   Files with mixing issues: ${logsWithIssues}`);
  console.log(`   Clean files: ${totalLogsAnalyzed - logsWithIssues}`);

  if (issues.length > 0) {
    console.log(`\n🚨 Detected Mixing Issues:`);

    issues.forEach((issue, index) => {
      console.log(`\n   ${index + 1}. ${issue.relativePath}`);
      console.log(`      Expected test case: ${issue.expectedTestCaseId}`);
      console.log(
        `      Foreign test cases found: ${issue.foreignTestCaseIds.join(", ")}`
      );
      console.log(`      Mixed entries: ${issue.mixedEntries.length}`);

      if (issue.mixedEntries.length <= 5) {
        issue.mixedEntries.forEach((entry) => {
          console.log(`        - ${entry.line.substring(0, 80)}...`);
        });
      } else {
        console.log(
          `        - ${issue.mixedEntries[0].line.substring(0, 80)}...`
        );
        console.log(
          `        - ... and ${issue.mixedEntries.length - 1} more entries`
        );
      }
    });

    console.log(`\n💡 Recommendations:`);
    console.log(
      `   1. Review the file logging system to ensure proper test case isolation`
    );
    console.log(
      `   2. Check that test cases set process.env.CURRENT_TEST_CASE_ID correctly`
    );
    console.log(
      `   3. Verify that parallel test execution doesn't share logging contexts`
    );
  } else {
    console.log(
      `\n✅ No mixing issues detected! All log files appear to be properly isolated.`
    );
  }

  return {
    totalFiles: totalLogsAnalyzed,
    issuesFound: logsWithIssues,
    issues: issues,
  };
}

if (require.main === module) {
  analyzeExistingLogs();
}

module.exports = { analyzeExistingLogs };
