const fs = require("fs");
const path = require("path");
const mlog = require("mocha-logger");
const fsProm = require("fs").promises;

async function writeFile(filePath, buffer) {
  try {
    fsProm.writeFile(filePath, buffer, (err) => {
      if (err) {
        return console.error(`Error writing file: ${err}`);
      }
    });
  } catch (e) {
    mlog.error(e);
  }
}

async function createDirectory(relativePath, folderName) {
  const relativePaths = relativePath.split("/");
  relativePaths.push(folderName);

  const pathRelative = "/" + relativePaths.join("/");
  const __rootDir = process.cwd();

  const dirPath = path.join(__rootDir, relativePaths.join("/"));

  try {
    await fs.mkdir(dirPath, { recursive: true }, (err) => {
      if (err) throw err;
    });
  } catch (error) {
    console.error(`Error creating directory: ${error.message}`);
  }
}

module.exports = { writeFile, createDirectory };
