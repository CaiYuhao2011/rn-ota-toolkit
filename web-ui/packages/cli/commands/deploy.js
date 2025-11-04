const chalk = require('chalk');
const path = require('path');
const buildCommand = require('./build');
const uploadCommand = require('./upload');
const { getAppName, getAppVersion, incrementVersion, updatePackageVersion } = require('../utils/project');

async function deployCommand(options) {
  let { project, app, version, server, description, type = 'bundle', platform = 'all', debug = false, minAppVersion } = options;

  const projectPath = path.resolve(process.cwd(), project);

  // 如果没有指定 app，从 package.json 读取
  if (!app) {
    app = getAppName(projectPath);
    if (!app) {
      console.error(chalk.red('\n❌ 无法从 package.json 读取应用名称，请使用 -a 参数指定\n'));
      process.exit(1);
    }
    console.log(chalk.gray(`📝 从 package.json 读取应用名称: ${app}`));
  }

  // 如果没有指定 version，从 package.json 读取并自动 +1
  let isAutoVersion = false;
  if (!version) {
    const currentVersion = getAppVersion(projectPath);
    version = incrementVersion(currentVersion);
    isAutoVersion = true;
    console.log(chalk.gray(`📝 当前版本: ${currentVersion}, 自动升级到: ${version}`));
  }

  // 根据 type 和 platform 确定构建和部署策略
  const platforms = platform === 'all' ? ['android', 'ios'] : [platform];
  
  for (const targetPlatform of platforms) {
    let buildType = type;
    if (type !== 'bundle') {
      // 如果指定了 apk 或 ipa，根据平台调整
      if (targetPlatform === 'android') {
        buildType = type === 'ipa' ? 'apk' : type; // 强制 Android 用 apk
      } else {
        buildType = type === 'apk' ? 'ipa' : type; // 强制 iOS 用 ipa
      }
    }

    const updateType = buildType === 'bundle' ? 'incremental' : 'full';
    const platformName = targetPlatform === 'ios' ? 'iOS' : 'Android';
    const platformEmoji = targetPlatform === 'ios' ? '🍎' : '🤖';

    console.log(chalk.cyan(`\n${platformEmoji} 开始部署 ${platformName} ${updateType === 'full' ? `${buildType.toUpperCase()}（强制更新）` : 'Bundle（热更新）'}\n`));
    console.log(chalk.gray('═══════════════════════════════════════════════════════\n'));
    console.log(`项目: ${chalk.green(project)}`);
    console.log(`应用: ${chalk.green(app)}`);
    console.log(`版本: ${chalk.green(version)}`);
    console.log(`平台: ${chalk.green(platformName)}`);
    console.log(`更新类型: ${chalk.yellow(updateType)}`);
    console.log(`服务器: ${chalk.blue(server)}`);
    if (description) {
      console.log(`描述: ${chalk.gray(description)}`);
    }
    console.log(chalk.gray('\n═══════════════════════════════════════════════════════\n'));

    try {
      // 1. 构建文件
      const filePath = await buildCommand({ 
        project, 
        type: buildType, 
        platform: targetPlatform,
        debug 
      });

      // 2. 上传文件并发布版本（使用 upload 命令，自动处理 assets 打包）
      await uploadCommand({
        file: filePath,
        app,
        platform: targetPlatform,
        version,
        server,
        description,
        minAppVersion,
        updateType
      });

      console.log(chalk.green.bold(`\n✅ ${platformName} 部署完成！\n`));
      console.log(chalk.gray('版本信息：'));
      console.log(`  应用: ${app}`);
      console.log(`  版本: ${version}`);
      console.log(`  类型: ${updateType}`);
      console.log(`  平台: ${targetPlatform}`);
      if (description) {
        console.log(`  描述: ${description}`);
      }
      console.log();

    } catch (error) {
      console.error(chalk.red(`\n❌ ${platformName} 部署失败: ${error.message}\n`));
      if (error.response) {
        console.error(chalk.gray(`服务器响应: ${JSON.stringify(error.response.data)}`));
      }
      // 如果是 all 平台部署，继续下一个平台
      if (platform === 'all' && platforms.length > 1) {
        console.log(chalk.yellow(`继续部署其他平台...\n`));
        continue;
      } else {
        process.exit(1);
      }
    }
  }

  // 所有平台部署完成后，更新 package.json 版本号
  const updated = updatePackageVersion(projectPath, version);
  if (updated) {
    console.log(chalk.gray(`✍️  已更新 package.json 版本号: ${version}${isAutoVersion ? ' (自动)' : ''}`));
  }
}

module.exports = deployCommand;

