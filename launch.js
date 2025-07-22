#!/usr/bin/env node

/**
 * PayClip E2E Test Runner Launcher
 * This script safely launches the interactive test runner with proper error handling
 */

const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
};

const emojis = {
  rocket: "🚀",
  gear: "⚙️",
  checkmark: "✅",
  cross: "❌",
  warning: "⚠️",
};

console.log(
  `${colors.cyan}${emojis.rocket} PayClip E2E Test Runner Launcher${colors.reset}\n`
);

// Check if interactive-test.js exists
const fs = require("fs");
if (!fs.existsSync("./interactive-test.js")) {
  console.error(
    `${colors.red}${emojis.cross} Error: interactive-test.js not found!${colors.reset}`
  );
  console.log(
    `${colors.yellow}Please run this launcher from the PayClip E2E project directory.${colors.reset}`
  );
  process.exit(1);
}

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);

console.log(`${colors.blue}Node.js Version: ${nodeVersion}${colors.reset}`);

if (majorVersion < 14) {
  console.log(
    `${colors.yellow}${emojis.warning} Warning: Node.js 14+ is recommended for best compatibility${colors.reset}`
  );
}

console.log(
  `${colors.green}${emojis.checkmark} Environment checks passed${colors.reset}`
);
console.log(
  `${colors.cyan}${emojis.gear} Starting PayClip E2E Test Runner...${colors.reset}\n`
);

// Launch the interactive test runner
try {
  const PayClipTestRunner = require("./interactive-test.js");
  const runner = new PayClipTestRunner();

  // Set up graceful shutdown
  process.on("SIGINT", () => {
    console.log(
      `\n${colors.yellow}${emojis.warning} Graceful shutdown initiated...${colors.reset}`
    );
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log(
      `\n${colors.yellow}${emojis.warning} Process terminated gracefully${colors.reset}`
    );
    process.exit(0);
  });

  // Start the runner
  runner.start().catch((error) => {
    console.error(
      `\n${colors.red}${emojis.cross} Fatal Error: ${error.message}${colors.reset}`
    );
    console.error(`${colors.yellow}Stack trace: ${error.stack}${colors.reset}`);
    console.log(
      `\n${colors.cyan}Please report this error if it persists.${colors.reset}`
    );
    process.exit(1);
  });
} catch (error) {
  console.error(
    `${colors.red}${emojis.cross} Startup Error: ${error.message}${colors.reset}`
  );
  console.error(`${colors.yellow}Stack trace: ${error.stack}${colors.reset}`);
  process.exit(1);
}
