#!/usr/bin/env node

/**
 * Test de generación de videos thread-safe con imágenes válidas
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { videoManager } = require("./src/lib/threadSafeVideoManager");
const { convertImagesToVideoThreadSafe } = require("./src/lib/videoUtils");

async function testWithValidImages() {
  console.log("🧪 Testing video generation with valid images...\n");

  const testCaseId = "VIDEO_TEST_002";
  const testDir = "/tmp/test_video_valid";

  try {
    // 1. Initialize thread-safe recording
    console.log("📹 Initializing thread-safe recording...");
    const recording = videoManager.initializeRecording(testCaseId, testDir);
    const { threadId, videoPath } = recording;

    console.log(`🧵 Thread ID: ${threadId.slice(-8)}`);
    console.log(`📁 Video Path: ${videoPath}`);

    // 2. Create valid PNG images using ImageMagick or simple method
    console.log("\n📸 Creating valid PNG images...");

    // Create a simple 100x100 colored image for each frame
    for (let i = 0; i < 5; i++) {
      const framePath = path.join(
        videoPath,
        `frame_${String(i + 1).padStart(6, "0")}_${threadId.slice(-8)}.png`
      );

      try {
        // Use ffmpeg to create a simple colored image
        const ffmpegStatic = require("ffmpeg-static");
        const color = ["red", "green", "blue", "yellow", "cyan"][i];

        execSync(
          `${ffmpegStatic} -f lavfi -i "color=${color}:size=100x100:duration=1" -frames:v 1 -y "${framePath}"`,
          {
            stdio: "pipe",
          }
        );

        console.log(`   Created: ${path.basename(framePath)} (${color})`);
      } catch (imageError) {
        console.error(`   Failed to create ${framePath}:`, imageError.message);
      }
    }

    // 3. Verify files were created
    const createdFiles = fs
      .readdirSync(videoPath)
      .filter((file) => file.startsWith("frame_") && file.endsWith(".png"));

    console.log(`\n📊 Created ${createdFiles.length} image files`);

    if (createdFiles.length === 0) {
      throw new Error("No image files were created");
    }

    // 4. Test thread-safe video conversion
    console.log("\n🎬 Testing thread-safe video conversion...");
    const outputVideoPath = path.join(
      testDir,
      `test_video_${threadId.slice(-8)}.mp4`
    );

    try {
      await convertImagesToVideoThreadSafe(
        videoPath,
        outputVideoPath,
        2,
        threadId
      );

      if (fs.existsSync(outputVideoPath)) {
        const stats = fs.statSync(outputVideoPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`\n✅ SUCCESS: Video created successfully!`);
        console.log(`   📄 File: ${outputVideoPath}`);
        console.log(`   📏 Size: ${fileSizeInMB} MB`);

        // Test video info
        try {
          const ffmpegStatic = require("ffmpeg-static");
          const videoInfo = execSync(
            `${ffmpegStatic} -i "${outputVideoPath}" 2>&1 | grep "Duration"`,
            {
              encoding: "utf8",
            }
          );
          console.log(`   ⏱️ Info: ${videoInfo.trim()}`);
        } catch (e) {
          // Video info failed, but that's ok
        }
      } else {
        console.log(`\n❌ ERROR: Video file was not created`);
      }
    } catch (videoError) {
      console.log(`\n❌ ERROR creating video: ${videoError.message}`);
    }

    // 5. Test full VideoManager conversion
    console.log("\n🔄 Testing full VideoManager conversion...");

    // Create a few more images for the full test
    for (let i = 5; i < 8; i++) {
      const framePath = path.join(
        videoPath,
        `frame_${String(i + 1).padStart(6, "0")}_${threadId.slice(-8)}.png`
      );

      try {
        const ffmpegStatic = require("ffmpeg-static");
        const color = ["magenta", "orange", "purple"][i - 5];

        execSync(
          `${ffmpegStatic} -f lavfi -i "color=${color}:size=100x100:duration=1" -frames:v 1 -y "${framePath}"`,
          {
            stdio: "pipe",
          }
        );

        console.log(`   Added: ${path.basename(framePath)} (${color})`);
      } catch (e) {
        // Ignore errors for additional frames
      }
    }

    const fullTestOutputPath = path.join(testDir, `full_test_video.mp4`);

    try {
      const conversionResult = await videoManager.convertToVideoSafe(
        threadId,
        fullTestOutputPath,
        testCaseId
      );

      if (conversionResult.success) {
        console.log(`\n✅ SUCCESS: Full VideoManager conversion completed!`);
        console.log(`   📊 Frames: ${conversionResult.frameCount}`);
        console.log(
          `   ⏱️ Duration: ${Math.round(conversionResult.duration / 1000)}s`
        );
        console.log(`   ❌ Errors: ${conversionResult.errorCount}`);

        if (fs.existsSync(fullTestOutputPath)) {
          const stats = fs.statSync(fullTestOutputPath);
          const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
          console.log(`   📏 Size: ${fileSizeInMB} MB`);
        }
      } else {
        console.log(
          `\n❌ ERROR: VideoManager conversion failed: ${conversionResult.error}`
        );
      }
    } catch (managerError) {
      console.log(`\n❌ ERROR in VideoManager: ${managerError.message}`);
    }

    // 6. Cleanup
    console.log("\n🧹 Cleaning up test files...");
    videoManager.cleanupThread(threadId);

    console.log("\n🎯 Test completed successfully!");
  } catch (error) {
    console.error("\n💥 Test failed with error:", error.message);
    console.error(error.stack);
  }
}

// Run the test
testWithValidImages();
