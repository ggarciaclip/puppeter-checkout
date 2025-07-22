#!/usr/bin/env node

/**
 * Debug script to analyze video generation issues
 * Investigates why some test cases generate shorter/incomplete videos
 */

const fs = require('fs');
const path = require('path');
const { convertImagesToVideo } = require('./src/lib/videoUtils');

class VideoGenerationDebugger {
  constructor() {
    this.testRunsPath = path.join(process.cwd(), 'completed_tests', 'test_runs');
  }

  async analyzeAllVideos() {
    console.log('🔍 Analyzing all video files in completed test runs...\n');

    if (!fs.existsSync(this.testRunsPath)) {
      console.log('❌ No completed_tests/test_runs directory found');
      return;
    }

    const videoStats = [];

    // Recursively find all video files
    const findVideos = (dir) => {
      const results = [];
      const entries = fs.readdirSync(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          results.push(...findVideos(fullPath));
        } else if (entry === 'test-execution.mp4') {
          results.push(fullPath);
        }
      }

      return results;
    };

    const videos = findVideos(this.testRunsPath);
    console.log(`📹 Found ${videos.length} video files\n`);

    for (const videoPath of videos) {
      const stats = this.analyzeVideo(videoPath);
      videoStats.push(stats);
    }

    // Sort by file size to identify potentially problematic videos
    videoStats.sort((a, b) => a.sizeBytes - b.sizeBytes);

    console.log('\n📊 Video Analysis Summary:');
    console.log('='.repeat(80));

    const smallVideos = videoStats.filter(v => v.sizeKB < 50);
    const mediumVideos = videoStats.filter(v => v.sizeKB >= 50 && v.sizeKB < 100);
    const largeVideos = videoStats.filter(v => v.sizeKB >= 100);

    console.log(`📏 Size Distribution:`);
    console.log(`   🔴 Small (<50KB):   ${smallVideos.length} videos`);
    console.log(`   🟡 Medium (50-100KB): ${mediumVideos.length} videos`);
    console.log(`   🟢 Large (>100KB):  ${largeVideos.length} videos\n`);

    console.log('🔴 Potentially problematic videos (smallest):');
    smallVideos.slice(0, 5).forEach((video, index) => {
      console.log(`   ${index + 1}. ${path.basename(path.dirname(video.path))}: ${video.sizeKB}KB`);
    });

    console.log('\n🟢 Well-recorded videos (largest):');
    largeVideos.slice(-5).forEach((video, index) => {
      console.log(`   ${index + 1}. ${path.basename(path.dirname(video.path))}: ${video.sizeKB}KB`);
    });

