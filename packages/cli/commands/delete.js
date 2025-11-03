const axios = require('axios');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');

async function deleteCommand(options) {
  const { app, platform, version, server } = options;

  console.log(chalk.yellow('\n🗑️  准备删除版本...\n'));
  console.log(chalk.gray('─────────────────────────────────'));
  console.log(`应用名称: ${chalk.green(app)}`);
  console.log(`平台: ${chalk.green(platform)}`);
  console.log(`版本号: ${chalk.green(version)}`);
  console.log(`服务器: ${chalk.blue(server)}`);
  console.log(chalk.gray('─────────────────────────────────\n'));

  // 确认删除
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: '⚠️  确定要删除这个版本吗？',
      default: false
    }
  ]);

  if (!answers.confirmed) {
    console.log(chalk.gray('\n已取消删除\n'));
    return;
  }

  const spinner = ora('正在删除...').start();

  try {
    const response = await axios.delete(
      `${server}/ota/upload/${app}/${platform}/${version}`
    );

    if (response.data.code === 200) {
      spinner.succeed(chalk.green('删除成功！'));
      console.log();
    } else {
      spinner.fail(chalk.red('删除失败'));
      throw new Error(response.data.msg || '删除失败');
    }

  } catch (error) {
    spinner.fail(chalk.red('删除失败'));
    console.error(chalk.red(`\n❌ 错误: ${error.message}\n`));
    if (error.response) {
      console.error(chalk.gray('服务器响应:'), error.response.data);
    }
    process.exit(1);
  }
}

module.exports = deleteCommand;

