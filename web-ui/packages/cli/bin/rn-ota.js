#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const packageJson = require('../package.json');

const uploadCommand = require('../commands/upload');
const listCommand = require('../commands/list');
const deleteCommand = require('../commands/delete');
const deployCommand = require('../commands/deploy');
const buildCommand = require('../commands/build');
const configCommand = require('../commands/config');
const runCommand = require('../commands/run');
const initCommand = require('../commands/init');
const { getConfig } = require('../utils/config');

const program = new Command();

program
  .name('rn-ota')
  .description('React Native OTA 命令行工具')
  .version(packageJson.version);

// 初始化项目命令
program
  .command('init [project-name]')
  .description('创建新的 React Native OTA 项目')
  .action(initCommand);

// 配置命令
program
  .command('config <action> [key] [value]')
  .description('管理配置（set/get/delete/list）')
  .action((action, key, value) => {
    configCommand({ action, key, value });
  });

// 上传命令
program
  .command('upload')
  .description('上传 Bundle 到 OTA 服务器')
  .requiredOption('-f, --file <path>', 'Bundle 文件路径')
  .requiredOption('-a, --app <name>', '应用名称')
  .requiredOption('-v, --version <version>', '版本号')
  .requiredOption('-p, --platform <platform>', '平台：android 或 ios')
  .option('-s, --server <url>', '服务器地址', getConfig('server') || 'http://localhost:10080')
  .option('-d, --description <text>', '版本描述', '')
  .option('-m, --min-app-version <version>', '最小应用版本', '0.0.0')
  .action(uploadCommand);

// 列出版本命令
program
  .command('list')
  .description('列出所有已发布的版本')
  .option('-s, --server <url>', '服务器地址', getConfig('server') || 'http://localhost:10080')
  .action(listCommand);

// 删除版本命令
program
  .command('delete')
  .description('删除指定版本')
  .requiredOption('-a, --app <name>', '应用名称')
  .requiredOption('-v, --version <version>', '版本号')
  .requiredOption('-p, --platform <platform>', '平台：android 或 ios')
  .option('-s, --server <url>', '服务器地址', getConfig('server') || 'http://localhost:10080')
  .action(deleteCommand);

// 构建命令（Bundle 或 原生包）
program
  .command('build')
  .description('构建 Bundle 或原生安装包')
  .option('-p, --project <path>', 'React Native/Expo 项目路径', '.')
  .option('-t, --type <type>', '构建类型：bundle、apk 或 ipa', 'bundle')
  .option('--platform <platform>', '平台：android 或 ios（仅 type=bundle 时需要）', 'android')
  .option('-o, --output <path>', '输出路径')
  .option('-e, --entry <file>', 'Bundle 入口文件', 'index.js')
  .option('--debug', 'Debug 版本（仅原生包）', false)
  .action(buildCommand);

// 部署命令（构建并发布版本）
program
  .command('deploy')
  .description('构建并发布到 OTA 服务器')
  .option('-v, --version <version>', '版本号（默认从 package.json 读取并自动 +1）')
  .option('-a, --app <name>', '应用名称（默认从 package.json 读取）')
  .option('-p, --project <path>', 'React Native 项目路径', '.')
  .option('--platform <platform>', '平台：android、ios 或 all', 'all')
  .option('-t, --type <type>', '部署类型：bundle（热更新）、apk 或 ipa（强制更新）', 'bundle')
  .option('-s, --server <url>', '服务器地址', getConfig('server') || 'http://localhost:10080')
  .option('-d, --description <text>', '版本描述', '')
  .option('-m, --min-app-version <version>', '最低应用版本要求', '')
  .option('--debug', 'Debug 版本（仅原生包）', false)
  .action(deployCommand);

// 运行命令（运行应用到设备/模拟器）
program
  .command('run')
  .description('运行应用到设备或模拟器（自动更新版本号）')
  .option('-p, --project <path>', 'React Native/Expo 项目路径', '.')
  .option('--platform <platform>', '平台：android 或 ios', 'android')
  .option('--variant <variant>', 'Android 构建变体：debug 或 release', 'debug')
  .option('--configuration <config>', 'iOS 配置：Debug 或 Release')
  .option('--device <device>', '指定设备 ID 或名称')
  .action(runCommand);

// 错误处理
program.on('command:*', function () {
  console.error(chalk.red(`\n❌ 无效的命令: ${program.args.join(' ')}\n`));
  program.outputHelp();
  process.exit(1);
});

// 如果没有参数，显示帮助
if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit(0);
}

program.parse(process.argv);

