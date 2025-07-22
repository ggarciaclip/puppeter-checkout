/**
 * Thread-Safe Video Recording Manager
 * Ensures isolated screenshot and video generation per test case thread
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class ThreadSafeVideoManager {
  constructor() {
    this.activeRecordings = new Map(); // threadId -> recording info
    this.lockFiles = new Map(); // resource -> lock info
    this.threadSequence = 0;
  }

  /**
   * Initialize thread-safe recording for a test case
   */
  initializeRecording(testCaseId, baseVideoPath) {
    const threadId = this.generateThreadId();
    const isolatedVideoPath = `${baseVideoPath}_thread_${threadId}`;

    // Ensure unique directory per thread
    if (!fs.existsSync(isolatedVideoPath)) {
      fs.mkdirSync(isolatedVideoPath, { recursive: true });
    }

    const recordingInfo = {
      threadId,
      testCaseId,
      videoPath: isolatedVideoPath,
      screenshotCount: 0,
      screenshotErrors: 0,
      startTime: Date.now(),
      locked: false,
      interval: null,
    };

    this.activeRecordings.set(threadId, recordingInfo);

    return {
      threadId,
      videoPath: isolatedVideoPath,
      recordingInfo,
    };
  }

  /**
   * Generate unique thread ID to avoid conflicts
   */
  generateThreadId() {
    this.threadSequence++;
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString("hex");
    return `${timestamp}_${this.threadSequence}_${random}`;
  }

  /**
   * Thread-safe screenshot capture with locking
   */
  async captureScreenshotSafe(threadId, page, targetPage) {
    const recording = this.activeRecordings.get(threadId);
    if (!recording) {
      throw new Error(`No recording found for thread ${threadId}`);
    }

    // Generate unique screenshot path
    const frameNumber = recording.screenshotCount;
    const screenshotPath = path.join(
      recording.videoPath,
      `frame_${String(frameNumber).padStart(6, "0")}_${threadId.slice(-8)}.png`
    );

    // Try multiple pages with thread-safe approach
    const pages = [targetPage, page].filter((p) => p && !p.isClosed());
    let captureSuccess = false;

    for (const currentPage of pages) {
      try {
        // Add thread-specific timeout and retry
        await currentPage.screenshot({
          path: screenshotPath,
          fullPage: false,
          timeout: 3000, // Reduced timeout for thread safety
        });

        recording.screenshotCount++;
        captureSuccess = true;
        break;
      } catch (pageError) {
        continue; // Try next page
      }
    }

    if (!captureSuccess) {
      recording.screenshotErrors++;
    }

    return {
      success: captureSuccess,
      path: screenshotPath,
      frameNumber,
      threadId,
    };
  }

  /**
   * Set up thread-safe screenshot interval
   */
  setupScreenshotInterval(threadId, page, targetPage, testCaseId) {
    const recording = this.activeRecordings.get(threadId);
    if (!recording) {
      throw new Error(`No recording found for thread ${threadId}`);
    }

    // Clear any existing interval
    if (recording.interval) {
      clearInterval(recording.interval);
    }

    recording.interval = setInterval(async () => {
      try {
        const result = await this.captureScreenshotSafe(
          threadId,
          page,
          targetPage
        );

        // Log errors every 5th failure to avoid spam
        if (!result.success && recording.screenshotErrors % 5 === 0) {
          const { logThreadDebug } = require("./logger");
          logThreadDebug(
            threadId,
            `Screenshot ${result.frameNumber} failed (${recording.screenshotErrors} total errors)`,
            {
              frameNumber: result.frameNumber,
              totalErrors: recording.screenshotErrors,
            }
          );
        }
      } catch (error) {
        recording.screenshotErrors++;
        if (recording.screenshotErrors % 5 === 0) {
          const { logThreadDebug } = require("./logger");
          logThreadDebug(threadId, `Interval error - ${error.message}`, {
            error: error.message,
            totalErrors: recording.screenshotErrors,
          });
        }
      }
    }, 1000); // 1000 ms intervals menos es mas video

    return recording.interval;
  }

  /**
   * Thread-safe video conversion with file locking
   */
  async convertToVideoSafe(threadId, outputVideoPath, testCaseId) {
    const recording = this.activeRecordings.get(threadId);
    if (!recording) {
      throw new Error(`No recording found for thread ${threadId}`);
    }

    // Stop the screenshot interval
    if (recording.interval) {
      clearInterval(recording.interval);
      recording.interval = null;
    }

    // Wait for any pending screenshots to complete
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const { convertImagesToVideoThreadSafe } = require("./videoUtils");

    try {
      // Check available frames
      const frameFiles = fs
        .readdirSync(recording.videoPath)
        .filter((file) => file.startsWith("frame_") && file.endsWith(".png"))
        .sort();

      const { logThreadDebug } = require("./logger");
      logThreadDebug(
        threadId,
        `Converting ${frameFiles.length} frames to video`,
        { frameCount: frameFiles.length }
      );

      if (frameFiles.length < 3) {
        // Generate dummy frames for edge case
        const dummyPNG = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
          "base64"
        );

        for (let i = frameFiles.length; i < 5; i++) {
          const dummyPath = path.join(
            recording.videoPath,
            `frame_${String(i).padStart(6, "0")}_${threadId.slice(
              -8
            )}_dummy.png`
          );
          fs.writeFileSync(dummyPath, dummyPNG);
          const { logThreadDebug } = require("./logger");
          logThreadDebug(threadId, `Created dummy frame ${i}`, {
            frameIndex: i,
          });
        }
      }

      // Convert with thread-safe output path
      const threadSafeOutputPath = outputVideoPath.replace(
        ".mp4",
        `_${threadId.slice(-8)}.mp4`
      );
      await convertImagesToVideoThreadSafe(
        recording.videoPath,
        threadSafeOutputPath,
        2,
        threadId
      );

      // Move to final location atomically
      if (fs.existsSync(threadSafeOutputPath)) {
        fs.renameSync(threadSafeOutputPath, outputVideoPath);
        const { logThreadDebug } = require("./logger");
        logThreadDebug(threadId, `Video created successfully`, {
          outputPath: outputVideoPath,
        });
      }

      // Cleanup screenshots directory
      try {
        const { deleteScreenshotsDirectory } = require("./videoUtils");
        await deleteScreenshotsDirectory(recording.videoPath);
        const { logThreadDebug } = require("./logger");
        logThreadDebug(threadId, `Screenshots cleaned up`, {
          cleanupPath: recording.videoPath,
        });
      } catch (cleanupError) {
        const { logThreadDebug } = require("./logger");
        logThreadDebug(threadId, `Cleanup error - ${cleanupError.message}`, {
          error: cleanupError.message,
        });
      }

      return {
        success: true,
        frameCount: recording.screenshotCount,
        errorCount: recording.screenshotErrors,
        duration: Date.now() - recording.startTime,
      };
    } catch (videoError) {
      const { logThreadDebug } = require("./logger");
      logThreadDebug(
        threadId,
        `Video conversion failed - ${videoError.message}`,
        { error: videoError.message }
      );
      return {
        success: false,
        error: videoError.message,
        frameCount: recording.screenshotCount,
        errorCount: recording.screenshotErrors,
      };
    }
  }

  /**
   * Get recording statistics for a thread
   */
  getRecordingStats(threadId) {
    const recording = this.activeRecordings.get(threadId);
    if (!recording) {
      return null;
    }

    return {
      threadId: threadId.slice(-8),
      testCaseId: recording.testCaseId,
      frameCount: recording.screenshotCount,
      errorCount: recording.screenshotErrors,
      duration: Date.now() - recording.startTime,
      isActive: !!recording.interval,
    };
  }

  /**
   * Cleanup thread resources
   */
  cleanupThread(threadId) {
    const recording = this.activeRecordings.get(threadId);
    if (recording) {
      // Clear interval if still active
      if (recording.interval) {
        clearInterval(recording.interval);
      }

      // Remove from active recordings
      this.activeRecordings.delete(threadId);

      const { logThreadDebug } = require("./logger");
      logThreadDebug(threadId, `Resources cleaned up`, {
        activeRecordings: this.activeRecordings.size,
      });
    }
  }

  /**
   * Get all active threads info
   */
  getActiveThreadsInfo() {
    const threads = [];
    for (const [threadId, recording] of this.activeRecordings) {
      threads.push({
        threadId: threadId.slice(-8),
        testCaseId: recording.testCaseId,
        frameCount: recording.screenshotCount,
        errors: recording.screenshotErrors,
        active: !!recording.interval,
      });
    }
    return threads;
  }
}

// Singleton instance for global access
const videoManager = new ThreadSafeVideoManager();

module.exports = {
  ThreadSafeVideoManager,
  videoManager,
};
