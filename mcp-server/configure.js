#!/usr/bin/env node

// Auto-generate MCP configuration for Claude Desktop
import fs from "fs";
import os from "os";
import path from "path";

const MCP_SERVER_PATH = process.cwd();

console.log("🤖 PayClip Testing MCP - Configuration Generator");
console.log("===============================================");
console.log("");

// Detect OS and set config path
let configPath;
const platform = os.platform();

switch (platform) {
  case "darwin": // macOS
    configPath = path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "Claude",
      "claude_desktop_config.json"
    );
    break;
  case "win32": // Windows
    configPath = path.join(
      os.homedir(),
      "AppData",
      "Roaming",
      "Claude",
      "claude_desktop_config.json"
    );
    break;
  case "linux": // Linux
    configPath = path.join(
      os.homedir(),
      ".config",
      "Claude",
      "claude_desktop_config.json"
    );
    break;
  default:
    configPath = path.join(
      os.homedir(),
      ".claude",
      "claude_desktop_config.json"
    );
}

console.log(`🖥️  Detected OS: ${platform}`);
console.log(`📁 Config path: ${configPath}`);
console.log("");

// Generate configuration
const mcpConfig = {
  mcpServers: {
    "payclip-testing": {
      command: "node",
      args: ["index.js"],
      cwd: MCP_SERVER_PATH,
      env: {
        NODE_ENV: "production",
      },
    },
  },
};

// Check if config directory exists
const configDir = path.dirname(configPath);
if (!fs.existsSync(configDir)) {
  console.log(`📁 Creating config directory: ${configDir}`);
  fs.mkdirSync(configDir, { recursive: true });
}

// Read existing config or create new one
let existingConfig = {};
if (fs.existsSync(configPath)) {
  console.log("📖 Reading existing configuration...");
  try {
    const configContent = fs.readFileSync(configPath, "utf8");
    existingConfig = JSON.parse(configContent);
    console.log("   ✅ Existing config loaded");
  } catch (error) {
    console.log(`   ⚠️  Error reading existing config: ${error.message}`);
    console.log("   🔄 Will create new config");
  }
} else {
  console.log("📝 No existing config found, creating new one...");
}

// Merge configurations
if (!existingConfig.mcpServers) {
  existingConfig.mcpServers = {};
}

existingConfig.mcpServers["payclip-testing"] =
  mcpConfig.mcpServers["payclip-testing"];

// Write configuration
try {
  fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));
  console.log("");
  console.log("✅ Configuration written successfully!");
  console.log("");
  console.log("📋 Configuration details:");
  console.log(`   Server name: payclip-testing`);
  console.log(`   Command: node index.js`);
  console.log(`   Working directory: ${MCP_SERVER_PATH}`);
  console.log("");
  console.log("🎯 Next steps:");
  console.log("1. Restart Claude Desktop");
  console.log("2. Open a new conversation");
  console.log('3. Ask: "What tools do you have available?"');
  console.log("4. You should see PayClip Testing tools listed");
  console.log("");
  console.log("💡 Example commands you can try:");
  console.log('   "Run a basic PayClip test in DEV environment"');
  console.log('   "Show me the latest HOSTED_CHECKOUT results"');
  console.log('   "List all available test configurations"');
  console.log('   "Execute 2 LINK_DE_PAGO tests with recording"');
  console.log("");

  // Show the configuration
  console.log("📄 Generated configuration:");
  console.log("```json");
  console.log(JSON.stringify(existingConfig, null, 2));
  console.log("```");
} catch (error) {
  console.log("");
  console.log(`❌ Error writing configuration: ${error.message}`);
  console.log("");
  console.log("🔧 Manual configuration required:");
  console.log(`1. Create file: ${configPath}`);
  console.log("2. Add this content:");
  console.log("```json");
  console.log(JSON.stringify(existingConfig, null, 2));
  console.log("```");
}

console.log("");
console.log("📚 Documentation:");
console.log("   • README: ./README.md");
console.log("   • Quick Start: ./QUICKSTART.md");
console.log("   • Examples: ./examples.md");
console.log("   • All configs: ./MCP_CONFIGS.md");