    return videoStats;
  }

  analyzeVideo(videoPath) {
    const stat = fs.statSync(videoPath);
    const sizeBytes = stat.size;
    const sizeKB = Math.round(sizeBytes / 1024);
    const testCase = path.basename(path.dirname(videoPath));
    const testRun = path.basename(path.dirname(path.dirname(videoPath)));

    return {
      path: videoPath,
      testCase,
      testRun,
      sizeBytes,
      sizeKB,
      created: stat.birthtime
    };
  }

  async simulateScreenshotCapture() {
    console.log('\n🧪 Simulating screenshot capture timing...\n');

    // Simulate different test durations
    const testDurations = [5, 10, 15, 20, 30]; // seconds

    for (const duration of testDurations) {
      console.log(`⏱️  Test duration: ${duration} seconds`);
      console.log(`📸 Screenshots (1/sec): ${duration}`);
      console.log(`🎬 Video duration (2fps): ${duration / 2} seconds`);
      console.log(`📏 Estimated file size: ~${this.estimateVideoSize(duration)}KB\n`);
    }
  }

  estimateVideoSize(screenshotCount) {
    // Rough estimation based on observed patterns
    // Average ~3KB per screenshot in compressed MP4
    return Math.round(screenshotCount * 3);
  }

  async checkScreenshotDirectories() {
    console.log('🔍 Checking for remaining screenshot directories (failed conversions)...\n');

    const findScreenshotDirs = (dir) => {
      const results = [];
      if (!fs.existsSync(dir)) return results;

      const entries = fs.readdirSync(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        try {
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            if (entry === 'screenshots') {
              results.push(fullPath);
            } else {
              results.push(...findScreenshotDirs(fullPath));
            }
          }
        } catch (err) {
          // Skip inaccessible files
        }
      }

      return results;
    };

    const screenshotDirs = findScreenshotDirs(this.testRunsPath);

    if (screenshotDirs.length > 0) {
      console.log(`⚠️  Found ${screenshotDirs.length} remaining screenshot directories:`);
      screenshotDirs.forEach(dir => {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
        console.log(`   📁 ${dir} (${files.length} images)`);
      });
    } else {
      console.log('✅ No remaining screenshot directories found (all converted successfully)');
    }

    return screenshotDirs;
  }

  async testVideoConversion() {
    console.log('\n🧪 Testing video conversion functionality...\n');

    // Create a test screenshots directory
    const testDir = path.join(process.cwd(), 'test-screenshots');
    const outputVideo = path.join(process.cwd(), 'test-video.mp4');

    // Clean up any existing test files
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    if (fs.existsSync(outputVideo)) {
      fs.unlinkSync(outputVideo);
    }

    console.log('📁 Creating test screenshot directory...');
    fs.mkdirSync(testDir, { recursive: true });

    console.log('🎨 Creating dummy screenshot files...');
    // Create some dummy PNG files (1x1 pixel transparent PNGs)
    const dummyPNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');

    for (let i = 0; i < 10; i++) {
      const frameName = `frame_${String(i).padStart(4, '0')}.png`;
      fs.writeFileSync(path.join(testDir, frameName), dummyPNG);
    }

    console.log('📹 Testing video conversion...');
    try {
      await convertImagesToVideo(testDir, outputVideo, 2);
      
      if (fs.existsSync(outputVideo)) {
        const stat = fs.statSync(outputVideo);
        console.log(`✅ Video conversion successful! Output: ${Math.round(stat.size / 1024)}KB`);
      } else {
        console.log('❌ Video file was not created');
      }
    } catch (error) {
      console.log(`❌ Video conversion failed: ${error.message}`);
    }

    // Clean up
    console.log('🧹 Cleaning up test files...');
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    if (fs.existsSync(outputVideo)) {
      fs.unlinkSync(outputVideo);
    }
  }

  generateReport(videoStats) {
    console.log('\n📋 Detailed Video Generation Analysis Report');
    console.log('='.repeat(80));

    const avgSize = videoStats.reduce((sum, v) => sum + v.sizeKB, 0) / videoStats.length;
    const minSize = Math.min(...videoStats.map(v => v.sizeKB));
    const maxSize = Math.max(...videoStats.map(v => v.sizeKB));

    console.log(`📊 Statistics:`);
    console.log(`   📹 Total videos analyzed: ${videoStats.length}`);
    console.log(`   📏 Average size: ${Math.round(avgSize)}KB`);
    console.log(`   📉 Minimum size: ${minSize}KB`);
    console.log(`   📈 Maximum size: ${maxSize}KB`);
    console.log(`   📊 Size range: ${maxSize - minSize}KB`);

    // Identify potential issues
    const suspiciousVideos = videoStats.filter(v => v.sizeKB < avgSize * 0.5);
    
    if (suspiciousVideos.length > 0) {
      console.log(`\n⚠️  Suspicious videos (less than 50% of average size):`);
      suspiciousVideos.forEach(video => {
        console.log(`   🔴 ${video.testCase}: ${video.sizeKB}KB`);
      });

      console.log(`\n💡 Possible causes for short videos:`);
      console.log(`   1. Test completed very quickly (less screenshot capture time)`);
      console.log(`   2. Page navigation issues preventing screenshot capture`);
      console.log(`   3. Early test termination due to errors`);
      console.log(`   4. Browser page becoming unresponsive`);
      console.log(`   5. Puppeteer page closure before video recording stops`);
    } else {
      console.log(`\n✅ All videos appear to have reasonable sizes`);
    }
  }
}

async function main() {
  console.log('🎬 PayClip Video Generation Debugger');
  console.log('=====================================\n');

  const debugger = new VideoGenerationDebugger();

  try {
    // Test video conversion functionality first
    await debugger.testVideoConversion();

    // Check for failed conversions
    await debugger.checkScreenshotDirectories();

    // Analyze all existing videos
    const videoStats = await debugger.analyzeAllVideos();

    // Simulate timing scenarios
    await debugger.simulateScreenshotCapture();

    // Generate detailed report
    if (videoStats.length > 0) {
      debugger.generateReport(videoStats);
    }

    console.log('\n🎯 Investigation Complete!');
    console.log('Check the analysis above to identify potential video generation issues.');

  } catch (error) {
    console.error(`❌ Debug script failed: ${error.message}`);
    console.error(error.stack);
  }
}

if (require.main === module) {
  main();
}

module.exports = VideoGenerationDebugger;
