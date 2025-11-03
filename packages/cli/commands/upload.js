const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const chalk = require('chalk');
const ora = require('ora');

async function uploadCommand(options) {
  const { file, app, platform, version, server, description, minAppVersion, updateType } = options;

  // 验证文件
  const filePath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    console.error(chalk.red(`\n❌ 文件不存在: ${filePath}\n`));
    process.exit(1);
  }

  // 验证平台
  if (!['ios', 'android'].includes(platform.toLowerCase())) {
    console.error(chalk.red('\n❌ 平台必须是 ios 或 android\n'));
    process.exit(1);
  }

  // 显示信息
  console.log(chalk.cyan('\n📦 准备上传 Bundle...\n'));
  console.log(chalk.gray('─────────────────────────────────'));
  console.log(`应用名称: ${chalk.green(app)}`);
  console.log(`平台: ${chalk.green(platform)}`);
  console.log(`版本号: ${chalk.green(version)}`);
  console.log(`文件: ${chalk.gray(filePath)}`);
  console.log(`文件大小: ${chalk.yellow((fs.statSync(filePath).size / 1024 / 1024).toFixed(2) + ' MB')}`);
  console.log(`服务器: ${chalk.blue(server)}`);
  if (description) {
    console.log(`描述: ${chalk.gray(description)}`);
  }
  console.log(chalk.gray('─────────────────────────────────\n'));

  // 创建表单数据
  const form = new FormData();
  form.append('bundle', fs.createReadStream(filePath));
  form.append('appName', app);
  form.append('platform', platform.toLowerCase());
  form.append('version', version);
  form.append('description', description || '');
  form.append('minAppVersion', minAppVersion || '0.0.0');
  form.append('updateType', updateType || 'incremental');

  // 上传
  const spinner = ora('正在上传...').start();

  try {
    const response = await axios.post(
      `${server}/ota/upload`,
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          spinner.text = `正在上传... ${percentCompleted}%`;
        }
      }
    );

    spinner.succeed(chalk.green('上传成功！'));

    if (response.data.code === 200) {
      console.log(chalk.cyan('\n✨ 版本信息:\n'));
      console.log(chalk.gray(JSON.stringify(response.data.data, null, 2)));
      console.log();
    } else {
      throw new Error(response.data.msg || '上传失败');
    }

  } catch (error) {
    spinner.fail(chalk.red('上传失败'));
    console.error(chalk.red(`\n❌ 错误: ${error.message}\n`));
    if (error.response) {
      console.error(chalk.gray('服务器响应:'), error.response.data);
    }
    process.exit(1);
  }
}

module.exports = uploadCommand;

