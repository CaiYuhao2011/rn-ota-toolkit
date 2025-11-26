const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');

/**
 * 递归复制目录
 */
function copyDirectory(src, dest, replacements) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // 跳过 node_modules 和其他不需要的目录
      if (entry.name === 'node_modules' || entry.name === '.DS_Store') {
        continue;
      }
      copyDirectory(srcPath, destPath, replacements);
    } else {
      // 复制文件
      let content = fs.readFileSync(srcPath, 'utf8');
      
      // 替换占位符
      if (replacements) {
        Object.keys(replacements).forEach(key => {
          const regex = new RegExp(`\\{${key}\\}`, 'g');
          content = content.replace(regex, replacements[key]);
        });
      }
      
      fs.writeFileSync(destPath, content, 'utf8');
    }
  }
}

/**
 * 验证应用名称（只允许小写字母、数字和连字符）
 */
function validateAppName(name) {
  const regex = /^[a-z0-9-]+$/;
  if (!regex.test(name)) {
    return '应用名称只能包含小写字母、数字和连字符';
  }
  return true;
}

/**
 * Init 命令主函数
 */
async function initCommand(projectName, options) {
  console.log(chalk.cyan('\n🚀 创建新的 React Native OTA 项目\n'));
  console.log(chalk.gray('═══════════════════════════════════════════════════════\n'));

  try {
    // 如果没有提供项目名称，提示用户输入
    if (!projectName) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: '请输入项目文件夹名称:',
          validate: (input) => {
            if (!input) return '项目名称不能为空';
            if (fs.existsSync(path.join(process.cwd(), input))) {
              return '该目录已存在，请选择其他名称';
            }
            return validateAppName(input);
          }
        }
      ]);
      projectName = answers.projectName;
    }

    // 验证项目名称
    const projectPath = path.join(process.cwd(), projectName);
    if (fs.existsSync(projectPath)) {
      console.error(chalk.red(`\n❌ 目录已存在: ${projectPath}\n`));
      process.exit(1);
    }

    // 获取应用配置
    const config = await inquirer.prompt([
      {
        type: 'input',
        name: 'appName',
        message: '请输入应用名称（英文，全小写字母）:',
        default: projectName,
        validate: validateAppName
      },
      {
        type: 'input',
        name: 'slug',
        message: '请输入应用显示名称（中文）:',
        validate: (input) => {
          if (!input) return '应用显示名称不能为空';
          return true;
        }
      }
    ]);

    const { appName, slug } = config;

    console.log(chalk.gray('\n═══════════════════════════════════════════════════════\n'));
    console.log(`项目名称: ${chalk.green(projectName)}`);
    console.log(`应用名称: ${chalk.green(appName)}`);
    console.log(`显示名称: ${chalk.green(slug)}`);
    console.log(chalk.gray('\n═══════════════════════════════════════════════════════\n'));

    // 创建项目目录
    const spinner = ora('正在创建项目目录...').start();
    fs.mkdirSync(projectPath, { recursive: true });
    spinner.succeed(chalk.green('项目目录创建成功'));

    // 复制模板文件
    const copySpinner = ora('正在复制模板文件...').start();
    const templatePath = path.join(__dirname, '../tpl/expo');
    
    if (!fs.existsSync(templatePath)) {
      copySpinner.fail(chalk.red('模板目录不存在'));
      console.error(chalk.red(`\n❌ 找不到模板目录: ${templatePath}\n`));
      process.exit(1);
    }

    // 准备替换的占位符
    const replacements = {
      name: slug,      // app.json 中的 name 使用中文显示名称
      slug: appName    // app.json 和 package.json 中的 slug/name 使用英文名称
    };

    copyDirectory(templatePath, projectPath, replacements);
    copySpinner.succeed(chalk.green('模板文件复制成功'));

    // 完成
    console.log(chalk.green.bold('\n✅ 项目创建完成！\n'));
    console.log(chalk.cyan('下一步操作：\n'));
    console.log(chalk.gray(`  cd ${projectName}`));
    console.log(chalk.gray('  npm install'));
    console.log(chalk.gray('  npm start\n'));
    console.log(chalk.yellow('提示：'));
    console.log(chalk.gray('  - 请根据需要修改 app.json 中的配置'));
    console.log(chalk.gray('  - 请配置 OTA 服务器地址'));
    console.log(chalk.gray('  - 运行 rn-ota config set server <url> 设置服务器地址\n'));

  } catch (error) {
    console.error(chalk.red(`\n❌ 创建项目失败: ${error.message}\n`));
    process.exit(1);
  }
}

module.exports = initCommand;
