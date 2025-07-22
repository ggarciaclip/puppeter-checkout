#!/usr/bin/env node

/**
 * PayClip Test History Manager CLI
 * Utility to manage test run history and cleanup old test runs
 */

const {
  cleanAllOldTestRuns,
  getTestRunStats,
  formatBytes,
  MAX_TEST_RUNS_PER_TYPE,
} = require("./src/lib/testHistoryManager");
const fs = require("fs");
const path = require("path");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

// Emojis
const emojis = {
  cleanup: "🧹",
  stats: "📊",
  warning: "⚠️",
  success: "✅",
  error: "❌",
  info: "ℹ️",
  folder: "📁",
  file: "📄",
  rocket: "🚀",
};

class TestHistoryManagerCLI {
  constructor() {
    this.baseDir = "completed_tests/test_runs";
  }

  // Display help information
  showHelp() {
    console.log(`
${colors.cyan}${emojis.rocket} PayClip Test History Manager${colors.reset}

${colors.yellow}Usage:${colors.reset}
  node test-history-manager.js [command] [options]

${colors.yellow}Commands:${colors.reset}
  ${colors.green}stats${colors.reset}     Show statistics for all payment types
  ${colors.green}clean${colors.reset}     Clean old test runs (keep only ${MAX_TEST_RUNS_PER_TYPE} per type)
  ${colors.green}list${colors.reset}      List all payment types and their test runs
  ${colors.green}help${colors.reset}      Show this help message

${colors.yellow}Options:${colors.reset}
  --type [TYPE]     Specify a specific payment type (e.g., DEV-link_de_pago)
  --dry-run         Show what would be deleted without actually deleting
  --verbose         Show detailed output

${colors.yellow}Examples:${colors.reset}
  node test-history-manager.js stats
  node test-history-manager.js clean --dry-run
  node test-history-manager.js clean --type DEV-link_de_pago
  node test-history-manager.js list --verbose
`);
  }

  // Show statistics for all payment types
  async showStats(options = {}) {
    console.log(
      `${colors.cyan}${emojis.stats} Test Run Statistics${colors.reset}\n`
    );

    if (!fs.existsSync(this.baseDir)) {
      console.log(
        `${colors.yellow}${emojis.warning} No test runs directory found: ${this.baseDir}${colors.reset}`
      );
      return;
    }

    // Get all payment types
    const paymentTypes = fs
      .readdirSync(this.baseDir)
      .filter((dir) => {
        const fullPath = path.join(this.baseDir, dir);
        return fs.statSync(fullPath).isDirectory();
      })
      .sort();

    if (paymentTypes.length === 0) {
      console.log(
        `${colors.yellow}${emojis.warning} No payment types found${colors.reset}`
      );
      return;
    }

    console.log(
      `${colors.blue}Found ${paymentTypes.length} payment types:${colors.reset}\n`
    );

    let totalRuns = 0;
    let needsCleanup = 0;

    for (const paymentType of paymentTypes) {
      if (options.type && paymentType !== options.type) {
        continue;
      }

      const stats = getTestRunStats(paymentType);
      totalRuns += stats.count;

      const statusColor = stats.needsCleanup ? colors.yellow : colors.green;
      const statusIcon = stats.needsCleanup ? emojis.warning : emojis.success;

      console.log(`${statusColor}${statusIcon} ${paymentType}${colors.reset}`);
      console.log(`   Test runs: ${stats.count}/${MAX_TEST_RUNS_PER_TYPE}`);

      if (stats.needsCleanup) {
        needsCleanup++;
        console.log(
          `   ${colors.red}Excess runs: ${stats.excess} (needs cleanup)${colors.reset}`
        );
      }

      if (options.verbose && stats.runs) {
        console.log(`   Recent runs:`);
        stats.runs.slice(0, 5).forEach((run, index) => {
          const date = run.createdAt.toLocaleDateString();
          const time = run.createdAt.toLocaleTimeString();
          console.log(`     ${index + 1}. ${run.name} (${date} ${time})`);
        });
        if (stats.runs.length > 5) {
          console.log(`     ... and ${stats.runs.length - 5} more`);
        }
      }

      console.log("");
    }

    console.log(`${colors.cyan}Summary:${colors.reset}`);
    console.log(`  Total payment types: ${paymentTypes.length}`);
    console.log(`  Total test runs: ${totalRuns}`);
    console.log(`  Payment types needing cleanup: ${needsCleanup}`);
    console.log(`  Maximum runs per type: ${MAX_TEST_RUNS_PER_TYPE}`);
  }

