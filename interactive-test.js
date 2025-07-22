#!/usr/bin/env node

/**
 * PayClip E2E Test Runner - Interactive JavaScript Version
 * Converted from bash script to provide better cross-platform compatibility
 */

const readline = require("readline");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Colors for better UI
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  purple: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  reset: "\x1b[0m",
};

// Emojis for better UX
const emojis = {
  rocket: "🚀",
  gear: "⚙️",
  checkmark: "✅",
  cross: "❌",
  eyes: "👀",
  lightning: "⚡",
  clipboard: "📋",
  magnifier: "🔍",
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

class PayClipTestRunner {
  constructor() {
    this.testConfig = {
      env: null,
      type: null,
      just: null,
      logging: null,
      recording: null,
    };
    this.recentConfigsFile = path.join(
      process.cwd(),
      "completed_tests",
      ".recent_configs.json"
    );
    this.maxRecentConfigs = 5;
  }

  // Clear screen function
  clearScreen() {
    console.clear();
    console.log(
      `${colors.blue}╔══════════════════════════════════════════════════════════╗${colors.reset}`
    );
    console.log(
      `${colors.blue}║${colors.white}                    PayClip E2E Test Runner                ║${colors.reset}`
    );
    console.log(
      `${colors.blue}║${colors.cyan}                   Interactive Test Selection              ║${colors.reset}`
    );
    console.log(
      `${colors.blue}╚══════════════════════════════════════════════════════════╝${colors.reset}`
    );
    console.log("");
  }

  // Generic prompt function with timeout
  async prompt(question, timeoutMs = 300000) {
    // 5 minute timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Input timeout - no response received"));
      }, timeoutMs);

      rl.question(question, (answer) => {
        clearTimeout(timeout);
        resolve(answer.trim());
      });
    });
  }

  // Show numeric menu
  async showNumericMenu(title, options) {
    this.clearScreen();
    console.log(`${colors.yellow}${title}${colors.reset}`);
    console.log("");

    options.forEach((option, index) => {
      console.log(`  ${colors.green}${index + 1}. ${option}${colors.reset}`);
    });

    console.log("");
    console.log(
      `${colors.yellow}Selecciona una opción (1-${options.length}) o 'q' para salir:${colors.reset}`
    );

    while (true) {
      const choice = await this.prompt("> ");

      if (choice.toLowerCase() === "q") {
        console.log(`${colors.red}${emojis.cross} Saliendo...${colors.reset}`);
        process.exit(0);
      }

      const numChoice = parseInt(choice);
      if (isNaN(numChoice) || numChoice < 1 || numChoice > options.length) {
        console.log(
          `${colors.red}${emojis.cross} Por favor ingresa un número válido (1-${options.length})${colors.reset}`
        );
        continue;
      }

      return numChoice - 1;
    }
  }

  // Environment selection
  async selectEnvironment() {
    this.clearScreen();
    console.log(
      `${colors.yellow}${emojis.gear} Paso 1/5: Selecciona el Ambiente${colors.reset}`
    );
    console.log("");
    console.log(
      `  ${colors.green}1. ${emojis.lightning} Development (${colors.blue}dev${colors.reset}${colors.green}) - Ambiente de desarrollo${colors.reset}`
    );
    console.log(
      `  ${colors.green}2. ${emojis.rocket} Staging (${colors.blue}stage${colors.reset}${colors.green}) - Ambiente de staging${colors.reset}`
    );
    console.log("");
    console.log(`${colors.cyan}dev = 1  |  stage = 2${colors.reset}`);
    console.log("");
    console.log(
      `${colors.yellow}Selecciona una opción (1-2), 'b' para volver al menú principal, o 'q' para salir:${colors.reset}`
    );

    while (true) {
      const choice = await this.prompt("> ");

      switch (choice.toLowerCase()) {
        case "q":
          console.log(
            `${colors.red}${emojis.cross} Saliendo...${colors.reset}`
          );
          process.exit(0);
        case "b":
          return "BACK";
        case "1":
          return "dev";
        case "2":
          return "stage";
        default:
          console.log(
            `${colors.red}${emojis.cross} Por favor ingresa un número válido (1-2), 'b' para volver, o 'q' para salir${colors.reset}`
          );
      }
    }
  }

  // Test type selection
  async selectTestType() {
    this.clearScreen();
    console.log(
      `${colors.yellow}${emojis.clipboard} Paso 2/5: Selecciona el Tipo de Test${colors.reset}`
    );
    console.log("");
    console.log(
      `  ${colors.green}1. ${emojis.clipboard} All Tests (default)${colors.reset}`
    );
    console.log(
      `  ${colors.green}2. ${emojis.lightning} Hosted Checkout Tests${colors.reset}`
    );
    console.log(
      `  ${colors.green}3. ${emojis.rocket} Link de Pago Tests${colors.reset}`
    );
    console.log(
      `  ${colors.green}4. ${emojis.gear} Subscription Tests${colors.reset}`
    );
    console.log(
      `  ${colors.green}5. ${emojis.magnifier} Custom Type${colors.reset}`
    );
    console.log("");
    console.log(
      `${colors.yellow}Selecciona una opción (1-5), 'b' para volver al paso anterior, o 'q' para salir:${colors.reset}`
    );

    while (true) {
      const choice = await this.prompt("> ");

      switch (choice.toLowerCase()) {
        case "q":
          console.log(
            `${colors.red}${emojis.cross} Saliendo...${colors.reset}`
          );
          process.exit(0);
        case "b":
          return "BACK";
        case "1":
          return "";
        case "2":
          return "HOSTED_CHECKOUT";
        case "3":
          return "LINK_DE_PAGO";
        case "4":
          return "SUBSCRIPTION";
        case "5":
          console.log(
            `\n${colors.yellow}Ingresa el tipo personalizado:${colors.reset}`
          );
          return await this.prompt("> ");
        default:
          console.log(
            `${colors.red}${emojis.cross} Por favor ingresa un número válido (1-5), 'b' para volver, o 'q' para salir${colors.reset}`
          );
      }
    }
  }

  // Specific test selection
  async selectSpecificTest() {
    this.clearScreen();
    console.log(
      `${colors.yellow}${emojis.eyes} Paso 3/5: Selecciona el Alcance de Tests${colors.reset}`
    );
    console.log("");
    console.log(
      `  ${colors.green}1. ${emojis.checkmark} Run All Tests (default)${colors.reset}`
    );
    console.log(
      `  ${colors.green}2. ${emojis.magnifier} Run Specific Test Number${colors.reset}`
    );
    console.log(
      `  ${colors.green}3. ${emojis.clipboard} Run Multiple Tests (comma-separated)${colors.reset}`
    );
    console.log("");
    console.log(
      `${colors.yellow}Selecciona una opción (1-3), 'b' para volver al paso anterior, o 'q' para salir:${colors.reset}`
    );

    while (true) {
      const choice = await this.prompt("> ");

      switch (choice.toLowerCase()) {
        case "q":
          console.log(
            `${colors.red}${emojis.cross} Saliendo...${colors.reset}`
          );
          process.exit(0);
        case "b":
          return "BACK";
        case "1":
          return "";
        case "2":
          console.log(
            `\n${colors.yellow}Ingresa el número de test (ej: 1, 2, 3):${colors.reset}`
          );
          return await this.prompt("> ");
        case "3":
          console.log(
            `\n${colors.yellow}Ingresa números separados por comas (ej: 1,3,5):${colors.reset}`
          );
          return await this.prompt("> ");
        default:
          console.log(
            `${colors.red}${emojis.cross} Por favor ingresa un número válido (1-3), 'b' para volver, o 'q' para salir${colors.reset}`
          );
      }
    }
  }

  // Logging mode selection
  async selectLoggingMode() {
    this.clearScreen();
    console.log(
      `${colors.yellow}${emojis.gear} Paso 4/5: Selecciona el Modo de Logging${colors.reset}`
    );
    console.log("");
    console.log(
      `  ${colors.green}1. ${emojis.eyes} Silent Mode (default - important logs only)${colors.reset}`
    );
    console.log(
      `  ${colors.green}2. ${emojis.clipboard} Verbose Mode (all logs)${colors.reset}`
    );
    console.log(
      `  ${colors.green}3. ${emojis.magnifier} Debug Mode (verbose + extra details)${colors.reset}`
    );
    console.log("");
    console.log(
      `${colors.yellow}Selecciona una opción (1-3), 'b' para volver al paso anterior, o 'q' para salir:${colors.reset}`
    );

    while (true) {
      const choice = await this.prompt("> ");

      switch (choice.toLowerCase()) {
        case "q":
          console.log(
            `${colors.red}${emojis.cross} Saliendo...${colors.reset}`
          );
          process.exit(0);
        case "b":
          return "BACK";
        case "1":
          return "silent";
        case "2":
          return "verbose";
        case "3":
          return "debug";
        default:
          console.log(
            `${colors.red}${emojis.cross} Por favor ingresa un número válido (1-3), 'b' para volver, o 'q' para salir${colors.reset}`
          );
      }
    }
  }

  // Recording selection
  async selectRecording() {
    this.clearScreen();
    console.log(
      `${colors.yellow}${emojis.clipboard} Paso 5/5: Grabación de Pantalla${colors.reset}`
    );
    console.log("");
    console.log(
      `  ${colors.green}1. ${emojis.cross} No Recording (default)${colors.reset}`
    );
    console.log(
      `  ${colors.green}2. ${emojis.checkmark} Enable Screen Recording${colors.reset}`
    );
    console.log("");
    console.log(
      `${colors.yellow}Selecciona una opción (1-2), 'b' para volver al paso anterior, o 'q' para salir:${colors.reset}`
    );

    while (true) {
      const choice = await this.prompt("> ");

      switch (choice.toLowerCase()) {
        case "q":
          console.log(
            `${colors.red}${emojis.cross} Saliendo...${colors.reset}`
          );
          process.exit(0);
        case "b":
          return "BACK";
        case "1":
          return "";
        case "2":
          return "true";
        default:
          console.log(
            `${colors.red}${emojis.cross} Por favor ingresa un número válido (1-2), 'b' para volver, o 'q' para salir${colors.reset}`
          );
      }
    }
  }

  // Configuration summary
  async showConfiguration(env, type, just, logging, recording) {
    this.clearScreen();
    console.log(
      `${colors.yellow}${emojis.gear} Resumen de Configuración${colors.reset}`
    );
    console.log("");
    console.log(
      `  ${colors.blue}Ambiente:${colors.reset}         ${colors.green}${env}${colors.reset}`
    );
    console.log(
      `  ${colors.blue}Tipo de Test:${colors.reset}     ${colors.green}${
        type || "All Tests"
      }${colors.reset}`
    );
    console.log(
      `  ${colors.blue}Tests Específicos:${colors.reset} ${colors.green}${
        just || "All Tests"
      }${colors.reset}`
    );
    console.log(
      `  ${colors.blue}Modo de Logging:${colors.reset}  ${colors.green}${logging}${colors.reset}`
    );
    console.log(
      `  ${colors.blue}Grabación:${colors.reset}        ${colors.green}${
        recording || "Disabled"
      }${colors.reset}`
    );
    console.log("");

    // Generate and display the command
    const command = this.generateTestCommand(
      env,
      type,
      just,
      logging,
      recording
    );
    console.log(
      `${colors.cyan}${emojis.rocket} Comando a ejecutar:${colors.reset}`
    );
    console.log(`${colors.white}${command}${colors.reset}`);
    console.log("");

    const options = [
      `${emojis.rocket} Ejecutar Tests con esta configuración`,
      `${emojis.gear} Modificar configuración`,
      `${emojis.cross} Cancelar y salir`,
    ];

    return await this.showNumericMenu(
      `${emojis.checkmark} Confirmar Configuración:`,
      options
    );
  }

  // Execute tests
  async executeTests(env, type, just, logging, recording) {
    this.clearScreen();
    console.log(
      `${emojis.rocket} ${colors.green}Iniciando PayClip E2E Tests...${colors.reset}`
    );
    console.log("");

    // Generate and display the complete command
    const fullCommand = this.generateTestCommand(
      env,
      type,
      just,
      logging,
      recording
    );
    console.log(
      `${colors.cyan}${emojis.gear} Comando completo generado:${colors.reset}`
    );
    console.log(`${colors.white}${fullCommand}${colors.reset}`);
    console.log("");

    // Build environment variables
    const envVars = {
      ENV: env,
      ...process.env,
    };

    if (just) envVars.JUST = just;
    if (type) envVars.TYPE = type;
    if (recording) envVars.RECORD = recording;
    if (logging === "verbose" || logging === "debug") {
      envVars.VERBOSE_LOGS = "true";
    }
    if (logging === "debug") {
      envVars.DEBUG_LOGS = "true";
    }

    // Build command for npm execution
    const command = "npm";
    const args = ["run", "test:direct"];

    console.log(
      `${colors.blue}${emojis.rocket} Ejecutando mediante npm:${colors.reset}`
    );
    console.log(`${colors.cyan}${command} ${args.join(" ")}${colors.reset}`);
    console.log("");
    console.log(
      `${colors.yellow}Variables de entorno aplicadas:${colors.reset}`
    );
    Object.keys(envVars).forEach((key) => {
      if (key !== "PATH" && key !== "HOME" && !key.startsWith("npm_")) {
        console.log(`  ${colors.green}${key}=${envVars[key]}${colors.reset}`);
      }
    });
    console.log("");
    console.log(
      `${colors.yellow}Presiona Ctrl+C para detener los tests${colors.reset}`
    );
    console.log("");

    // Execute the command
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        env: envVars,
        stdio: "inherit",
      });

      child.on("close", (code) => {
        console.log("");
        if (code === 0) {
          console.log(
            `${colors.green}${emojis.checkmark} Tests completados exitosamente!${colors.reset}`
          );
          // Save the configuration to recent configs after successful execution
          this.saveRecentConfig(env, type, just, logging, recording);
          console.log(
            `${colors.cyan}💾 Configuración guardada en configuraciones recientes${colors.reset}`
          );
        } else {
          console.log(
            `${colors.red}${emojis.cross} Tests fallaron con código: ${code}${colors.reset}`
          );
        }
        console.log("");
        console.log(
          `${colors.yellow}Presiona Enter para continuar...${colors.reset}`
        );
        this.prompt("> ").then(() => resolve());
      });
    });
  }

  // Generate and display the complete command that would be executed
  generateTestCommand(env, type, just, logging, recording) {
    let command = "cross-env";

    // Environment is required
    if (env) {
      command += ` ENV=${env}`;
    }

    // Add optional parameters
    if (just) {
      command += ` JUST=${just}`;
    }

    if (type) {
      command += ` TYPE=${type}`;
    }

    if (recording && recording !== "") {
      command += ` RECORD=${recording}`;
    }

    // Add verbose logging if specified
    if (logging === "verbose" || logging === "debug") {
      command += ` VERBOSE_LOGS=true`;
    }

    if (logging === "debug") {
      command += ` DEBUG_LOGS=true`;
    }

    // Add the mocha command
    command += " mocha --timeout 60000";

    return command;
  }

  // Validate and display test configuration
  validateAndDisplayConfig(env, type, just, logging, recording) {
    console.log("");
    console.log(
      `${colors.cyan}${emojis.gear} Validando configuración completa...${colors.reset}`
    );
    console.log("");

    // Check required fields
    let isValid = true;
    const validationResults = [];

    if (!env) {
      validationResults.push(
        `${colors.red}❌ Ambiente: REQUERIDO${colors.reset}`
      );
      isValid = false;
    } else {
      validationResults.push(
        `${colors.green}✅ Ambiente: ${env}${colors.reset}`
      );
    }

    validationResults.push(
      `${colors.green}✅ Tipo de Test: ${type || "All Tests"}${colors.reset}`
    );
    validationResults.push(
      `${colors.green}✅ Tests Específicos: ${just || "All Tests"}${
        colors.reset
      }`
    );
    validationResults.push(
      `${colors.green}✅ Modo de Logging: ${logging || "silent"}${colors.reset}`
    );
    validationResults.push(
      `${colors.green}✅ Grabación: ${recording || "Disabled"}${colors.reset}`
    );

    // Display validation results
    validationResults.forEach((result) => console.log(`  ${result}`));

    console.log("");

    if (isValid) {
      console.log(
        `${colors.green}${emojis.checkmark} Configuración completa y válida${colors.reset}`
      );
      console.log("");

      // Generate and display the command
      const command = this.generateTestCommand(
        env,
        type,
        just,
        logging,
        recording
      );
      console.log(
        `${colors.blue}${emojis.rocket} Comando que se ejecutará:${colors.reset}`
      );
      console.log("");
      console.log(`${colors.cyan}${command}${colors.reset}`);
      console.log("");

      // Show npm script equivalent
      const npmScript =
        env === "dev" ? "npm run test:dev" : "npm run test:stage";
      console.log(
        `${colors.yellow}💡 Equivalente con npm script:${colors.reset}`
      );
      console.log(`${colors.cyan}${npmScript}${colors.reset}`);
      console.log("");
    } else {
      console.log(
        `${colors.red}${emojis.cross} Configuración incompleta${colors.reset}`
      );
      console.log("");
    }

    return isValid;
  }

  // Save recent configuration
  saveRecentConfig(env, type, just, logging, recording) {
    try {
      // Ensure completed_tests directory exists
      const completedTestsDir = path.dirname(this.recentConfigsFile);
      if (!fs.existsSync(completedTestsDir)) {
        fs.mkdirSync(completedTestsDir, { recursive: true });
      }

      // Load existing configs
      let recentConfigs = this.loadRecentConfigs();

      // Create new config object
      const newConfig = {
        timestamp: new Date().toISOString(),
        displayDate: new Date().toLocaleString("es-ES", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        env,
        type: type || "All Tests",
        just: just || "All Tests",
        logging: logging || "silent",
        recording: recording || "Disabled",
      };

      // Check if this exact configuration already exists (excluding timestamp)
      const isDuplicate = recentConfigs.some(
        (config) =>
          config.env === newConfig.env &&
          config.type === newConfig.type &&
          config.just === newConfig.just &&
          config.logging === newConfig.logging &&
          config.recording === newConfig.recording
      );

      // If not duplicate, add to the beginning of the list
      if (!isDuplicate) {
        recentConfigs.unshift(newConfig);

        // Keep only the last 5 configs
        recentConfigs = recentConfigs.slice(0, this.maxRecentConfigs);

        // Save back to file
        fs.writeFileSync(
          this.recentConfigsFile,
          JSON.stringify(recentConfigs, null, 2)
        );
      }
    } catch (error) {
      console.log(
        `${colors.yellow}⚠️ No se pudo guardar la configuración reciente: ${error.message}${colors.reset}`
      );
    }
  }

  // Load recent configurations
  loadRecentConfigs() {
    try {
      if (fs.existsSync(this.recentConfigsFile)) {
        const data = fs.readFileSync(this.recentConfigsFile, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.log(
        `${colors.yellow}⚠️ Error cargando configuraciones recientes: ${error.message}${colors.reset}`
      );
    }
    return [];
  }

  // Show recent configurations menu
  async showRecentConfigurations() {
    this.clearScreen();
    console.log(
      `${colors.yellow}${emojis.clipboard} Configuraciones Recientes${colors.reset}`
    );
    console.log("");

    const recentConfigs = this.loadRecentConfigs();

    if (recentConfigs.length === 0) {
      console.log(
        `${colors.yellow}No hay configuraciones recientes guardadas.${colors.reset}`
      );
      console.log(
        `${colors.cyan}💡 Las configuraciones se guardarán automáticamente después de ejecutar tests.${colors.reset}`
      );
      console.log("");
      console.log(
        `${colors.yellow}Presiona Enter para continuar...${colors.reset}`
      );
      await this.prompt("> ");
      return null;
    }

    console.log(
      `${colors.cyan}Selecciona una configuración para ejecutar de nuevo:${colors.reset}`
    );
    console.log("");

    // Prepare options for the menu
    const options = recentConfigs.map((config, index) => {
      const envColor = config.env === "dev" ? colors.green : colors.blue;
      const typeShort = config.type.replace("_", " ");
      const justShort = config.just === "All Tests" ? "Todos" : config.just;
      const recordingIcon = config.recording === "Disabled" ? "📹❌" : "📹✅";

      return `${envColor}${config.env.toUpperCase()}${
        colors.reset
      } | ${typeShort} | ${justShort} | ${
        config.logging
      } | ${recordingIcon} | ${colors.yellow}${config.displayDate}${
        colors.reset
      }`;
    });

    // Add "Nueva configuración" option
    options.push(`${emojis.gear} Crear nueva configuración`);
    options.push(`${emojis.cross} Volver al menú principal`);

    const choice = await this.showNumericMenu(
      `${emojis.lightning} Configuraciones Recientes:`,
      options
    );

    // Handle selection
    if (choice < recentConfigs.length) {
      // User selected a recent configuration
      const selectedConfig = recentConfigs[choice];

      // Show confirmation
      this.clearScreen();
      console.log(
        `${colors.cyan}${emojis.checkmark} Configuración seleccionada:${colors.reset}`
      );
      console.log("");
      console.log(
        `  ${colors.blue}Fecha:${colors.reset}           ${colors.green}${selectedConfig.displayDate}${colors.reset}`
      );
      console.log(
        `  ${colors.blue}Ambiente:${colors.reset}        ${colors.green}${selectedConfig.env}${colors.reset}`
      );
      console.log(
        `  ${colors.blue}Tipo de Test:${colors.reset}    ${colors.green}${selectedConfig.type}${colors.reset}`
      );
      console.log(
        `  ${colors.blue}Tests Específicos:${colors.reset} ${colors.green}${selectedConfig.just}${colors.reset}`
      );
      console.log(
        `  ${colors.blue}Modo de Logging:${colors.reset} ${colors.green}${selectedConfig.logging}${colors.reset}`
      );
      console.log(
        `  ${colors.blue}Grabación:${colors.reset}       ${colors.green}${selectedConfig.recording}${colors.reset}`
      );
      console.log("");

      const confirmOptions = [
        `${emojis.rocket} Ejecutar con esta configuración`,
        `${emojis.gear} Modificar antes de ejecutar`,
        `${emojis.cross} Cancelar`,
      ];

      const confirmChoice = await this.showNumericMenu(
        `${emojis.checkmark} ¿Qué deseas hacer?`,
        confirmOptions
      );

      switch (confirmChoice) {
        case 0: // Execute directly
          console.log(
            `${colors.blue}🚀 Ejecutando configuración guardada...${colors.reset}`
          );
          await this.executeTests(
            selectedConfig.env,
            selectedConfig.type === "All Tests" ? null : selectedConfig.type,
            selectedConfig.just === "All Tests" ? null : selectedConfig.just,
            selectedConfig.logging,
            selectedConfig.recording === "Disabled"
              ? null
              : selectedConfig.recording
          );
          return "EXECUTED";
        case 1: // Modify configuration
          return {
            env: selectedConfig.env,
            type:
              selectedConfig.type === "All Tests" ? null : selectedConfig.type,
            just:
              selectedConfig.just === "All Tests" ? null : selectedConfig.just,
            logging: selectedConfig.logging,
            recording:
              selectedConfig.recording === "Disabled"
                ? null
                : selectedConfig.recording,
          };
        case 2: // Cancel
          return null;
      }
    } else if (choice === recentConfigs.length) {
      // Nueva configuración
      return "NEW_CONFIG";
    } else {
      // Volver al menú principal
      return null;
    }
  }

  // Complete test flow
  async runTestFlow() {
    let env, type, just, logging, recording;
    let currentStep = 1;

    // Check if user wants to use recent configurations first
    const recentConfigs = this.loadRecentConfigs();
    if (recentConfigs.length > 0) {
      this.clearScreen();
      console.log(
        `${colors.yellow}${emojis.clipboard} Opciones de Configuración${colors.reset}`
      );
      console.log("");
      console.log(
        `${colors.cyan}Se encontraron ${recentConfigs.length} configuraciones recientes.${colors.reset}`
      );
      console.log("");

      const configOptions = [
        `${emojis.gear} Crear nueva configuración`,
        `${emojis.clipboard} Usar configuraciones recientes`,
      ];

      const configChoice = await this.showNumericMenu(
        `${emojis.checkmark} ¿Qué deseas hacer?`,
        configOptions
      );

      if (configChoice === 1) {
        // User wants to use recent configurations
        const recentResult = await this.showRecentConfigurations();
        if (recentResult === "EXECUTED" || recentResult === null) {
          return; // Either executed successfully or cancelled
        } else if (recentResult === "NEW_CONFIG") {
          // User chose to create new config, continue with normal flow
          console.log(
            `${colors.yellow}🆕 Creando nueva configuración...${colors.reset}`
          );
        } else if (typeof recentResult === "object") {
          // User chose to modify a recent config, pre-populate values
          env = recentResult.env;
          type = recentResult.type;
          just = recentResult.just;
          logging = recentResult.logging;
          recording = recentResult.recording;
          console.log(
            `${colors.yellow}📝 Modificando configuración existente...${colors.reset}`
          );
          console.log(
            `${colors.cyan}Valores actuales cargados, procede a modificar según necesites.${colors.reset}`
          );
          await this.prompt(
            `${colors.yellow}Presiona Enter para continuar...${colors.reset}`
          );
        }
      }
      // If configChoice === 0, continue with normal flow (create new configuration)
    }

    // Step-by-step configuration with back navigation
    while (currentStep >= 1 && currentStep <= 5) {
      switch (currentStep) {
        case 1:
          if (!env) {
            env = await this.selectEnvironment();
          } else {
            // Show current value and ask if user wants to change it
            this.clearScreen();
            console.log(
              `${colors.yellow}${emojis.gear} Paso 1/5: Ambiente${colors.reset}`
            );
            console.log("");
            console.log(
              `${colors.cyan}Valor actual: ${colors.green}${env}${colors.reset}`
            );
            console.log("");
            console.log(
              `${colors.yellow}¿Deseas cambiar el ambiente? (y/N):${colors.reset}`
            );
            const changeEnv = await this.prompt("> ");
            if (
              changeEnv.toLowerCase() === "y" ||
              changeEnv.toLowerCase() === "yes"
            ) {
              env = await this.selectEnvironment();
            }
          }
          if (env === "BACK") {
            return; // Go back to main menu
          }
          currentStep = 2;
          break;

        case 2:
          if (!type) {
            type = await this.selectTestType();
          } else {
            // Show current value and ask if user wants to change it
            this.clearScreen();
            console.log(
              `${colors.yellow}${emojis.clipboard} Paso 2/5: Tipo de Test${colors.reset}`
            );
            console.log("");
            console.log(
              `${colors.cyan}Valor actual: ${colors.green}${type}${colors.reset}`
            );
            console.log("");
            console.log(
              `${colors.yellow}¿Deseas cambiar el tipo de test? (y/N):${colors.reset}`
            );
            const changeType = await this.prompt("> ");
            if (
              changeType.toLowerCase() === "y" ||
              changeType.toLowerCase() === "yes"
            ) {
              type = await this.selectTestType();
            }
          }
          if (type === "BACK") {
            currentStep = 1; // Go back to environment selection
          } else {
            currentStep = 3;
          }
          break;

        case 3:
          if (!just) {
            just = await this.selectSpecificTest();
          } else {
            // Show current value and ask if user wants to change it
            this.clearScreen();
            console.log(
              `${colors.yellow}${emojis.eyes} Paso 3/5: Tests Específicos${colors.reset}`
            );
            console.log("");
            console.log(
              `${colors.cyan}Valor actual: ${colors.green}${just}${colors.reset}`
            );
            console.log("");
            console.log(
              `${colors.yellow}¿Deseas cambiar los tests específicos? (y/N):${colors.reset}`
            );
            const changeJust = await this.prompt("> ");
            if (
              changeJust.toLowerCase() === "y" ||
              changeJust.toLowerCase() === "yes"
            ) {
              just = await this.selectSpecificTest();
            }
          }
          if (just === "BACK") {
            currentStep = 2; // Go back to test type selection
          } else {
            currentStep = 4;
          }
          break;

        case 4:
          if (!logging) {
            logging = await this.selectLoggingMode();
          } else {
            // Show current value and ask if user wants to change it
            this.clearScreen();
            console.log(
              `${colors.yellow}${emojis.gear} Paso 4/5: Modo de Logging${colors.reset}`
            );
            console.log("");
            console.log(
              `${colors.cyan}Valor actual: ${colors.green}${logging}${colors.reset}`
            );
            console.log("");
            console.log(
              `${colors.yellow}¿Deseas cambiar el modo de logging? (y/N):${colors.reset}`
            );
            const changeLogging = await this.prompt("> ");
            if (
              changeLogging.toLowerCase() === "y" ||
              changeLogging.toLowerCase() === "yes"
            ) {
              logging = await this.selectLoggingMode();
            }
          }
          if (logging === "BACK") {
            currentStep = 3; // Go back to specific test selection
          } else {
            currentStep = 5;
          }
          break;

        case 5:
          if (!recording) {
            recording = await this.selectRecording();
          } else {
            // Show current value and ask if user wants to change it
            this.clearScreen();
            console.log(
              `${colors.yellow}${emojis.gear} Paso 5/5: Grabación${colors.reset}`
            );
            console.log("");
            console.log(
              `${colors.cyan}Valor actual: ${colors.green}${recording}${colors.reset}`
            );
            console.log("");
            console.log(
              `${colors.yellow}¿Deseas cambiar la grabación? (y/N):${colors.reset}`
            );
            const changeRecording = await this.prompt("> ");
            if (
              changeRecording.toLowerCase() === "y" ||
              changeRecording.toLowerCase() === "yes"
            ) {
              recording = await this.selectRecording();
            }
          }
          if (recording === "BACK") {
            currentStep = 4; // Go back to logging mode selection
          } else {
            // All steps completed, validate and show command
            console.log(
              `${colors.green}${emojis.checkmark} ¡Todos los pasos completados!${colors.reset}`
            );

            // Validate configuration and display command
            const isValid = this.validateAndDisplayConfig(
              env,
              type,
              just,
              logging,
              recording
            );

            if (isValid) {
              console.log(
                `${colors.yellow}Presiona Enter para ejecutar los tests directamente...${colors.reset}`
              );
              await this.prompt("> ");

              // Execute tests directly instead of going to confirmation
              console.log(
                `${colors.blue}🚀 Iniciando ejecución de tests...${colors.reset}`
              );
              await this.executeTests(env, type, just, logging, recording);
              return; // Exit the method completely
            }

            break;
          }
          break;
      }
    }

    // Configuration confirmation loop
    while (true) {
      try {
        const confirmChoice = await this.showConfiguration(
          env,
          type,
          just,
          logging,
          recording
        );

        switch (confirmChoice) {
          case 0: // Run tests
            console.log(
              `${colors.blue}🚀 Iniciando ejecución de tests...${colors.reset}`
            );
            await this.executeTests(env, type, just, logging, recording);
            return;
          case 1: // Modify configuration
            console.log(
              `${colors.yellow}⚙️ Modificando configuración...${colors.reset}`
            );
            return await this.runTestFlow();
          case 2: // Cancel
            console.log(`${colors.red}❌ Operación cancelada${colors.reset}`);
            return;
          default:
            console.log(
              `${colors.red}Opción inválida: ${confirmChoice}. Por favor intenta de nuevo.${colors.reset}`
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(
          `${colors.red}❌ Error en confirmación: ${error.message}${colors.reset}`
        );
        console.log(
          `${colors.yellow}Regresando al menú principal...${colors.reset}`
        );
        return;
      }
    }
  }

  // Help function
  async showHelp() {
    this.clearScreen();
    console.log(
      `${colors.blue}${emojis.clipboard} PayClip E2E Test Runner - Ayuda${colors.reset}`
    );
    console.log("");
    console.log(`${colors.yellow}Navegación:${colors.reset}`);
    console.log(
      `  ${colors.green}1-9${colors.reset} - Seleccionar opción por número`
    );
    console.log(
      `  ${colors.green}b/B${colors.reset} - Volver al paso anterior`
    );
    console.log(
      `  ${colors.green}q/Q${colors.reset} - Salir en cualquier momento`
    );
    console.log("");
    console.log(`${colors.yellow}Tipos de Test:${colors.reset}`);
    console.log(
      `  ${colors.green}HOSTED_CHECKOUT${colors.reset} - Tests de checkout hospedado`
    );
    console.log(
      `  ${colors.green}LINK_DE_PAGO${colors.reset} - Tests de links de pago`
    );
    console.log(
      `  ${colors.green}SUBSCRIPTION${colors.reset} - Tests de suscripciones`
    );
    console.log("");
    console.log(`${colors.yellow}Ambientes:${colors.reset}`);
    console.log(`  ${colors.green}dev${colors.reset} - Ambiente de desarrollo`);
    console.log(`  ${colors.green}stage${colors.reset} - Ambiente de staging`);
    console.log("");
    console.log(`${colors.yellow}Flujo de navegación:${colors.reset}`);
    console.log(
      `  ${colors.cyan}Paso 1${colors.reset} → ${colors.cyan}Paso 2${colors.reset} → ${colors.cyan}Paso 3${colors.reset} → ${colors.cyan}Paso 4${colors.reset} → ${colors.cyan}Paso 5${colors.reset} → ${colors.cyan}Confirmación${colors.reset}`
    );
    console.log(
      `  ${colors.cyan}Usa 'b' para navegar hacia atrás en cualquier paso${colors.reset}`
    );
    console.log("");
    console.log(`${colors.yellow}Ejemplos:${colors.reset}`);
    console.log(
      `  Todos los tests en dev: ${colors.green}dev + All Tests${colors.reset}`
    );
    console.log(
      `  Test específico: ${colors.green}dev + Test 1${colors.reset}`
    );
    console.log(
      `  Con grabación: ${colors.green}stage + Recording${colors.reset}`
    );
    console.log("");
    console.log(
      `${colors.yellow}Presiona Enter para continuar...${colors.reset}`
    );
    await this.prompt("> ");
  }

  // Recent results viewer
  async showRecentResults() {
    this.clearScreen();
    console.log(
      `${colors.blue}${emojis.clipboard} Resultados Recientes${colors.reset}`
    );
    console.log("");

    const resultsDir = "completed_tests";
    if (fs.existsSync(resultsDir)) {
      console.log(
        `${colors.yellow}Archivos de resultados recientes:${colors.reset}`
      );

      // Find recent files
      const findFiles = (dir, extensions) => {
        let files = [];
        try {
          const items = fs.readdirSync(dir);
          items.forEach((item) => {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              files = files.concat(findFiles(fullPath, extensions));
            } else if (extensions.some((ext) => item.endsWith(ext))) {
              files.push(fullPath);
            }
          });
        } catch (err) {
          // Directory doesn't exist or permission denied
        }
        return files;
      };

      const recentFiles = findFiles(resultsDir, [".json", ".xlsx"])
        .sort((a, b) => {
          try {
            return fs.statSync(b).mtime - fs.statSync(a).mtime;
          } catch {
            return 0;
          }
        })
        .slice(0, 10);

      recentFiles.forEach((file) => {
        console.log(`  ${colors.green}${file}${colors.reset}`);
      });
    } else {
      console.log(
        `${colors.yellow}No se encontró directorio de resultados.${colors.reset}`
      );
    }

    console.log("");
    console.log(
      `${colors.yellow}Para ver resultados detallados, revisa el directorio 'completed_tests'${colors.reset}`
    );
    console.log(
      `${colors.yellow}Los archivos de logs están en formato JSON con emojis para fácil lectura${colors.reset}`
    );
    console.log("");
    console.log(
      `${colors.yellow}Presiona Enter para continuar...${colors.reset}`
    );
    await this.prompt("> ");
  }

  // Main menu
  async mainMenu() {
    while (true) {
      try {
        const options = [
          `${emojis.rocket} Ejecutar E2E Tests`,
          `${emojis.clipboard} Configuraciones Recientes`,
          `${emojis.eyes} Ver Resultados Recientes`,
          `${emojis.magnifier} Ayuda y Documentación`,
          `${emojis.cross} Salir`,
        ];

        const choice = await this.showNumericMenu(
          `${emojis.lightning} Menú Principal:`,
          options
        );

        switch (choice) {
          case 0: // Run Tests
            await this.runTestFlow();
            break;
          case 1: // Recent Configurations
            const recentConfigResult = await this.showRecentConfigurations();
            if (recentConfigResult === "NEW_CONFIG") {
              await this.runTestFlow();
            }
            break;
          case 2: // View Results
            await this.showRecentResults();
            break;
          case 3: // Help
            await this.showHelp();
            break;
          case 4: // Exit
            this.clearScreen();
            console.log(
              `${colors.green}${emojis.checkmark} ¡Gracias por usar PayClip E2E Test Runner!${colors.reset}`
            );
            console.log("");
            rl.close();
            process.exit(0);
        }
      } catch (error) {
        console.error(
          `${colors.red}❌ Error en el menú: ${error.message}${colors.reset}`
        );
        console.log(`${colors.yellow}Intentando continuar...${colors.reset}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  // Verify environment
  verifyEnvironment() {
    // Check if package.json exists
    if (!fs.existsSync("package.json")) {
      console.log(
        `${colors.red}${emojis.cross} Error: package.json no encontrado!${colors.reset}`
      );
      console.log(
        `${colors.yellow}Por favor ejecuta este script desde el directorio raíz del proyecto PayClip E2E.${colors.reset}`
      );
      process.exit(1);
    }

    // Check if node_modules exists
    if (!fs.existsSync("node_modules")) {
      console.log(
        `${colors.yellow}${emojis.gear} Instalando dependencias...${colors.reset}`
      );
      const { execSync } = require("child_process");
      try {
        execSync("npm install", { stdio: "inherit" });
      } catch (error) {
        console.log(
          `${colors.red}${emojis.cross} Error instalando dependencias: ${error.message}${colors.reset}`
        );
        process.exit(1);
      }
    }
  }

  // Start the application
  async start() {
    console.log(
      `${colors.cyan}🔄 Iniciando PayClip E2E Test Runner...${colors.reset}`
    );

    try {
      this.verifyEnvironment();
      console.log(
        `${colors.green}✅ Ambiente verificado correctamente${colors.reset}`
      );
    } catch (error) {
      console.error(
        `${colors.red}❌ Error en verificación del ambiente: ${error.message}${colors.reset}`
      );
      process.exit(1);
    }

    this.clearScreen();
    console.log(
      `${colors.green}${emojis.checkmark} PayClip E2E Test Runner - Versión JavaScript${colors.reset}`
    );
    console.log(
      `${colors.yellow}Esta versión usa Node.js para mayor compatibilidad multiplataforma${colors.reset}`
    );
    console.log(
      `${colors.cyan}🚀 Cargando interfaz interactiva...${colors.reset}`
    );

    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      await this.mainMenu();
    } catch (error) {
      console.error(
        `${colors.red}❌ Error en el menú principal: ${error.message}${colors.reset}`
      );
      console.error(
        `${colors.yellow}💡 Presiona Ctrl+C para salir${colors.reset}`
      );
      rl.close();
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log(`\n${colors.yellow}Saliendo...${colors.reset}`);
  rl.close();
  process.exit(0);
});

// Start the application
if (require.main === module) {
  const runner = new PayClipTestRunner();
  runner.start().catch((error) => {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = PayClipTestRunner;
