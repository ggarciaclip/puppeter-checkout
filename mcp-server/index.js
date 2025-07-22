#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

// Server configuration
const server = new Server(
  {
    name: "payclip-testing-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// PayClip Testing Framework root path
const FRAMEWORK_ROOT = path.resolve("../");

// Available environments
const ENVIRONMENTS = ["dev", "stage"];

// Available payment types
const PAYMENT_TYPES = ["HOSTED_CHECKOUT", "LINK_DE_PAGO", "SUBSCRIPTION"];

// Available test modes
const TEST_MODES = ["silent", "verbose"];

/**
 * Execute npm test command with specified parameters
 */
function executeTest(environment, options = {}) {
  return new Promise((resolve, reject) => {
    const { type, just, record, verbose, customArgs } = options;

    // Build command
    let command = `npm run test:${environment}`;
    if (verbose) {
      command = `npm run test:${environment}:verbose`;
    }

    // Build arguments
    const args = [];
    if (type) args.push(`--type=${type}`);
    if (just) args.push(`--just=${just}`);
    if (record) args.push(`--record=${record}`);
    if (customArgs) args.push(...customArgs.split(" "));

    const fullCommand =
      args.length > 0 ? `${command} ${args.join(" ")}` : command;

    console.log(`🚀 Executing: ${fullCommand}`);

    // Execute command
    const child = spawn("sh", ["-c", fullCommand], {
      cwd: FRAMEWORK_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          success: true,
          command: fullCommand,
          output: stdout,
          exitCode: code,
        });
      } else {
        reject({
          success: false,
          command: fullCommand,
          output: stdout,
          error: stderr,
          exitCode: code,
        });
      }
    });

    child.on("error", (error) => {
      reject({
        success: false,
        command: fullCommand,
        error: error.message,
        exitCode: -1,
      });
    });
  });
}

/**
 * Get latest test results
 */
function getLatestResults(environment, paymentType) {
  const resultsPath = path.join(
    FRAMEWORK_ROOT,
    "completed_tests",
    "test_runs",
    `${environment.toUpperCase()}-${paymentType.toLowerCase()}`
  );

  if (!fs.existsSync(resultsPath)) {
    return { error: `No results found for ${environment}-${paymentType}` };
  }

  const directories = fs
    .readdirSync(resultsPath)
    .filter((dir) => fs.statSync(path.join(resultsPath, dir)).isDirectory())
    .sort()
    .reverse();

  if (directories.length === 0) {
    return { error: `No test runs found for ${environment}-${paymentType}` };
  }

  const latestDir = directories[0];
  const latestPath = path.join(resultsPath, latestDir);

  // Get Excel file
  const excelFiles = fs
    .readdirSync(latestPath)
    .filter((file) => file.endsWith(".xlsx"));
  const excelFile = excelFiles.length > 0 ? excelFiles[0] : null;

  // Get test case directories
  const testCases = fs
    .readdirSync(latestPath)
    .filter((item) => fs.statSync(path.join(latestPath, item)).isDirectory())
    .map((testCase) => {
      const testCasePath = path.join(latestPath, testCase);
      const files = fs.readdirSync(testCasePath);
      return {
        name: testCase,
        files: files,
        hasLogs: files.includes("logs.json"),
        hasScreenshots: files.some((f) => f.endsWith(".png")),
        hasSuccess: files.includes("success-pay-page.png"),
        hasError: files.includes("error-ocurred.png"),
      };
    });

  return {
    timestamp: latestDir,
    path: latestPath,
    excelReport: excelFile,
    testCases: testCases,
    totalTests: testCases.length,
    successfulTests: testCases.filter((tc) => tc.hasSuccess).length,
    failedTests: testCases.filter((tc) => tc.hasError).length,
  };
}

/**
 * Get available parameters from Excel files
 */