  // List all payment types and their test runs
  async listTestRuns(options = {}) {
    console.log(
      `${colors.cyan}${emojis.folder} Test Run Directories${colors.reset}\n`
    );

    if (!fs.existsSync(this.baseDir)) {
      console.log(
        `${colors.yellow}${emojis.warning} No test runs directory found: ${this.baseDir}${colors.reset}`
      );
      return;
    }

    const paymentTypes = fs
      .readdirSync(this.baseDir)
      .filter((dir) => {
        const fullPath = path.join(this.baseDir, dir);
        return fs.statSync(fullPath).isDirectory();
      })
      .sort();

    if (paymentTypes.length === 0) {
      console.log(
        `${colors.yellow}${emojis.warning} No payment types found${colors.reset}`
      );
      return;
    }

    for (const paymentType of paymentTypes) {
      if (options.type && paymentType !== options.type) {
        continue;
      }

      console.log(
        `${colors.blue}${emojis.folder} ${paymentType}${colors.reset}`
      );

      const paymentTypeDir = path.join(this.baseDir, paymentType);
      const testRuns = fs
        .readdirSync(paymentTypeDir)
        .filter((dir) => {
          const fullPath = path.join(paymentTypeDir, dir);
          return fs.statSync(fullPath).isDirectory();
        })
        .map((dir) => {
          const fullPath = path.join(paymentTypeDir, dir);
          const stats = fs.statSync(fullPath);
          return {
            name: dir,
            createdAt: stats.birthtime,
            size: stats.size,
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);

      if (testRuns.length === 0) {
        console.log(`   ${colors.yellow}No test runs found${colors.reset}`);
      } else {
        testRuns.forEach((run, index) => {
          const date = run.createdAt.toLocaleDateString();
          const time = run.createdAt.toLocaleTimeString();
          const isOld = index >= MAX_TEST_RUNS_PER_TYPE;
          const prefix = isOld ? `${colors.red}🗑️` : `${colors.green}📄`;
          const suffix = isOld
            ? ` (will be deleted)${colors.reset}`
            : colors.reset;

          console.log(`   ${prefix} ${run.name} - ${date} ${time}${suffix}`);
        });
      }

      console.log("");
    }
  }

  // Clean old test runs
  async cleanTestRuns(options = {}) {
    if (options.dryRun) {
      console.log(
        `${colors.yellow}${emojis.info} DRY RUN MODE - No files will be deleted${colors.reset}\n`
      );
    }

    console.log(
      `${colors.cyan}${emojis.cleanup} Cleaning Old Test Runs${colors.reset}\n`
    );

    if (!fs.existsSync(this.baseDir)) {
      console.log(
        `${colors.yellow}${emojis.warning} No test runs directory found: ${this.baseDir}${colors.reset}`
      );
      return;
    }

    try {
      if (options.dryRun) {
        // Show what would be deleted
        await this.showWhatWouldBeDeleted(options);
      } else {
        // Actually perform the cleanup
        const result = await cleanAllOldTestRuns(this.baseDir);

        console.log(
          `${colors.green}${emojis.success} Cleanup completed successfully!${colors.reset}`
        );
        console.log(`  Runs deleted: ${result.totalCleaned}`);
        console.log(`  Runs kept: ${result.totalKept}`);
        console.log(`  Space freed: ${formatBytes(result.totalSizeCleaned)}`);

        if (options.verbose && result.paymentTypes) {
          console.log(`\nDetails by payment type:`);
          result.paymentTypes.forEach((pt) => {
            if (pt.cleaned > 0) {
              console.log(
                `  ${colors.blue}${pt.paymentType}${colors.reset}: ${pt.cleaned} deleted, ${pt.kept} kept`
              );
            }
          });
        }
      }
    } catch (error) {
      console.log(
        `${colors.red}${emojis.error} Error during cleanup: ${error.message}${colors.reset}`
      );
    }
  }

  // Show what would be deleted in dry run mode
  async showWhatWouldBeDeleted(options = {}) {
    const paymentTypes = fs.readdirSync(this.baseDir).filter((dir) => {
      const fullPath = path.join(this.baseDir, dir);
      return fs.statSync(fullPath).isDirectory();
    });

    for (const paymentType of paymentTypes) {
      if (options.type && paymentType !== options.type) {
        continue;
      }

      const stats = getTestRunStats(paymentType);

      if (stats.needsCleanup) {
        console.log(`${colors.yellow}${paymentType}:${colors.reset}`);
        console.log(`  Would delete ${stats.excess} old test runs:`);

        const runsToDelete = stats.runs.slice(MAX_TEST_RUNS_PER_TYPE);
        runsToDelete.forEach((run) => {
          const date = run.createdAt.toLocaleDateString();
          const time = run.createdAt.toLocaleTimeString();
          console.log(`    🗑️ ${run.name} (${date} ${time})`);
        });
        console.log("");
      } else {
        console.log(
          `${colors.green}${emojis.success} ${paymentType}: No cleanup needed (${stats.count}/${MAX_TEST_RUNS_PER_TYPE})${colors.reset}`
        );
      }
    }
  }

  // Parse command line arguments
  parseArgs(args) {
    const options = {
      dryRun: false,
      verbose: false,
      type: null,
    };

    const command = args[0] || "help";

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];

      if (arg === "--dry-run") {
        options.dryRun = true;
      } else if (arg === "--verbose") {
        options.verbose = true;
      } else if (arg === "--type" && i + 1 < args.length) {
        options.type = args[i + 1];
        i++; // Skip next argument
      }
    }

    return { command, options };
  }

  // Main execution method
  async run() {
    const args = process.argv.slice(2);
    const { command, options } = this.parseArgs(args);

    try {
      switch (command) {
        case "stats":
          await this.showStats(options);
          break;
        case "clean":
          await this.cleanTestRuns(options);
          break;
        case "list":
          await this.listTestRuns(options);
          break;
        case "help":
        default:
          this.showHelp();
          break;
      }
    } catch (error) {
      console.log(
        `${colors.red}${emojis.error} Error: ${error.message}${colors.reset}`
      );
      process.exit(1);
    }
  }
}

// Run the CLI if this file is executed directly
if (require.main === module) {
  const cli = new TestHistoryManagerCLI();
  cli.run().catch(console.error);
}

module.exports = TestHistoryManagerCLI;
