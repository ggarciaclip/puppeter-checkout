#!/usr/bin/env node

/**
 * Test directo de convertImagesToVideoThreadSafe sin logging personalizado
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Import solo la función que necesitamos
const { convertImagesToVideoThreadSafe } = require("./src/lib/videoUtils");

async function testDirectVideoConversion() {
  console.log("🧪 Direct video conversion test...\n");

  const testDir = "/tmp/direct_video_test";
  const threadId = "test_12345678_1_abcdefgh";

  try {
    // 1. Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    console.log("📸 Creating test images...");

    // 2. Create valid PNG images using ffmpeg
    const ffmpegStatic = require("ffmpeg-static");

    for (let i = 0; i < 3; i++) {
      const framePath = path.join(
        testDir,
        `frame_${String(i + 1).padStart(6, "0")}_12345678.png`
      );
      const color = ["red", "green", "blue"][i];

      try {
        execSync(
          `"${ffmpegStatic}" -f lavfi -i "color=${color}:size=200x200:duration=1" -frames:v 1 -y "${framePath}"`,
          {
            stdio: "inherit",
            timeout: 10000,
          }
        );

        console.log(`   ✅ Created: ${path.basename(framePath)}`);
      } catch (imageError) {
        console.error(
          `   ❌ Failed to create ${framePath}:`,
          imageError.message
        );
        return;
      }
    }

    // 3. Verify files
    const createdFiles = fs
      .readdirSync(testDir)
      .filter((file) => file.startsWith("frame_") && file.endsWith(".png"));

    console.log(`\n📊 Found ${createdFiles.length} image files`);

    if (createdFiles.length === 0) {
      throw new Error("No image files found");
    }

    // 4. Test video conversion
    console.log("\n🎬 Converting to video...");
    const outputVideoPath = path.join(testDir, "output.mp4");

    try {
      const result = await convertImagesToVideoThreadSafe(
        testDir,
        outputVideoPath,
        2,
        threadId
      );

      if (fs.existsSync(outputVideoPath)) {
        const stats = fs.statSync(outputVideoPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`\n✅ SUCCESS: Video created!`);
        console.log(`   📄 File: ${outputVideoPath}`);
        console.log(`   📏 Size: ${fileSizeInMB} MB`);

        // Get video duration
        try {
          const videoInfo = execSync(
            `"${ffmpegStatic}" -i "${outputVideoPath}" 2>&1 | head -20`,
            {
              encoding: "utf8",
              timeout: 5000,
            }
          );
          const durationMatch = videoInfo.match(/Duration: ([^,]+)/);
          if (durationMatch) {
            console.log(`   ⏱️ Duration: ${durationMatch[1]}`);
          }
        } catch (e) {
          console.log(`   ⏱️ Duration: Could not determine`);
        }
      } else {
        console.log(`\n❌ ERROR: Video file was not created`);
      }
    } catch (videoError) {
      console.error(`\n❌ ERROR creating video:`, videoError);
    }

    // 5. Cleanup
    console.log("\n🧹 Cleaning up...");
    try {
      const files = fs.readdirSync(testDir);
      files.forEach((file) => {
        fs.unlinkSync(path.join(testDir, file));
      });
      fs.rmdirSync(testDir);
      console.log("   Cleanup completed");
    } catch (e) {
      console.log("   Cleanup warning:", e.message);
    }

    console.log("\n🎯 Direct test completed!");
  } catch (error) {
    console.error("\n💥 Direct test failed:", error.message);
    console.error(error.stack);
  }
}

// Run the test
testDirectVideoConversion().catch(console.error);
