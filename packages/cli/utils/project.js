const fs = require('fs');
const path = require('path');

/**
 * 从项目的 package.json 读取应用名称
 */
function getAppName(projectPath) {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return packageJson.name || null;
    }
  } catch (error) {
    return null;
  }
  return null;
}

/**
 * 从项目的 package.json 读取版本号
 */
function getAppVersion(projectPath) {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return packageJson.version || '1.0.0';
    }
  } catch (error) {
    return '1.0.0';
  }
  return '1.0.0';
}

/**
 * 版本号 +1（最后一位加 1）
 * 例如：1.0.0 -> 1.0.1, 1.2.9 -> 1.2.10
 */
function incrementVersion(version) {
  const parts = version.split('.');
  const lastIndex = parts.length - 1;
  parts[lastIndex] = String(parseInt(parts[lastIndex] || '0', 10) + 1);
  return parts.join('.');
}

/**
 * 更新项目 package.json 中的版本号
 */
function updatePackageVersion(projectPath, newVersion) {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const content = fs.readFileSync(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(content);
      packageJson.version = newVersion;
      
      // 保持原有格式（缩进）
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
      return true;
    }
  } catch (error) {
    console.error('更新 package.json 失败:', error);
    return false;
  }
  return false;
}

module.exports = {
  getAppName,
  getAppVersion,
  incrementVersion,
  updatePackageVersion
};

