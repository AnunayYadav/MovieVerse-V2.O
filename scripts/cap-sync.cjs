const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, '../dist');
const publicDir = path.join(__dirname, '../public');

console.log('MovieVerse Sync: Temporarily removing APK files from dist/ to avoid self-bundling...');
const backupApks = [];

if (fs.existsSync(distDir)) {
  const files = fs.readdirSync(distDir);
  files.forEach(file => {
    if (file.endsWith('.apk')) {
      const distApkPath = path.join(distDir, file);
      const publicApkPath = path.join(publicDir, file);
      
      backupApks.push({ name: file, distPath: distApkPath, publicPath: publicApkPath });
      fs.unlinkSync(distApkPath);
    }
  });
}

try {
  console.log('MovieVerse Sync: Running npx cap sync...');
  execSync('npx cap sync', { stdio: 'inherit' });
  console.log('MovieVerse Sync: Capacitor sync completed successfully!');
} catch (error) {
  console.error('MovieVerse Sync: Error running npx cap sync:', error);
  process.exit(1);
} finally {
  backupApks.forEach(apk => {
    if (fs.existsSync(apk.publicPath)) {
      console.log(`MovieVerse Sync: Restoring ${apk.name} back to dist/ for web hosting...`);
      fs.copyFileSync(apk.publicPath, apk.distPath);
    }
  });
}
