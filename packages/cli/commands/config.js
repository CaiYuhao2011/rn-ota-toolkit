const chalk = require('chalk');
const { getConfig, setConfig, deleteConfig, getAllConfig, getConfigPath } = require('../utils/config');

async function configCommand(options) {
  const { action, key, value } = options;

  switch (action) {
    case 'set':
      if (!key || !value) {
        console.error(chalk.red('\n❌ 请指定 key 和 value\n'));
        console.log(chalk.gray('示例: rn-ota config set server http://192.168.1.100:8080\n'));
        process.exit(1);
      }
      if (setConfig(key, value)) {
        console.log(chalk.green(`\n✅ 设置成功: ${key} = ${value}\n`));
      } else {
        console.error(chalk.red('\n❌ 设置失败\n'));
        process.exit(1);
      }
      break;

    case 'get':
      if (!key) {
        console.error(chalk.red('\n❌ 请指定 key\n'));
        console.log(chalk.gray('示例: rn-ota config get server\n'));
        process.exit(1);
      }
      const val = getConfig(key);
      if (val !== undefined) {
        console.log(chalk.cyan(`\n${key} = ${chalk.green(val)}\n`));
      } else {
        console.log(chalk.yellow(`\n⚠️  ${key} 未设置\n`));
      }
      break;

    case 'delete':
      if (!key) {
        console.error(chalk.red('\n❌ 请指定 key\n'));
        console.log(chalk.gray('示例: rn-ota config delete server\n'));
        process.exit(1);
      }
      if (deleteConfig(key)) {
        console.log(chalk.green(`\n✅ 删除成功: ${key}\n`));
      } else {
        console.error(chalk.red('\n❌ 删除失败\n'));
        process.exit(1);
      }
      break;

    case 'list':
      const config = getAllConfig();
      if (Object.keys(config).length === 0) {
        console.log(chalk.yellow('\n⚠️  暂无配置\n'));
      } else {
        console.log(chalk.cyan('\n📋 当前配置:\n'));
        console.log(chalk.gray('═══════════════════════════════════════════════════════\n'));
        for (const [k, v] of Object.entries(config)) {
          console.log(`  ${chalk.cyan(k)}: ${chalk.green(v)}`);
        }
        console.log(chalk.gray(`\n═══════════════════════════════════════════════════════`));
        console.log(chalk.gray(`配置文件: ${getConfigPath()}\n`));
      }
      break;

    default:
      console.error(chalk.red(`\n❌ 未知操作: ${action}\n`));
      console.log(chalk.gray('可用操作: set, get, delete, list\n'));
      process.exit(1);
  }
}

module.exports = configCommand;

