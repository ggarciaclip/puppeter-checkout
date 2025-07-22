const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const fs = require("fs");
const path = require("path");

// Set the path to the static ffmpeg binary
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Convert a sequence of PNG images to MP4 video
 */
function convertImagesToVideo(screenshotsDir, outputVideoPath, framerate = 2) {
  return new Promise((resolve, reject) => {
    // Check if screenshots directory exists and has files
    if (!fs.existsSync(screenshotsDir)) {
      reject(
        new Error(`Screenshots directory does not exist: ${screenshotsDir}`)
      );
      return;
    }

    const files = fs
      .readdirSync(screenshotsDir)
      .filter((file) => file.startsWith("frame_") && file.endsWith(".png"))
      .sort();

    if (files.length === 0) {
      reject(new Error(`No frame files found in: ${screenshotsDir}`));
      return;
    }

    console.log(`🎬 Convirtiendo ${files.length} imágenes a video...`);

    // Create the input pattern for ffmpeg
    const inputPattern = path.join(screenshotsDir, "frame_%04d.png");

    ffmpeg()
      .input(inputPattern)
      .inputFPS(framerate)
      .videoCodec("libx264")
      .outputOptions([
        "-pix_fmt yuv420p",
        "-movflags +faststart",
        "-preset medium",
      ])
      .output(outputVideoPath)
      .on("start", (commandLine) => {
        console.log(`📹 Iniciando conversión a video: ${outputVideoPath}`);
      })
      .on("progress", (progress) => {
        if (progress.percent) {
          console.log(`📹 Progreso: ${Math.round(progress.percent)}%`);
        }
      })
      .on("end", () => {
        console.log(`✅ Video creado exitosamente: ${outputVideoPath}`);

        // Get video file size for confirmation
        const stats = fs.statSync(outputVideoPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`📏 Tamaño del video: ${fileSizeInMB} MB`);

        resolve(outputVideoPath);
      })
      .on("error", (err) => {
        console.error(`❌ Error creando video: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

/**
 * Thread-safe version of convertImagesToVideo that handles thread-specific naming
 * @param {string} screenshotsDir - Directory containing the screenshots
 * @param {string} outputVideoPath - Output path for the video
 * @param {number} framerate - Framerate for the video (default: 2)
 * @param {string} threadId - Thread ID for filtering frame files
 * @returns {Promise<string>} Path to the created video
 */
function convertImagesToVideoThreadSafe(
  screenshotsDir,
  outputVideoPath,
  framerate = 2,
  threadId = null
) {
  return new Promise((resolve, reject) => {
    // Check if screenshots directory exists and has files
    if (!fs.existsSync(screenshotsDir)) {
      reject(
        new Error(`Screenshots directory does not exist: ${screenshotsDir}`)
      );
      return;
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputVideoPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Filter files by thread ID if provided
    let files = fs
      .readdirSync(screenshotsDir)
      .filter((file) => file.startsWith("frame_") && file.endsWith(".png"));

    if (threadId) {
      const threadIdSuffix = threadId.slice(-8);
      files = files.filter((file) => file.includes(threadIdSuffix));
    }

    files.sort();

    if (files.length === 0) {
      reject(
        new Error(
          `No frame files found in: ${screenshotsDir}${
            threadId ? ` for thread ${threadId.slice(-8)}` : ""
          }`
        )
      );
      return;
    }

    console.log(
      `🎬 Converting ${files.length} thread-safe images to video...${
        threadId ? ` [Thread: ${threadId.slice(-8)}]` : ""
      }`
    );

    // Create temporary symlinks with sequential naming for ffmpeg
    const tempDir = path.join(
      screenshotsDir,
      `temp_${threadId ? threadId.slice(-8) : Date.now()}`
    );
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
      // Create sequential symlinks
      files.forEach((file, index) => {
        const sourcePath = path.join(screenshotsDir, file);
        const linkPath = path.join(
          tempDir,
          `frame_${String(index + 1).padStart(4, "0")}.png`
        );

        // Copy file instead of symlink for cross-platform compatibility
        fs.copyFileSync(sourcePath, linkPath);
      });

      const inputPattern = path.join(tempDir, "frame_%04d.png");

      ffmpeg()
        .input(inputPattern)
        .inputFPS(framerate)
        .videoCodec("libx264")
        .outputOptions([
          "-pix_fmt yuv420p",
          "-movflags +faststart",
          "-preset medium",
        ])
        .output(outputVideoPath)
        .on("start", (commandLine) => {
          console.log(
            `📹 Starting thread-safe video conversion: ${outputVideoPath}${
              threadId ? ` [Thread: ${threadId.slice(-8)}]` : ""
            }`
          );
        })
        .on("progress", (progress) => {
          if (progress.percent && threadId) {
            // Only log progress every 25% to avoid spam in multi-thread environment
            const percent = Math.round(progress.percent);
            if (percent % 25 === 0) {
              console.log(
                `📹 Thread ${threadId.slice(-8)} Progress: ${percent}%`
              );
            }
          }
        })
        .on("end", () => {
          console.log(
            `✅ Thread-safe video created successfully: ${outputVideoPath}${
              threadId ? ` [Thread: ${threadId.slice(-8)}]` : ""
            }`
          );

          // Cleanup temp directory
          try {
            const tempFiles = fs.readdirSync(tempDir);
            tempFiles.forEach((file) => {
              fs.unlinkSync(path.join(tempDir, file));
            });
            fs.rmdirSync(tempDir);
          } catch (cleanupError) {
            console.warn(
              `⚠️ Warning: Could not cleanup temp directory: ${cleanupError.message}`
            );
          }

          // Get video file size for confirmation
          const stats = fs.statSync(outputVideoPath);
          const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
          console.log(
            `📏 Video size: ${fileSizeInMB} MB${
              threadId ? ` [Thread: ${threadId.slice(-8)}]` : ""
            }`
          );

          resolve(outputVideoPath);
        })
        .on("error", (err) => {
          console.error(
            `❌ Error creating thread-safe video: ${err.message}${
              threadId ? ` [Thread: ${threadId.slice(-8)}]` : ""
            }`
          );

          // Cleanup temp directory on error
          try {
            const tempFiles = fs.readdirSync(tempDir);
            tempFiles.forEach((file) => {
              fs.unlinkSync(path.join(tempDir, file));
            });
            fs.rmdirSync(tempDir);
          } catch (cleanupError) {
            // Ignore cleanup errors
          }

          reject(err);
        })
        .run();
    } catch (setupError) {
      reject(
        new Error(
          `Error setting up thread-safe video conversion: ${setupError.message}`
        )
      );
    }
  });
}

/**
 * Delete screenshots directory after successful video creation
 * @param {string} screenshotsDir - Directory containing the screenshots to delete
 * @returns {Promise<void>}
 */
function deleteScreenshotsDirectory(screenshotsDir) {
  return new Promise((resolve, reject) => {
    try {
      if (fs.existsSync(screenshotsDir)) {
        // Remove all files in the directory first
        const files = fs.readdirSync(screenshotsDir);
        files.forEach((file) => {
          const filePath = path.join(screenshotsDir, file);
          fs.unlinkSync(filePath);
        });

        // Remove the directory itself
        fs.rmdirSync(screenshotsDir);
        console.log(`🗑️ Carpeta de screenshots eliminada: ${screenshotsDir}`);
        resolve();
      } else {
        resolve(); // Directory doesn't exist, nothing to delete
      }
    } catch (error) {
      console.error(
        `⚠️ Error eliminando carpeta de screenshots: ${error.message}`
      );
      reject(error);
    }
  });
}

module.exports = {
  convertImagesToVideo,
  convertImagesToVideoThreadSafe,
  deleteScreenshotsDirectory,
};
