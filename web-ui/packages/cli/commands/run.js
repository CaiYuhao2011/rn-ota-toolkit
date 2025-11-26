const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
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
 * 运行 Expo Android
 */
async function runExpoAndroid(options) {
  const { projectPath, variant, device } = options;

  const spinner = ora('准备运行 Expo Android 应用...').start();

  try {
    // 构建命令
    const args = ['npx', 'expo', 'run:android'];
    
    if (variant === 'release') {
      args.push('--variant', 'release');
    }
    
    if (device) {
      args.push('--device', device);
    }

    const command = args.join(' ');

    spinner.stop();
    console.log(chalk.cyan('\n正在运行 Expo Android 应用...\n'));
    console.log(chalk.gray(`命令: ${command}\n`));

    // 执行命令
    execSync(command, {
      cwd: projectPath,
      stdio: 'inherit'
    });

    console.log(chalk.green('\n✔ 应用已成功启动\n'));

  } catch (error) {
    spinner.fail(chalk.red('运行失败'));
    throw error;
  }
}

/**
 * 运行 Expo iOS
 */
async function runExpoIOS(options) {
  const { projectPath, device, configuration } = options;

  const spinner = ora('准备运行 Expo iOS 应用...').start();

  try {
    // 检查是否在 macOS 上
    if (process.platform !== 'darwin') {
      throw new Error('iOS 应用只能在 macOS 上运行');
    }

    // 构建命令
    const args = ['npx', 'expo', 'run:ios'];
    
    if (configuration) {
      args.push('--configuration', configuration);
    }
    
    if (device) {
      args.push('--device', device);
    }

    const command = args.join(' ');

    spinner.stop();
    console.log(chalk.cyan('\n正在运行 Expo iOS 应用...\n'));
    console.log(chalk.gray(`命令: ${command}\n`));

    // 执行命令
    execSync(command, {
      cwd: projectPath,
      stdio: 'inherit'
    });

    console.log(chalk.green('\n✔ 应用已成功启动\n'));

  } catch (error) {
    spinner.fail(chalk.red('运行失败'));
    throw error;
  }
}

/**
 * 运行 React Native Android
 */
async function runReactNativeAndroid(options) {
  const { projectPath, variant, device } = options;

  const spinner = ora('准备运行 React Native Android 应用...').start();

  try {
    // 构建命令
    const args = ['npx', 'react-native', 'run-android'];
    
    if (variant === 'release') {
      args.push('--variant', 'release');
    }
    
    if (device) {
      args.push('--deviceId', device);
    }

    const command = args.join(' ');

    spinner.stop();
    console.log(chalk.cyan('\n正在运行 React Native Android 应用...\n'));
    console.log(chalk.gray(`命令: ${command}\n`));

    // 执行命令
    execSync(command, {
      cwd: projectPath,
      stdio: 'inherit'
    });

    console.log(chalk.green('\n✔ 应用已成功启动\n'));

  } catch (error) {
    spinner.fail(chalk.red('运行失败'));
    throw error;
  }
}

/**
 * 运行 React Native iOS
 */
async function runReactNativeIOS(options) {
  const { projectPath, device, configuration } = options;

  const spinner = ora('准备运行 React Native iOS 应用...').start();

  try {
    // 检查是否在 macOS 上
    if (process.platform !== 'darwin') {
      throw new Error('iOS 应用只能在 macOS 上运行');
    }

    // 构建命令
    const args = ['npx', 'react-native', 'run-ios'];
    
    if (configuration) {
      args.push('--configuration', configuration);
    }
    
    if (device) {
      args.push('--device', device);
    }

    const command = args.join(' ');

    spinner.stop();
    console.log(chalk.cyan('\n正在运行 React Native iOS 应用...\n'));
    console.log(chalk.gray(`命令: ${command}\n`));

    // 执行命令
    execSync(command, {
      cwd: projectPath,
      stdio: 'inherit'
    });

    console.log(chalk.green('\n✔ 应用已成功启动\n'));

  } catch (error) {
    spinner.fail(chalk.red('运行失败'));
    throw error;
  }
}

/**
 * 运行命令主函数
 */
async function runCommand(options) {
  const {
    project,
    platform = 'android',
    variant,
    device,
    configuration
  } = options;

  // 验证项目路径
  const projectPath = path.resolve(process.cwd(), project);
  if (!fs.existsSync(projectPath)) {
    console.error(chalk.red(`\n❌ 项目目录不存在: ${projectPath}\n`));
    process.exit(1);
  }

  const platformName = platform === 'ios' ? 'iOS' : 'Android';
  const platformEmoji = platform === 'ios' ? '🍎' : '🤖';

  console.log(chalk.cyan(`\n${platformEmoji} 准备运行 ${platformName} 应用\n`));
  console.log(chalk.gray('═══════════════════════════════════════════════════════\n'));

  try {
    // 检测项目类型
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
    console.log(`平台: ${chalk.green(platformName)}`);
    
    if (platform === 'android' && variant) {
      console.log(`构建变体: ${chalk.green(variant.toUpperCase())}`);
    }
    
    if (platform === 'ios' && configuration) {
      console.log(`配置: ${chalk.green(configuration)}`);
    }
    
    if (device) {
      console.log(`设备: ${chalk.green(device)}`);
    }
    
    console.log(chalk.gray('\n正在更新版本号...'));
    
    // 更新应用版本号和构建号
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

    // 根据项目类型和平台运行应用
    if (platform === 'android') {
      if (projectType === 'expo') {
        await runExpoAndroid({ projectPath, variant, device });
      } else {
        await runReactNativeAndroid({ projectPath, variant, device });
      }
    } else {
      if (projectType === 'expo') {
        await runExpoIOS({ projectPath, device, configuration });
      } else {
        await runReactNativeIOS({ projectPath, device, configuration });
      }
    }

  } catch (error) {
    console.error(chalk.red(`\n❌ 运行失败: ${error.message}\n`));
    if (error.stderr) {
      console.error(chalk.gray(error.stderr.toString()));
    }
    process.exit(1);
  }
}

module.exports = runCommand;
