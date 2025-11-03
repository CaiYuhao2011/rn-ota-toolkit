const axios = require('axios');
const chalk = require('chalk');
const ora = require('ora');

async function listCommand(options) {
  const { server } = options;

  const spinner = ora('正在获取版本列表...').start();

  try {
    const response = await axios.get(`${server}/ota/versions`);

    spinner.succeed('获取成功');

    if (response.data.code === 200) {
      const versions = response.data.rows || [];

      if (versions.length === 0) {
        console.log(chalk.yellow('\n📭 暂无版本信息\n'));
        return;
      }

      console.log(chalk.cyan('\n📦 已发布的版本:\n'));
      console.log(chalk.gray('═══════════════════════════════════════════════════════\n'));

      // 按应用和平台分组
      const grouped = {};
      versions.forEach(v => {
        const key = `${v.appName}_${v.platform}`;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(v);
      });

      for (const [key, versionList] of Object.entries(grouped)) {
        const [appName, platform] = key.split('_');

        console.log(chalk.bold(`📱 ${appName} (${platform.toUpperCase()})`));
        console.log(chalk.gray('─────────────────────────────────────────────────────'));

        versionList.forEach((v, index) => {
          console.log(`  ${chalk.green(index + 1)}. 版本 ${chalk.bold(v.version)}`);
          if (v.updateType) {
            console.log(`     类型: ${chalk.yellow(v.updateType === 'full' ? '强制更新' : '热更新')}`);
          }
          if (v.description) {
            console.log(`     描述: ${chalk.cyan(v.description)}`);
          }
          if (v.minAppVersion) {
            console.log(`     最低版本: ${chalk.magenta(v.minAppVersion)}`);
          }
          if (v.createTime) {
            console.log(`     创建时间: ${chalk.gray(v.createTime)}`);
          }
          console.log();
        });

        console.log();
      }

    } else {
      throw new Error(response.data.msg || '获取失败');
    }

  } catch (error) {
    spinner.fail(chalk.red('获取失败'));
    console.error(chalk.red(`\n❌ 错误: ${error.message}\n`));
    if (error.response) {
      console.error(chalk.gray('服务器响应:'), error.response.data);
    }
    process.exit(1);
  }
}

module.exports = listCommand;

