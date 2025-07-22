#!/usr/bin/env node

/**
 * Test simple para debuggear ffmpeg
 */

const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const fs = require("fs");
const path = require("path");

// Set the path to the static ffmpeg binary
ffmpeg.setFfmpegPath(ffmpegStatic);

async function testFFmpeg() {
  console.log("🧪 Testing ffmpeg installation...\n");

  console.log("📍 FFmpeg path:", ffmpegStatic);
  console.log("📍 FFmpeg exists:", fs.existsSync(ffmpegStatic));

  // Test basic ffmpeg info
  ffmpeg.getAvailableFormats((err, formats) => {
    if (err) {
      console.error("❌ Error getting formats:", err.message);
    } else {
      console.log(
        "✅ FFmpeg is working, available formats:",
        Object.keys(formats).length
      );
    }
  });

  // Create a simple test
  const testDir = "/tmp/simple_ffmpeg_test";
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // Create a better dummy PNG (1x1 pixel red image)
  const dummyPNG = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG signature
    0x00,
    0x00,
    0x00,
    0x0d, // IHDR chunk size
    0x49,
    0x48,
    0x44,
    0x52, // IHDR
    0x00,
    0x00,
    0x00,
    0x01, // width = 1
    0x00,
    0x00,
    0x00,
    0x01, // height = 1
    0x08,
    0x02,
    0x00,
    0x00,
    0x00, // bit depth, color type, etc.
    0x90,
    0x77,
    0x53,
    0xde, // IHDR CRC
    0x00,
    0x00,
    0x00,
    0x0c, // IDAT chunk size
    0x49,
    0x44,
    0x41,
    0x54, // IDAT
    0x08,
    0x99,
    0x01,
    0x01,
    0x00,
    0x00,
    0x00,
    0xff,
    0xff,
    0x00,
    0x00,
    0x00,
    0x02,
    0x00,
    0x01, // compressed data
    0x00,
    0x00,
    0x00,
    0x00, // IEND chunk size
    0x49,
    0x45,
    0x4e,
    0x44, // IEND
    0xae,
    0x42,
    0x60,
    0x82, // IEND CRC
  ]);

  // Create 3 test images
  for (let i = 1; i <= 3; i++) {
    const imagePath = path.join(
      testDir,
      `frame_${String(i).padStart(4, "0")}.png`
    );
    fs.writeFileSync(imagePath, dummyPNG);
    console.log(`   Created: ${path.basename(imagePath)}`);
  }

  const outputVideo = path.join(testDir, "test_output.mp4");
  const inputPattern = path.join(testDir, "frame_%04d.png");

  console.log("\n🎬 Testing simple ffmpeg conversion...");
  console.log("📁 Input pattern:", inputPattern);
  console.log("📁 Output video:", outputVideo);

  try {
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(inputPattern)
        .inputFPS(1)
        .videoCodec("libx264")
        .outputOptions([
          "-pix_fmt yuv420p",
          "-movflags +faststart",
          "-preset ultrafast", // Use ultrafast for testing
          "-t 3", // Limit to 3 seconds
        ])
        .output(outputVideo)
        .on("start", (commandLine) => {
          console.log("📹 FFmpeg command:", commandLine);
        })
        .on("progress", (progress) => {
          console.log("📹 Progress:", JSON.stringify(progress));
        })
        .on("end", () => {
          console.log("✅ Video conversion completed!");

          if (fs.existsSync(outputVideo)) {
            const stats = fs.statSync(outputVideo);
            console.log(`📏 Video size: ${stats.size} bytes`);
          }

          resolve();
        })
        .on("error", (err) => {
          console.error("❌ FFmpeg error:", err.message);
          console.error("❌ Full error:", err);
          reject(err);
        })
        .run();
    });

    console.log("\n✅ Simple ffmpeg test completed successfully!");
  } catch (error) {
    console.error("\n❌ Simple ffmpeg test failed:", error.message);
  }

  // Cleanup
  try {
    const files = fs.readdirSync(testDir);
    files.forEach((file) => {
      fs.unlinkSync(path.join(testDir, file));
    });
    fs.rmdirSync(testDir);
    console.log("\n🧹 Cleanup completed");
  } catch (e) {
    console.log("\n⚠️ Cleanup warning:", e.message);
  }
}

testFFmpeg();
