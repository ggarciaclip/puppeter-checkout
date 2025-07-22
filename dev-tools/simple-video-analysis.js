#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎬 Video Generation Analysis');
console.log('============================\n');

const testRunsPath = path.join(process.cwd(), 'completed_tests', 'test_runs');

if (!fs.existsSync(testRunsPath)) {
  console.log('❌ No completed_tests/test_runs directory found');
  process.exit(1);
}

// Find all video files recursively
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

const videos = findVideos(testRunsPath);
console.log(`📹 Found ${videos.length} video files\n`);

const videoStats = videos.map(videoPath => {
  const stat = fs.statSync(videoPath);
  const sizeBytes = stat.size;
  const sizeKB = Math.round(sizeBytes / 1024);
  const testCase = path.basename(path.dirname(videoPath));
  
  return {
    path: videoPath,
    testCase,
    sizeKB,
    sizeBytes
  };
});

// Sort by size
videoStats.sort((a, b) => a.sizeKB - b.sizeKB);

console.log('📊 Video Size Analysis:');
console.log('-'.repeat(60));

const small = videoStats.filter(v => v.sizeKB < 50);
const medium = videoStats.filter(v => v.sizeKB >= 50 && v.sizeKB < 100);
const large = videoStats.filter(v => v.sizeKB >= 100);

console.log(`🔴 Small (<50KB):     ${small.length} videos`);
console.log(`🟡 Medium (50-100KB): ${medium.length} videos`);
console.log(`🟢 Large (>100KB):    ${large.length} videos\n`);

console.log('🔴 Smallest videos (potential issues):');
small.slice(0, 5).forEach((video, index) => {
  console.log(`   ${index + 1}. ${video.testCase}: ${video.sizeKB}KB`);
});

console.log('\n🟢 Largest videos (good captures):');
large.slice(-5).forEach((video, index) => {
  console.log(`   ${index + 1}. ${video.testCase}: ${video.sizeKB}KB`);
});

// Calculate statistics
const avgSize = videoStats.reduce((sum, v) => sum + v.sizeKB, 0) / videoStats.length;
const minSize = Math.min(...videoStats.map(v => v.sizeKB));
const maxSize = Math.max(...videoStats.map(v => v.sizeKB));

console.log('\n📈 Statistics:');
console.log(`   Average: ${Math.round(avgSize)}KB`);
console.log(`   Range: ${minSize}KB - ${maxSize}KB`);
console.log(`   Variance: ${maxSize - minSize}KB`);

// Analysis
if (maxSize - minSize > 50) {
  console.log('\n⚠️  High variance detected in video sizes!');
  console.log('💡 This suggests inconsistent recording durations.');
  
  if (small.length > 0) {
    console.log('\n🔍 Possible causes for small videos:');
    console.log('   1. Test completed too quickly (< 10 seconds)');
    console.log('   2. Screenshot interval was cleared prematurely');
    console.log('   3. Page became unresponsive during recording');
    console.log('   4. Error occurred before significant screenshots captured');
  }
} else {
  console.log('\n✅ Video sizes are relatively consistent');
}

console.log('\n📋 Summary:');
console.log(`Total videos: ${videos.length}`);
console.log(`Potentially problematic: ${small.length} (${Math.round(small.length/videos.length*100)}%)`);
