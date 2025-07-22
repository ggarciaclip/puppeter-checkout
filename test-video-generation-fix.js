#!/usr/bin/env node

/**
 * Test rápido para verificar generación de videos thread-safe
 * Simula la creación de screenshots y conversión a video
 */

const fs = require("fs");
const path = require("path");
const { videoManager } = require("./src/lib/threadSafeVideoManager");
const { convertImagesToVideoThreadSafe } = require("./src/lib/videoUtils");

async function testVideoGeneration() {
  console.log("🧪 Testing thread-safe video generation...\n");

  const testCaseId = "VIDEO_TEST_001";
  const testDir = "/tmp/test_video_generation";

  try {
    // 1. Initialize thread-safe recording
    console.log("📹 Initializing thread-safe recording...");
    const recording = videoManager.initializeRecording(testCaseId, testDir);
    const { threadId, videoPath } = recording;

    console.log(`🧵 Thread ID: ${threadId.slice(-8)}`);
    console.log(`📁 Video Path: ${videoPath}`);

    // 2. Create some dummy screenshot files
    console.log("\n📸 Creating dummy screenshots...");
    const dummyPNG = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      "base64"
    );

    // Create 5 dummy frames with thread-safe naming
    for (let i = 0; i < 5; i++) {
      const framePath = path.join(
        videoPath,
        `frame_${String(i + 1).padStart(6, "0")}_${threadId.slice(-8)}.png`
      );
      fs.writeFileSync(framePath, dummyPNG);
      console.log(`   Created: ${path.basename(framePath)}`);
    }

    // 3. Test thread-safe video conversion
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
      } else {
        console.log(`\n❌ ERROR: Video file was not created`);
      }
    } catch (videoError) {
      console.log(`\n❌ ERROR creating video: ${videoError.message}`);
    }

    // 4. Test full VideoManager conversion
    console.log("\n🔄 Testing full VideoManager conversion...");
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
      } else {
        console.log(
          `\n❌ ERROR: VideoManager conversion failed: ${conversionResult.error}`
        );
      }
    } catch (managerError) {
      console.log(`\n❌ ERROR in VideoManager: ${managerError.message}`);
    }

    // 5. Cleanup
    console.log("\n🧹 Cleaning up test files...");
    videoManager.cleanupThread(threadId);

    // Remove test directory
    try {
      if (fs.existsSync(testDir)) {
        const removeDir = (dirPath) => {
          if (fs.existsSync(dirPath)) {
            fs.readdirSync(dirPath).forEach((file) => {
              const fullPath = path.join(dirPath, file);
              if (fs.lstatSync(fullPath).isDirectory()) {
                removeDir(fullPath);
              } else {
                fs.unlinkSync(fullPath);
              }
            });
            fs.rmdirSync(dirPath);
          }
        };
        removeDir(testDir);
        console.log("   Removed test directory");
      }
    } catch (cleanupError) {
      console.log(
        `   Warning: Could not cleanup test directory: ${cleanupError.message}`
      );
    }

    console.log("\n🎯 Test completed!");
  } catch (error) {
    console.error("\n💥 Test failed with error:", error.message);
    console.error(error.stack);
  }
}

// Run the test
testVideoGeneration();
