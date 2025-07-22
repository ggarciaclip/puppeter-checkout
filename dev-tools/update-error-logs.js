#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Función para encontrar archivos JavaScript en src/ recursivamente
function findJSFiles(dir = "src") {
  const files = [];

  function walkDir(currentDir) {
    try {
      const items = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(currentDir, item.name);

        if (item.isDirectory()) {
          walkDir(fullPath);
        } else if (item.isFile() && item.name.endsWith(".js")) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(
        `Warning: Cannot read directory ${currentDir}: ${error.message}`
      );
    }
  }

  walkDir(dir);
  return files;
}

// Función para verificar si un archivo contiene tanto catch como logHeader
function fileContainsCatchWithLogHeader(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const hasCatch = content.includes("} catch");
    const hasLogHeader = content.includes("logHeader");
    return hasCatch && hasLogHeader;
  } catch (error) {
    return false;
  }
}

// Función para verificar si un archivo ya usa logHeaderError
function fileAlreadyUsesLogHeaderError(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return content.includes("logHeaderError");
  } catch (error) {
    return false;
  }
}

// Función para buscar patrones de catch con logHeader que contienen error.message
function findCatchLogHeaderPatterns(content) {
  const patterns = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Buscar líneas que contengan catch seguido de una variable de error
    if (line.includes("} catch (") && line.includes(")")) {
      const catchMatch = line.match(/\}\s*catch\s*\(\s*(\w+)\s*\)/);
      if (catchMatch) {
        const errorVar = catchMatch[1];

        // Buscar logHeader en las siguientes líneas que use esta variable de error
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const nextLine = lines[j];
          if (
            nextLine.includes("logHeader") &&
            nextLine.includes(`${errorVar}.message`)
          ) {
            patterns.push({
              line: j + 1, // 1-based line number
              errorVar,
              currentLine: nextLine.trim(),
              catchLine: i + 1,
            });
          }
          // Si llegamos a otro catch o función, salimos
          if (nextLine.includes("} catch") || nextLine.includes("function ")) {
            break;
          }
        }
      }
    }
  }

  return patterns;
}

// Función principal
function main() {
  console.log(
    "🔍 Buscando archivos JavaScript con catch blocks que usan logHeader...\n"
  );

  const jsFiles = findJSFiles();
  const filesToUpdate = [];

  for (const file of jsFiles) {
    if (fileContainsCatchWithLogHeader(file)) {
      const alreadyUpdated = fileAlreadyUsesLogHeaderError(file);
      const content = fs.readFileSync(file, "utf8");
      const patterns = findCatchLogHeaderPatterns(content);

      if (patterns.length > 0) {
        filesToUpdate.push({
          file: path.relative(process.cwd(), file),
          fullPath: file,
          alreadyUpdated,
          patterns,
        });
      }
    }
  }

  console.log(
    `📋 Encontrados ${filesToUpdate.length} archivos que necesitan actualización:\n`
  );

  filesToUpdate.forEach(({ file, alreadyUpdated, patterns }) => {
    const status = alreadyUpdated
      ? "🔄 (parcialmente actualizado)"
      : "❌ (pendiente)";
    console.log(`${status} ${file}`);
    console.log(`   Patrones encontrados: ${patterns.length}`);

    patterns.forEach((pattern) => {
      console.log(
        `     Línea ${pattern.line}: ${pattern.currentLine.substring(0, 80)}...`
      );
    });
    console.log("");
  });

  // Resumen
  const totalPatterns = filesToUpdate.reduce(
    (sum, file) => sum + file.patterns.length,
    0
  );
  const partiallyUpdated = filesToUpdate.filter((f) => f.alreadyUpdated).length;
  const needsUpdate = filesToUpdate.filter((f) => !f.alreadyUpdated).length;

  console.log(`📊 Resumen:`);
  console.log(`   Total archivos: ${filesToUpdate.length}`);
  console.log(`   Total patrones: ${totalPatterns}`);
  console.log(`   Parcialmente actualizados: ${partiallyUpdated}`);
  console.log(`   Pendientes de actualizar: ${needsUpdate}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  findJSFiles,
  fileContainsCatchWithLogHeader,
  findCatchLogHeaderPatterns,
};
