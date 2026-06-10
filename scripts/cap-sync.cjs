const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distApk = path.join(__dirname, '../dist/movieverse-tv.apk');
const publicApk = path.join(__dirname, '../public/movieverse-tv.apk');

console.log('MovieVerse Sync: Temporarily removing APK from dist/ to avoid self-bundling...');
let apkExisted = false;
if (fs.existsSync(distApk)) {
  fs.unlinkSync(distApk);
  apkExisted = true;
}

try {
  console.log('MovieVerse Sync: Running npx cap sync...');
  execSync('npx cap sync', { stdio: 'inherit' });
  console.log('MovieVerse Sync: Capacitor sync completed successfully!');
} catch (error) {
  console.error('MovieVerse Sync: Error running npx cap sync:', error);
  process.exit(1);
} finally {
  if (apkExisted && fs.existsSync(publicApk)) {
    console.log('MovieVerse Sync: Restoring APK back to dist/ for web hosting...');
    fs.copyFileSync(publicApk, distApk);
  }
}
