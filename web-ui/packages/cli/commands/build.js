const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const archiver = require('archiver');
const { getAppName } = require('../utils/project');

/**
 * 检测项目类型
 */
function detectProjectType(projectPath) {
  const packageJsonPath = path.join(projectPath, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('找不到 package.json 文件');
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

  // 检查是否为 Expo 项目
  if (dependencies['expo']) {
    return 'expo';
  }

  // 检查是否为 React Native 项目
  if (dependencies['react-native']) {
    return 'react-native';
  }

  throw new Error('不是有效的 React Native 或 Expo 项目');
}

/**
 * 清理 Metro 缓存
 */
function cleanMetroCache() {
  const os = require('os');
  const metroCacheDir = path.join(os.tmpdir(), 'metro-cache');
  
  if (fs.existsSync(metroCacheDir)) {
    try {
      // 递归删除缓存目录
      fs.rmSync(metroCacheDir, { recursive: true, force: true, maxRetries: 3 });
      return true;
    } catch (error) {
      // 忽略删除失败
      return false;
    }
  }
  return true;
}

/**
 * 打包 bundle 和 assets 成 zip
 */
async function packBundleToZip(bundlePath, assetsPath, outputDir, platform) {
  return new Promise((resolve, reject) => {
    const zipPath = path.join(outputDir, `bundle-${platform}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      const zipSize = (archive.pointer() / 1024 / 1024).toFixed(2);
      resolve({ zipPath, zipSize });
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // 添加 bundle 文件到 zip 根目录
    archive.file(bundlePath, { name: path.basename(bundlePath) });

    // 如果 assets 目录存在，将其内容（drawable-* 等）直接添加到 zip 根目录
    // 注意：不是添加 assets 文件夹，而是添加其内部的 drawable-* 目录
    if (fs.existsSync(assetsPath)) {
      const files = fs.readdirSync(assetsPath);
      if (files.length > 0) {
        // 直接将 assets 内容放到 zip 根目录，不创建 assets 子目录
        archive.directory(assetsPath, false);
      }
    }

    archive.finalize();
  });
}

/**
 * 构建 React Native Bundle
 */
async function buildReactNativeBundle(options) {
  const { projectPath, platform, outputDir, entryFile } = options;

  const spinner = ora(`构建 ${platform === 'ios' ? 'iOS' : 'Android'} Bundle...`).start();

  try {
    const bundleFileName = `index.${platform}.bundle`;
    const bundleOutput = path.join(outputDir, bundleFileName);
    const assetsOutput = path.join(outputDir, 'assets');

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    if (!fs.existsSync(assetsOutput)) {
      fs.mkdirSync(assetsOutput, { recursive: true });
    }

    // 清理 Metro 缓存
    spinner.text = '清理 Metro 缓存...';
    cleanMetroCache();

    // 构建命令
    const command = [
      `cd "${projectPath}"`,
      '&&',
      'npx react-native bundle',
      `--platform ${platform}`,
      '--dev false',
      `--entry-file ${entryFile}`,
      `--bundle-output "${bundleOutput}"`,
      `--assets-dest "${assetsOutput}"`,
      '--reset-cache'
    ].join(' ');

    // 暂停 spinner 显示构建输出
    spinner.stop();
    console.log(chalk.gray(`正在执行: npx react-native bundle --platform ${platform} --reset-cache...\n`));
    
    execSync(command, { stdio: 'inherit' });
    
    // 恢复 spinner
    spinner.start();

    const size = (fs.statSync(bundleOutput).size / 1024 / 1024).toFixed(2);
    spinner.succeed(chalk.green(`Bundle 构建完成: ${bundleFileName} (${size} MB)`));

    // 打包 bundle + assets 成 zip
    spinner.start('正在打包 bundle 和 assets...');
    const { zipPath, zipSize } = await packBundleToZip(bundleOutput, assetsOutput, outputDir, platform);
    spinner.succeed(chalk.green(`打包完成: bundle-${platform}.zip (${zipSize} MB)`));

    return {
      bundlePath: bundleOutput,
      zipPath: zipPath,
      assetsPath: assetsOutput,
      size,
      zipSize
    };

  } catch (error) {
    spinner.fail(chalk.red('Bundle 构建失败'));
    throw error;
  }
}

/**
 * 构建 Expo Bundle
 */
async function buildExpoBundle(options) {
  const { projectPath, platform, outputDir } = options;

  const spinner = ora(`构建 Expo ${platform === 'ios' ? 'iOS' : 'Android'} Bundle...`).start();

  try {
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Expo 导出命令
    const exportDir = path.join(outputDir, 'expo-export');
    const command = [
      `cd "${projectPath}"`,
      '&&',
      'npx expo export',
      `--platform ${platform}`,
      `--output-dir "${exportDir}"`,
      '--clear'
    ].join(' ');

    execSync(command, { stdio: 'pipe' });

    // Expo 导出的 bundle 位置
    const bundleFileName = `index.${platform}.bundle`;
    const expoBundlePath = path.join(exportDir, 'bundles', bundleFileName);
    const targetBundlePath = path.join(outputDir, bundleFileName);

    // 如果找到了 bundle 文件，复制到目标位置
    if (fs.existsSync(expoBundlePath)) {
      fs.copyFileSync(expoBundlePath, targetBundlePath);
    } else {
      // 尝试其他可能的路径
      const altPath = path.join(exportDir, `${platform}-bundle`);
      if (fs.existsSync(altPath)) {
        fs.copyFileSync(altPath, targetBundlePath);
      } else {
        throw new Error('找不到导出的 bundle 文件');
      }
    }

    const size = (fs.statSync(targetBundlePath).size / 1024 / 1024).toFixed(2);
    spinner.succeed(chalk.green(`Bundle 构建完成: ${bundleFileName} (${size} MB)`));

    // 打包 bundle + assets 成 zip
    spinner.start('正在打包 bundle 和 assets...');
    const assetsPath = path.join(exportDir, 'assets');
    const { zipPath, zipSize } = await packBundleToZip(targetBundlePath, assetsPath, outputDir, platform);
    spinner.succeed(chalk.green(`打包完成: bundle-${platform}.zip (${zipSize} MB)`));

    return {
      bundlePath: targetBundlePath,
      zipPath: zipPath,
      assetsPath: assetsPath,
      size,
      zipSize
    };

  } catch (error) {
    spinner.fail(chalk.red('Bundle 构建失败'));
    throw error;
  }
}

/**
 * 构建 Android APK
 */
async function buildAndroidAPK({ projectPath, output, buildType }) {
  const spinner = ora('🤖 构建 Android APK...').start();

  try {
    const androidDir = path.join(projectPath, 'android');
    
    if (!fs.existsSync(androidDir)) {
      throw new Error('找不到 android 目录，请确保这是一个 React Native 项目');
    }

    const gradlewPath = path.join(androidDir, 'gradlew');
    if (!fs.existsSync(gradlewPath)) {
      throw new Error('找不到 gradlew 文件');
    }

    if (process.platform !== 'win32') {
      execSync(`chmod +x "${gradlewPath}"`, { stdio: 'pipe' });
    }

    spinner.text = '正在清理旧的构建文件...';
    
    // 先执行 clean
    const cleanCommand = process.platform === 'win32'
      ? `cd "${androidDir}" && gradlew.bat clean`
      : `cd "${androidDir}" && ./gradlew clean`;
    
    execSync(cleanCommand, { stdio: 'pipe' });

    spinner.text = '正在编译 APK（这可能需要几分钟）...';

    const gradleCommand = buildType === 'release' ? 'assembleRelease' : 'assembleDebug';
    const command = process.platform === 'win32'
      ? `cd "${androidDir}" && gradlew.bat ${gradleCommand}`
      : `cd "${androidDir}" && ./gradlew ${gradleCommand}`;

    execSync(command, { stdio: 'pipe' });

    const apkDir = path.join(androidDir, 'app', 'build', 'outputs', 'apk', buildType);
    const apkFiles = fs.readdirSync(apkDir).filter(f => f.endsWith('.apk'));
    
    if (apkFiles.length === 0) {
      throw new Error('未找到生成的 APK 文件');
    }

    const sourceApk = path.join(apkDir, apkFiles[0]);
    const apkSize = (fs.statSync(sourceApk).size / 1024 / 1024).toFixed(2);

    let outputPath = output;
    if (!outputPath) {
      const buildDir = path.join(projectPath, 'build');
      if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
      }
      outputPath = path.join(buildDir, `app-${buildType}.apk`);
    }

    fs.copyFileSync(sourceApk, outputPath);

    spinner.succeed(chalk.green(`APK 构建完成 (${apkSize} MB)`));
    console.log(chalk.gray(`输出文件: ${outputPath}`));
    console.log(chalk.gray('═══════════════════════════════════════════════════════\n'));

    return outputPath;

  } catch (error) {
    spinner.fail(chalk.red('APK 构建失败'));
    if (error.stderr) {
      console.error(chalk.gray(error.stderr.toString()));
    }
    throw error;
  }
}

/**
 * 构建 iOS IPA
 */
async function buildIOSIPA({ projectPath, output, buildType }) {
  const spinner = ora('🍎 构建 iOS IPA...').start();

  try {
    const iosDir = path.join(projectPath, 'ios');
    
    if (!fs.existsSync(iosDir)) {
      throw new Error('找不到 ios 目录，请确保这是一个 React Native 项目');
    }

    // 检查是否在 macOS 上
    if (process.platform !== 'darwin') {
      throw new Error('IPA 构建仅支持在 macOS 上进行');
    }

    spinner.text = '正在编译 iOS 项目（这可能需要几分钟）...';

    // 获取 workspace/project 文件
    const iosFiles = fs.readdirSync(iosDir);
    const workspaceFile = iosFiles.find(f => f.endsWith('.xcworkspace'));
    const projectFile = iosFiles.find(f => f.endsWith('.xcodeproj'));
    
    if (!workspaceFile && !projectFile) {
      throw new Error('找不到 Xcode 项目文件');
    }

    const scheme = workspaceFile ? path.basename(workspaceFile, '.xcworkspace') : path.basename(projectFile, '.xcodeproj');
    const configuration = buildType === 'release' ? 'Release' : 'Debug';
    
    // 构建命令
    const buildCmd = workspaceFile
      ? `xcodebuild -workspace "${path.join(iosDir, workspaceFile)}" -scheme "${scheme}" -configuration ${configuration} -archivePath "${path.join(iosDir, 'build', 'App.xcarchive')}" archive`
      : `xcodebuild -project "${path.join(iosDir, projectFile)}" -scheme "${scheme}" -configuration ${configuration} -archivePath "${path.join(iosDir, 'build', 'App.xcarchive')}" archive`;

    execSync(buildCmd, { stdio: 'pipe', cwd: iosDir });

    spinner.text = '正在导出 IPA...';

    // 创建 exportOptions.plist
    const exportOptionsPlist = path.join(iosDir, 'build', 'exportOptions.plist');
    const exportMethod = buildType === 'release' ? 'app-store' : 'development';
    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>${exportMethod}</string>
  <key>teamID</key>
  <string>YOUR_TEAM_ID</string>
</dict>
</plist>`;

    fs.writeFileSync(exportOptionsPlist, plistContent);

    // 导出 IPA
    const exportPath = path.join(iosDir, 'build', 'export');
    const exportCmd = `xcodebuild -exportArchive -archivePath "${path.join(iosDir, 'build', 'App.xcarchive')}" -exportPath "${exportPath}" -exportOptionsPlist "${exportOptionsPlist}"`;

    execSync(exportCmd, { stdio: 'pipe', cwd: iosDir });

    // 查找生成的 IPA
    const ipaFiles = fs.readdirSync(exportPath).filter(f => f.endsWith('.ipa'));
    
    if (ipaFiles.length === 0) {
      throw new Error('未找到生成的 IPA 文件');
    }

    const sourceIpa = path.join(exportPath, ipaFiles[0]);
    const ipaSize = (fs.statSync(sourceIpa).size / 1024 / 1024).toFixed(2);

    let outputPath = output;
    if (!outputPath) {
      const buildDir = path.join(projectPath, 'build');
      if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
      }
      outputPath = path.join(buildDir, `app-${buildType}.ipa`);
    }

    fs.copyFileSync(sourceIpa, outputPath);

    spinner.succeed(chalk.green(`IPA 构建完成 (${ipaSize} MB)`));
    console.log(chalk.gray(`输出文件: ${outputPath}`));
    console.log(chalk.gray('═══════════════════════════════════════════════════════\n'));

    return outputPath;

  } catch (error) {
    spinner.fail(chalk.red('IPA 构建失败'));
    if (error.stderr) {
      console.error(chalk.gray(error.stderr.toString()));
    }
    throw error;
  }
}

/**
 * 构建命令主函数
 */
async function buildCommand(options) {
  const {
    project,
    output,
    entry = 'index.js',
    type = 'bundle', // 'bundle', 'apk', or 'ipa'
    platform = 'android', // 'android' or 'ios'
    debug = false
  } = options;

  // 验证项目路径
  const projectPath = path.resolve(process.cwd(), project);
  if (!fs.existsSync(projectPath)) {
    console.error(chalk.red(`\n❌ 项目目录不存在: ${projectPath}\n`));
    process.exit(1);
  }

  // 根据 type 确定标题
  let title = '';
  if (type === 'apk') {
    title = 'Android APK';
  } else if (type === 'ipa') {
    title = 'iOS IPA';
  } else {
    title = `${platform === 'ios' ? 'iOS' : 'Android'} Bundle`;
  }

  console.log(chalk.cyan(`\n📦 开始构建 ${title}\n`));
  console.log(chalk.gray('═══════════════════════════════════════════════════════\n'));

  try {
    if (type === 'apk') {
      // 构建 APK
      const buildType = debug ? 'debug' : 'release';
      const apkPath = await buildAndroidAPK({ projectPath, output, buildType });
      return apkPath;
    } else if (type === 'ipa') {
      // 构建 IPA
      const buildType = debug ? 'debug' : 'release';
      const ipaPath = await buildIOSIPA({ projectPath, output, buildType });
      return ipaPath;
    } else {
      // 构建 Bundle
      const projectType = detectProjectType(projectPath);
      console.log(`项目类型: ${chalk.green(projectType)}`);
      console.log(`项目路径: ${chalk.green(projectPath)}`);
      console.log(`平台: ${chalk.green(platform.toUpperCase())}`);
      console.log(`入口文件: ${chalk.green(entry)}`);

      const outputDir = output ? path.resolve(process.cwd(), output) : path.join(projectPath, 'build');
      console.log(`输出目录: ${chalk.green(outputDir)}`);
      console.log(chalk.gray('\n═══════════════════════════════════════════════════════\n'));

      const buildOptions = {
        projectPath,
        platform,
        outputDir,
        entryFile: entry
      };

      let result;
      if (projectType === 'expo') {
        result = await buildExpoBundle(buildOptions);
      } else {
        result = await buildReactNativeBundle(buildOptions);
      }

      console.log(chalk.green.bold('\n✅ 构建完成！\n'));
      console.log(chalk.gray('构建产物：\n'));
      console.log(`${platform === 'ios' ? '🍎' : '🤖'} ${chalk.cyan(platform.toUpperCase())}`);
      console.log(`   Bundle: ${chalk.gray(result.bundlePath)}`);
      console.log(`   Bundle 大小: ${chalk.yellow(result.size)} MB`);
      if (result.assetsPath && fs.existsSync(result.assetsPath)) {
        const assetFiles = fs.readdirSync(result.assetsPath);
        if (assetFiles.length > 0) {
          console.log(`   Assets: ${chalk.gray(result.assetsPath)} (${assetFiles.length} 个文件)`);
        }
      }
      console.log(`   📦 Zip 包: ${chalk.gray(result.zipPath)}`);
      console.log(`   📦 Zip 大小: ${chalk.yellow(result.zipSize)} MB`);
      console.log();

      return result.zipPath;
    }

  } catch (error) {
    console.error(chalk.red(`\n❌ 构建失败: ${error.message}\n`));
    if (error.stderr) {
      console.error(chalk.gray(error.stderr.toString()));
    }
    process.exit(1);
  }
}

module.exports = buildCommand;

