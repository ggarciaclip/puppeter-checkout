#!/usr/bin/env node

// Simple validation script for PayClip Testing MCP Server
import fs from "fs";
import path from "path";

const FRAMEWORK_ROOT = path.resolve("../");
const MCP_SERVER_ROOT = process.cwd();

console.log("🧪 PayClip Testing MCP Server - Validation");
console.log("==========================================");
console.log("");

// Check framework structure
console.log("📁 Checking framework structure...");
const requiredFiles = [
  "package.json",
  "parameters_dev.xlsx",
  "parameters_stage.xlsx",
  "src/runner/clusterTask.js",
  "src/lib/logger.js",
  "src/lib/formatRequestLogs.js",
];

let frameworkOk = true;
for (const file of requiredFiles) {
  const filePath = path.join(FRAMEWORK_ROOT, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - NOT FOUND`);
    frameworkOk = false;
  }
}

// Check MCP server files
console.log("");
console.log("📁 Checking MCP server files...");
const mcpFiles = [
  "package.json",
  "index.js",
  "README.md",
  "QUICKSTART.md",
  "examples.md",
];

let mcpOk = true;
for (const file of mcpFiles) {
  const filePath = path.join(MCP_SERVER_ROOT, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - NOT FOUND`);
    mcpOk = false;
  }
}

// Check npm scripts in framework
console.log("");
console.log("📦 Checking framework npm scripts...");
try {
  const packagePath = path.join(FRAMEWORK_ROOT, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const scripts = packageJson.scripts || {};

  const expectedScripts = [
    "test:dev",
    "test:stage",
    "test:dev:verbose",
    "test:stage:verbose",
  ];

  for (const script of expectedScripts) {
    if (scripts[script]) {
      console.log(`   ✅ ${script}: ${scripts[script]}`);
    } else {
      console.log(`   ❌ ${script} - NOT FOUND`);
      frameworkOk = false;
    }
  }
} catch (error) {
  console.log(`   ❌ Error reading package.json: ${error.message}`);
  frameworkOk = false;
}

// Check environments and types
console.log("");
console.log("🌍 Available configurations...");
console.log("   Environments: DEV, STAGE");
console.log("   Payment Types: HOSTED_CHECKOUT, LINK_DE_PAGO, SUBSCRIPTION");
console.log("   Test Modes: silent (default), verbose");
console.log("   Options: --type, --just, --record");

// Check test results directory
console.log("");
console.log("📊 Checking test results structure...");
const resultsPath = path.join(FRAMEWORK_ROOT, "completed_tests", "test_runs");
if (fs.existsSync(resultsPath)) {
  console.log(`   ✅ Results directory exists: ${resultsPath}`);
  const resultDirs = fs
    .readdirSync(resultsPath)
    .filter((dir) => fs.statSync(path.join(resultsPath, dir)).isDirectory());
  console.log(`   📁 Found ${resultDirs.length} test result directories:`);
  resultDirs.forEach((dir) => console.log(`      • ${dir}`));
} else {
  console.log(
    `   ⚠️  Results directory not found (will be created on first test run)`
  );
}

// Final status
console.log("");
console.log("🎯 Validation Summary");
console.log("===================");
if (frameworkOk && mcpOk) {
  console.log("✅ All systems are ready!");
  console.log("");
  console.log("🚀 Next steps:");
  console.log("1. Configure Claude Desktop with the MCP server");
  console.log("2. Restart Claude Desktop");
  console.log("3. Start using conversational test commands");
  console.log("");
  console.log("💡 Example commands:");
  console.log('   "Ejecuta un test básico en DEV"');
  console.log('   "Muéstrame los resultados de HOSTED_CHECKOUT"');
  console.log('   "Lista todos los tests disponibles"');
} else {
  console.log("❌ Some issues found. Please review the errors above.");
}

console.log("");
console.log("📚 Documentation:");
console.log(`   • Main README: ${path.join(FRAMEWORK_ROOT, "README.md")}`);
console.log(`   • MCP Server: ${path.join(MCP_SERVER_ROOT, "README.md")}`);
console.log(`   • Quick Start: ${path.join(MCP_SERVER_ROOT, "QUICKSTART.md")}`);
console.log(`   • Examples: ${path.join(MCP_SERVER_ROOT, "examples.md")}`);
