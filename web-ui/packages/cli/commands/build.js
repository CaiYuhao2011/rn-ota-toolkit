const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const archiver = require('archiver');
const { getAppVersion, updateAppVersion, versionToVersionCode } = require('../utils/project');

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
async function packBundleToZip(bundlePath, assetsPath, outputDir, platform, appName, version) {
  return new Promise((resolve, reject) => {
    // 生成文件名：appName_v1_0_0_ota.zip
    const versionStr = version.replace(/\./g, '_');
    const zipFileName = `${appName}_v${versionStr}_ota.zip`;
    const zipPath = path.join(outputDir, zipFileName);
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
  const { projectPath, platform, outputDir, entryFile, appName, version } = options;

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
    console.log(chalk.cyan(`\n开始构建 ${platform.toUpperCase()} Bundle...\n`));
    console.log(chalk.gray(`命令: npx react-native bundle --platform ${platform} --reset-cache\n`));
    
    execSync(command, { stdio: 'inherit' });
    
    console.log(); // 换行
    const packSpinner = ora('检查构建产物...').start();
    const size = (fs.statSync(bundleOutput).size / 1024 / 1024).toFixed(2);
    packSpinner.succeed(chalk.green(`Bundle 构建完成: ${bundleFileName} (${size} MB)`));

    // 打包 bundle + assets 成 zip
    const zipSpinner = ora('正在打包 bundle 和 assets...').start();
    const { zipPath, zipSize } = await packBundleToZip(bundleOutput, assetsOutput, outputDir, platform, appName, version);
    const zipFileName = path.basename(zipPath);
    zipSpinner.succeed(chalk.green(`打包完成: ${zipFileName} (${zipSize} MB)`));

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
  const { projectPath, platform, outputDir, appName, version } = options;

  const spinner = ora(`构建 Expo ${platform === 'ios' ? 'iOS' : 'Android'} Bundle...`).start();

  try {
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 清理 Metro 缓存
    spinner.text = '清理 Metro 缓存...';
    cleanMetroCache();

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

    // 暂停 spinner 显示构建输出
    spinner.stop();
    console.log(chalk.cyan(`\n开始导出 Expo ${platform.toUpperCase()} Bundle...\n`));
    console.log(chalk.gray(`命令: npx expo export --platform ${platform} --clear\n`));
    
    execSync(command, { stdio: 'inherit' });
    
    console.log(); // 换行
    
    // Expo 导出的 bundle 位置（尝试多个可能的路径）
    // 新版 Expo (SDK 50+) 的 bundle 在 _expo/static/js/{platform}/ 目录下
    // 查找主 bundle 文件（通常是 entry-*.js 或 entry-*.hbc）
    const processSpinner = ora('查找导出的 bundle 文件...').start();
    let sourceBundlePath = null;
    let bundleExtension = '.bundle'; // 默认扩展名
    
    const platformJsDir = path.join(exportDir, '_expo', 'static', 'js', platform);
    
    if (fs.existsSync(platformJsDir)) {
      // 新版 Expo - 查找所有 .js 或 .hbc 文件，选择最大的（主 bundle）
      // .hbc 是 Hermes bytecode 文件
      const jsFiles = fs.readdirSync(platformJsDir)
        .filter(f => f.endsWith('.js') || f.endsWith('.hbc'))
        .map(f => ({
          name: f,
          path: path.join(platformJsDir, f),
          size: fs.statSync(path.join(platformJsDir, f)).size
        }))
        .sort((a, b) => b.size - a.size); // 按大小降序
      
      if (jsFiles.length > 0) {
        sourceBundlePath = jsFiles[0].path;
        // 如果是 Hermes bytecode，保留 .hbc 扩展名
        if (jsFiles[0].name.endsWith('.hbc')) {
          bundleExtension = '.hbc';
        }
        processSpinner.text = `找到 bundle: ${jsFiles[0].name} (${(jsFiles[0].size / 1024 / 1024).toFixed(2)} MB)`;
      }
    }
    
    const bundleFileName = `index.${platform}${bundleExtension}`;
    const targetBundlePath = path.join(outputDir, bundleFileName);
    
    // 如果新版路径找不到，尝试旧版 Expo 路径
    if (!sourceBundlePath) {
      const oldPaths = [
        path.join(exportDir, 'bundles', bundleFileName),
        path.join(exportDir, '_expo', 'static', 'js', `${platform}-index.js`),
        path.join(exportDir, `${platform}-bundle`),
      ];
      
      for (const possiblePath of oldPaths) {
        if (fs.existsSync(possiblePath)) {
          sourceBundlePath = possiblePath;
          break;
        }
      }
    }

    if (!sourceBundlePath) {
      processSpinner.stop();
      // 列出导出目录的内容以帮助调试
      console.log(chalk.yellow('\n导出目录内容：'));
      const listDir = (dir, indent = '') => {
        if (fs.existsSync(dir)) {
          const items = fs.readdirSync(dir);
          items.forEach(item => {
            const fullPath = path.join(dir, item);
            const stats = fs.statSync(fullPath);
            console.log(chalk.gray(`${indent}- ${item}${stats.isDirectory() ? '/' : ''}`));
            if (stats.isDirectory() && indent.length < 8) {
              listDir(fullPath, indent + '  ');
            }
          });
        }
      };
      listDir(exportDir);
      throw new Error('找不到导出的 bundle 文件，请检查上面的目录结构');
    }
    
    // 复制 bundle 文件
    fs.copyFileSync(sourceBundlePath, targetBundlePath);

    const size = (fs.statSync(targetBundlePath).size / 1024 / 1024).toFixed(2);
    processSpinner.succeed(chalk.green(`Bundle 构建完成: ${bundleFileName} (${size} MB)`));

    // 打包 bundle + assets 成 zip
    const zipSpinner = ora('正在打包 bundle 和 assets...').start();
    const assetsPath = path.join(exportDir, 'assets');
    const { zipPath, zipSize } = await packBundleToZip(targetBundlePath, assetsPath, outputDir, platform, appName, version);
    const zipFileName = path.basename(zipPath);
    zipSpinner.succeed(chalk.green(`打包完成: ${zipFileName} (${zipSize} MB)`));

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
 * 构建 Expo Android APK (使用 EAS Build)
 */
async function buildExpoAPK({ projectPath, output, buildType, appName, version }) {
  const spinner = ora('🤖 构建 Expo Android APK (使用 EAS Build)...').start();

  try {
    // 检查是否有 eas.json 配置文件
    const easConfigPath = path.join(projectPath, 'eas.json');
    if (!fs.existsSync(easConfigPath)) {
      throw new Error('找不到 eas.json 配置文件，请先运行 "eas build:configure"');
    }

    // 检查并执行 prebuild（确保 Config Plugins 生效）
    const androidDir = path.join(projectPath, 'android');
    const pluginsDir = path.join(projectPath, 'plugins');
    
    // 如果存在 plugins 目录，执行 prebuild 以确保插件生效
    if (fs.existsSync(pluginsDir)) {
      spinner.stop();
      console.log(chalk.cyan('\n正在执行 expo prebuild（应用 Config Plugins）...\n'));
      const prebuildCommand = `cd "${projectPath}" && npx expo prebuild -p android --no-install`;
      try {
        execSync(prebuildCommand, { stdio: 'inherit' });
        console.log(chalk.green('\n✔ expo prebuild 完成\n'));
      } catch (err) {
        // 如果 prebuild 失败，继续尝试构建（可能已经 prebuild 过了）
        console.log(chalk.yellow('\n⚠ expo prebuild 失败，继续尝试构建...\n'));
      }
      spinner.start('正在使用 EAS Build 构建 APK...');
    }

    spinner.text = '正在使用 EAS Build 构建 APK（这可能需要几分钟）...';

    // 使用 EAS Build 本地构建
    const profile = buildType === 'release' ? 'production' : 'development';
    const command = `cd "${projectPath}" && eas build -p android --profile ${profile} --local --non-interactive`;

    spinner.stop();
    console.log(chalk.cyan(`\n正在使用 EAS Build 构建 APK...\n`));
    console.log(chalk.gray(`命令: eas build -p android --profile ${profile} --local\n`));
    execSync(command, { stdio: 'inherit' });
    console.log();
    
    const resultSpinner = ora('查找构建产物...').start();

    // EAS Build 通常会在项目根目录生成 APK
    // 查找最新的 .apk 文件
    const possiblePaths = [
      projectPath,
      path.join(projectPath, 'build'),
    ];

    let sourceApk = null;
    for (const searchPath of possiblePaths) {
      if (!fs.existsSync(searchPath)) continue;
      
      const files = fs.readdirSync(searchPath);
      const apkFiles = files.filter(f => f.endsWith('.apk')).sort((a, b) => {
        const statA = fs.statSync(path.join(searchPath, a));
        const statB = fs.statSync(path.join(searchPath, b));
        return statB.mtimeMs - statA.mtimeMs; // 最新的在前
      });

      if (apkFiles.length > 0) {
        sourceApk = path.join(searchPath, apkFiles[0]);
        break;
      }
    }

    if (!sourceApk) {
      throw new Error('未找到生成的 APK 文件，请检查 EAS Build 输出');
    }

    const apkSize = (fs.statSync(sourceApk).size / 1024 / 1024).toFixed(2);

    // 生成 APK 文件名：appName_v1_0_0.apk
    const versionStr = version.replace(/\./g, '_');
    const apkFileName = `${appName}_v${versionStr}.apk`;

    let outputPath = output;
    if (!outputPath) {
      const buildDir = path.join(projectPath, 'build');
      if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
      }
      outputPath = path.join(buildDir, apkFileName);
    }

    // 如果源文件和目标文件不同，则复制
    if (sourceApk !== outputPath) {
      fs.copyFileSync(sourceApk, outputPath);
    }
    
    // 清理临时的 build 目录中的 APK（如果存在）
    if (sourceApk !== outputPath) {
      try {
        fs.unlinkSync(sourceApk);
        console.log(chalk.gray(`已清理临时文件: ${sourceApk}`));
      } catch (err) {
        // 忽略清理失败
      }
    }

    resultSpinner.succeed(chalk.green(`APK 构建完成 (${apkSize} MB)`));
    console.log(chalk.gray(`输出文件: ${outputPath}`));
    console.log(chalk.gray('═══════════════════════════════════════════════════════\n'));

    return outputPath;

  } catch (error) {
    console.log(chalk.red('✖ APK 构建失败'));
    if (error.stderr) {
      console.error(chalk.gray(error.stderr.toString()));
    }
    throw error;
  }
}

/**
 * 构建 React Native Android APK
 */
async function buildAndroidAPK({ projectPath, output, buildType, appName, version }) {
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

    spinner.stop();
    console.log(chalk.cyan('\n正在清理旧的构建文件...\n'));
    
    // 先执行 clean
    const cleanCommand = process.platform === 'win32'
      ? `cd "${androidDir}" && gradlew.bat clean`
      : `cd "${androidDir}" && ./gradlew clean`;
    
    execSync(cleanCommand, { stdio: 'inherit' });

    console.log(chalk.cyan('\n正在编译 APK（这可能需要几分钟）...\n'));

    const gradleCommand = buildType === 'release' ? 'assembleRelease' : 'assembleDebug';
    const command = process.platform === 'win32'
      ? `cd "${androidDir}" && gradlew.bat ${gradleCommand}`
      : `cd "${androidDir}" && ./gradlew ${gradleCommand}`;

    execSync(command, { stdio: 'inherit' });
    
    console.log(); // 换行

    const apkDir = path.join(androidDir, 'app', 'build', 'outputs', 'apk', buildType);
    const apkFiles = fs.readdirSync(apkDir).filter(f => f.endsWith('.apk'));
    
    if (apkFiles.length === 0) {
      throw new Error('未找到生成的 APK 文件');
    }

    const sourceApk = path.join(apkDir, apkFiles[0]);
    const apkSize = (fs.statSync(sourceApk).size / 1024 / 1024).toFixed(2);

    // 生成 APK 文件名：appName_v1_0_0.apk
    const versionStr = version.replace(/\./g, '_');
    const apkFileName = `${appName}_v${versionStr}.apk`;

    let outputPath = output;
    if (!outputPath) {
      const buildDir = path.join(projectPath, 'build');
      if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
      }
      outputPath = path.join(buildDir, apkFileName);
    }

    fs.copyFileSync(sourceApk, outputPath);

    console.log(chalk.green(`✔ APK 构建完成 (${apkSize} MB)`));
    console.log(chalk.gray(`输出文件: ${outputPath}`));
    console.log(chalk.gray('═══════════════════════════════════════════════════════\n'));

    return outputPath;

  } catch (error) {
    console.log(chalk.red('✖ APK 构建失败'));
    if (error.stderr) {
      console.error(chalk.gray(error.stderr.toString()));
    }
    throw error;
  }
}

/**
 * 构建 Expo iOS IPA (使用 EAS Build)
 */
async function buildExpoIPA({ projectPath, output, buildType, appName, version }) {
  const spinner = ora('🍎 构建 Expo iOS IPA (使用 EAS Build)...').start();

  try {
    // 检查是否在 macOS 上
    if (process.platform !== 'darwin') {
      throw new Error('IPA 构建仅支持在 macOS 上进行');
    }

    // 检查是否有 eas.json 配置文件
    const easConfigPath = path.join(projectPath, 'eas.json');
    if (!fs.existsSync(easConfigPath)) {
      throw new Error('找不到 eas.json 配置文件，请先运行 "eas build:configure"');
    }

    // 检查并执行 prebuild（确保 Config Plugins 生效）
    const iosDir = path.join(projectPath, 'ios');
    const pluginsDir = path.join(projectPath, 'plugins');
    
    // 如果存在 plugins 目录，执行 prebuild 以确保插件生效
    if (fs.existsSync(pluginsDir)) {
      spinner.stop();
      console.log(chalk.cyan('\n正在执行 expo prebuild（应用 Config Plugins）...\n'));
      const prebuildCommand = `cd "${projectPath}" && npx expo prebuild -p ios --no-install`;
      try {
        execSync(prebuildCommand, { stdio: 'inherit' });
        console.log(chalk.green('\n✔ expo prebuild 完成\n'));
      } catch (err) {
        // 如果 prebuild 失败，继续尝试构建（可能已经 prebuild 过了）
        console.log(chalk.yellow('\n⚠ expo prebuild 失败，继续尝试构建...\n'));
      }
      spinner.start('正在使用 EAS Build 构建 IPA...');
    }

    spinner.text = '正在使用 EAS Build 构建 IPA（这可能需要几分钟）...';

    // 使用 EAS Build 本地构建
    const profile = buildType === 'release' ? 'production' : 'development';
    const command = `cd "${projectPath}" && eas build -p ios --profile ${profile} --local --non-interactive`;

    spinner.stop();
    console.log(chalk.gray(`正在执行: eas build -p ios --profile ${profile} --local\n`));
    execSync(command, { stdio: 'inherit' });
    console.log();
    spinner.start('查找构建产物...');

    // EAS Build 通常会在项目根目录生成 IPA
    // 查找最新的 .ipa 文件
    const possiblePaths = [
      projectPath,
      path.join(projectPath, 'build'),
    ];

    let sourceIpa = null;
    for (const searchPath of possiblePaths) {
      if (!fs.existsSync(searchPath)) continue;
      
      const files = fs.readdirSync(searchPath);
      const ipaFiles = files.filter(f => f.endsWith('.ipa')).sort((a, b) => {
        const statA = fs.statSync(path.join(searchPath, a));
        const statB = fs.statSync(path.join(searchPath, b));
        return statB.mtimeMs - statA.mtimeMs; // 最新的在前
      });

      if (ipaFiles.length > 0) {
        sourceIpa = path.join(searchPath, ipaFiles[0]);
        break;
      }
    }

    if (!sourceIpa) {
      throw new Error('未找到生成的 IPA 文件，请检查 EAS Build 输出');
    }

    const ipaSize = (fs.statSync(sourceIpa).size / 1024 / 1024).toFixed(2);

    // 生成 IPA 文件名：appName_v1_0_0.ipa
    const versionStr = version.replace(/\./g, '_');
    const ipaFileName = `${appName}_v${versionStr}.ipa`;

    let outputPath = output;
    if (!outputPath) {
      const buildDir = path.join(projectPath, 'build');
      if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
      }
      outputPath = path.join(buildDir, ipaFileName);
    }

    // 如果源文件和目标文件不同，则复制
    if (sourceIpa !== outputPath) {
      fs.copyFileSync(sourceIpa, outputPath);
    }
    
    // 清理临时的 IPA 文件（如果存在）
    if (sourceIpa !== outputPath) {
      try {
        fs.unlinkSync(sourceIpa);
        console.log(chalk.gray(`已清理临时文件: ${sourceIpa}`));
      } catch (err) {
        // 忽略清理失败
      }
    }

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
 * 构建 React Native iOS IPA
 */
async function buildIOSIPA({ projectPath, output, buildType, appName, version }) {
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

    // 生成 IPA 文件名：appName_v1_0_0.ipa
    const versionStr = version.replace(/\./g, '_');
    const ipaFileName = `${appName}_v${versionStr}.ipa`;

    let outputPath = output;
    if (!outputPath) {
      const buildDir = path.join(projectPath, 'build');
      if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
      }
      outputPath = path.join(buildDir, ipaFileName);
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
    // 检测项目类型并更新版本号
    const projectType = detectProjectType(projectPath);
    const version = getAppVersion(projectPath);
    const versionCode = versionToVersionCode(version);
    
    // 从 package.json 获取 appName
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const appName = packageJson.name || 'app';
    
    console.log(`项目类型: ${chalk.green(projectType)}`);
    console.log(`项目路径: ${chalk.green(projectPath)}`);
    console.log(`应用名称: ${chalk.green(appName)}`);
    console.log(`当前版本: ${chalk.green(version)} (versionCode: ${versionCode})`);
    console.log(chalk.gray('正在更新版本号...'));
    
    // 更新应用版本号和构建号（同步操作，不使用 spinner 避免阻塞）
    const updateResult = updateAppVersion(projectPath, version, projectType);
    
    if (updateResult.success) {
      console.log(chalk.green(`✔ 版本号已更新: ${version} (versionCode: ${versionCode})`));
      if (updateResult.updated.length > 0) {
        console.log(chalk.gray(`  已更新: ${updateResult.updated.join(', ')}`));
      }
    } else {
      console.log(chalk.yellow(`⚠ 未能更新版本号配置文件`));
    }
    
    console.log(chalk.gray('\n═══════════════════════════════════════════════════════\n'));

    if (type === 'apk') {
      // 构建 APK
      const buildType = debug ? 'debug' : 'release';
      console.log(`构建类型: ${chalk.green(buildType.toUpperCase())}`);
      console.log(chalk.gray('\n═══════════════════════════════════════════════════════\n'));
      
      let apkPath;
      if (projectType === 'expo') {
        apkPath = await buildExpoAPK({ projectPath, output, buildType, appName, version });
      } else {
        apkPath = await buildAndroidAPK({ projectPath, output, buildType, appName, version });
      }
      return apkPath;
    } else if (type === 'ipa') {
      // 构建 IPA
      const buildType = debug ? 'debug' : 'release';
      console.log(`构建类型: ${chalk.green(buildType.toUpperCase())}`);
      console.log(chalk.gray('\n═══════════════════════════════════════════════════════\n'));
      
      let ipaPath;
      if (projectType === 'expo') {
        ipaPath = await buildExpoIPA({ projectPath, output, buildType, appName, version });
      } else {
        ipaPath = await buildIOSIPA({ projectPath, output, buildType, appName, version });
      }
      return ipaPath;
    } else {
      // 构建 Bundle
      console.log(`平台: ${chalk.green(platform.toUpperCase())}`);
      console.log(`入口文件: ${chalk.green(entry)}`);

      const outputDir = output ? path.resolve(process.cwd(), output) : path.join(projectPath, 'build');
      console.log(`输出目录: ${chalk.green(outputDir)}`);
      console.log(chalk.gray('\n═══════════════════════════════════════════════════════\n'));

      const buildOptions = {
        projectPath,
        platform,
        outputDir,
        entryFile: entry,
        appName,
        version
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