function getAvailableParameters(environment) {
  const paramFile = path.join(FRAMEWORK_ROOT, `parameters_${environment}.xlsx`);

  if (!fs.existsSync(paramFile)) {
    return {
      error: `Parameters file not found: parameters_${environment}.xlsx`,
    };
  }

  // Return file info (actual Excel parsing would require additional library)
  const stats = fs.statSync(paramFile);
  return {
    file: `parameters_${environment}.xlsx`,
    size: stats.size,
    lastModified: stats.mtime,
    path: paramFile,
  };
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "run_payclip_test",
        description:
          "Execute PayClip E2E tests with various options and filters",
        inputSchema: {
          type: "object",
          properties: {
            environment: {
              type: "string",
              enum: ENVIRONMENTS,
              description: "Test environment (dev or stage)",
            },
            type: {
              type: "string",
              enum: PAYMENT_TYPES,
              description: "Payment type filter",
            },
            just: {
              type: "number",
              description: "Run only first N tests (1, 2, 3, etc.)",
              minimum: 1,
            },
            record: {
              type: "boolean",
              description: "Enable video recording",
            },
            verbose: {
              type: "boolean",
              description: "Enable verbose logging mode",
            },
            customArgs: {
              type: "string",
              description: "Additional custom arguments",
            },
          },
          required: ["environment"],
        },
      },
      {
        name: "get_test_results",
        description:
          "Get latest test results for specified environment and payment type",
        inputSchema: {
          type: "object",
          properties: {
            environment: {
              type: "string",
              enum: ENVIRONMENTS,
              description: "Test environment (dev or stage)",
            },
            paymentType: {
              type: "string",
              enum: PAYMENT_TYPES,
              description: "Payment type",
            },
          },
          required: ["environment", "paymentType"],
        },
      },
      {
        name: "list_available_tests",
        description:
          "List all available test configurations and current status",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_test_parameters",
        description:
          "Get available test parameters from Excel configuration files",
        inputSchema: {
          type: "object",
          properties: {
            environment: {
              type: "string",
              enum: ENVIRONMENTS,
              description: "Environment to get parameters for",
            },
          },
          required: ["environment"],
        },
      },
      {
        name: "run_unit_tests",
        description: "Execute unit tests for the framework",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "generate_test_command",
        description:
          "Generate the exact npm command for specified test configuration",
        inputSchema: {
          type: "object",
          properties: {
            environment: {
              type: "string",
              enum: ENVIRONMENTS,
              description: "Test environment",
            },
            type: {
              type: "string",
              enum: PAYMENT_TYPES,
              description: "Payment type filter",
            },
            just: {
              type: "number",
              description: "Run only first N tests",
            },
            record: {
              type: "boolean",
              description: "Enable video recording",
            },
            verbose: {
              type: "boolean",
              description: "Enable verbose logging",
            },
          },
          required: ["environment"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "run_payclip_test": {
        const { environment, type, just, record, verbose, customArgs } = args;

        const result = await executeTest(environment, {
          type,
          just,
          record,
          verbose,
          customArgs,
        });

        return {
          content: [
            {
              type: "text",
              text: `✅ Test execution completed successfully!
              
🚀 **Command**: ${result.command}
📊 **Exit Code**: ${result.exitCode}
📋 **Output**:
\`\`\`
${result.output}
\`\`\`

🎉 Check the \`completed_tests/test_runs/\` directory for detailed results and reports.`,
            },
          ],
        };
      }

      case "get_test_results": {
        const { environment, paymentType } = args;
        const results = getLatestResults(environment, paymentType);

        if (results.error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ **Error**: ${results.error}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `📊 **Latest Results for ${environment.toUpperCase()}-${paymentType}**

🕐 **Timestamp**: ${results.timestamp}
📁 **Path**: ${results.path}
📈 **Total Tests**: ${results.totalTests}
✅ **Successful**: ${results.successfulTests}
❌ **Failed**: ${results.failedTests}
📊 **Excel Report**: ${results.excelReport || "Not found"}

🧪 **Test Cases**:
${results.testCases
  .map(
    (tc) => `
• **${tc.name}**
  - Logs: ${tc.hasLogs ? "✅" : "❌"}
  - Screenshots: ${tc.hasScreenshots ? "✅" : "❌"}
  - Status: ${
    tc.hasSuccess ? "🎉 Success" : tc.hasError ? "💔 Failed" : "⚠️ Unknown"
  }
`
  )
  .join("")}`,
            },
          ],
        };
      }

      case "list_available_tests": {
        const testRunsPath = path.join(
          FRAMEWORK_ROOT,
          "completed_tests",
          "test_runs"
        );
        let availableTests = [];

        if (fs.existsSync(testRunsPath)) {
          availableTests = fs
            .readdirSync(testRunsPath)
            .filter((dir) =>
              fs.statSync(path.join(testRunsPath, dir)).isDirectory()
            );
        }

        return {
          content: [
            {
              type: "text",
              text: `🧪 **PayClip E2E Testing Framework Overview**

🌍 **Available Environments**: ${ENVIRONMENTS.map((env) =>
                env.toUpperCase()
              ).join(", ")}
💳 **Payment Types**: ${PAYMENT_TYPES.join(", ")}
🔊 **Test Modes**: ${TEST_MODES.join(", ")}

📁 **Available Test Configurations**:
${
  availableTests.length > 0
    ? availableTests.map((test) => `• ${test}`).join("\n")
    : "No test results found yet"
}

🚀 **Quick Commands**:
• \`run_payclip_test\` - Execute tests with custom filters
• \`get_test_results\` - View latest results
• \`get_test_parameters\` - Check Excel configurations
• \`run_unit_tests\` - Execute framework unit tests
• \`generate_test_command\` - Generate exact npm commands

💡 **Example Combinations**:
• DEV environment, HOSTED_CHECKOUT type, verbose mode
• STAGE environment, LINK_DE_PAGO type, first 2 tests only
• Any environment with video recording enabled`,
            },
          ],
        };
      }

      case "get_test_parameters": {
        const { environment } = args;
        const params = getAvailableParameters(environment);

        if (params.error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ **Error**: ${params.error}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `📋 **Test Parameters for ${environment.toUpperCase()}**

📄 **File**: ${params.file}
📊 **Size**: ${(params.size / 1024).toFixed(2)} KB
🕐 **Last Modified**: ${params.lastModified.toISOString()}
📁 **Path**: ${params.path}

ℹ️ The Excel file contains test cases with:
• Test case names
• Card numbers for testing
• Payment Request IDs
• Payment types (HOSTED_CHECKOUT, LINK_DE_PAGO, SUBSCRIPTION)
• Payment flows (GUEST, REGISTER)
• Amounts and currencies (for HOSTED_CHECKOUT)`,
            },
          ],
        };
      }

      case "run_unit_tests": {
        const result = await executeTest("unit", {});

        return {
          content: [
            {
              type: "text",
              text: `🧪 **Unit Tests Execution**

🚀 **Command**: npm run unit
📊 **Exit Code**: ${result.exitCode}
📋 **Output**:
\`\`\`
${result.output}
\`\`\`

${result.success ? "✅ Unit tests passed!" : "❌ Unit tests failed!"}`,
            },
          ],
        };
      }

      case "generate_test_command": {
        const { environment, type, just, record, verbose } = args;

        let command = `npm run test:${environment}`;
        if (verbose) {
          command = `npm run test:${environment}:verbose`;
        }

        const argsList = [];
        if (type) argsList.push(`--type=${type}`);
        if (just) argsList.push(`--just=${just}`);
        if (record) argsList.push(`--record=${record}`);

        const fullCommand =
          argsList.length > 0 ? `${command} ${argsList.join(" ")}` : command;

        return {
          content: [
            {
              type: "text",
              text: `🚀 **Generated Test Command**

\`\`\`bash
${fullCommand}
\`\`\`

📋 **Command Breakdown**:
• **Environment**: ${environment.toUpperCase()}
• **Mode**: ${verbose ? "Verbose (full logs)" : "Silent (clean output)"}
${type ? `• **Payment Type**: ${type}` : ""}
${just ? `• **Test Limit**: First ${just} tests only` : ""}
${record ? `• **Video Recording**: Enabled` : ""}

💡 **Alternative with environment variable**:
\`\`\`bash
${verbose ? "VERBOSE_LOGS=true " : ""}${command.replace(":verbose", "")}${
                argsList.length > 0 ? " " + argsList.join(" ") : ""
              }
\`\`\`

🎯 **What this will do**:
- Execute PayClip E2E tests in ${environment.toUpperCase()} environment
- Generate screenshots and ${verbose ? "detailed" : "filtered"} JSON logs
- Create Excel report with results
- Save everything to \`completed_tests/test_runs/\` directory`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `❌ **Error executing ${name}**: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PayClip Testing MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
