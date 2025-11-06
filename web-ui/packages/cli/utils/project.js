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

/**
 * 将版本号转换为 versionCode
 * 例如：1.2.3 -> 10203, 1.0.0 -> 10000
 */
function versionToVersionCode(version) {
  const parts = version.split('.').map(p => parseInt(p || '0', 10));
  while (parts.length < 3) {
    parts.push(0);
  }
  // 限制每个部分的最大值为 99
  const major = Math.min(parts[0], 99);
  const minor = Math.min(parts[1], 99);
  const patch = Math.min(parts[2], 99);
  return major * 10000 + minor * 100 + patch;
}

/**
 * 更新 Expo 项目的 app.json 配置
 */
function updateExpoAppConfig(projectPath, version) {
  try {
    const appJsonPath = path.join(projectPath, 'app.json');
    
    if (!fs.existsSync(appJsonPath)) {
      return false;
    }

    const content = fs.readFileSync(appJsonPath, 'utf8');
    const appConfig = JSON.parse(content);
    const versionCode = versionToVersionCode(version);

    // 更新版本号
    if (appConfig.expo) {
      appConfig.expo.version = version;
      
      // 更新 Android versionCode
      if (!appConfig.expo.android) {
        appConfig.expo.android = {};
      }
      appConfig.expo.android.versionCode = versionCode;
      
      // 更新 iOS buildNumber
      if (!appConfig.expo.ios) {
        appConfig.expo.ios = {};
      }
      appConfig.expo.ios.buildNumber = String(versionCode);
    }

    // 保持原有格式（缩进）
    fs.writeFileSync(appJsonPath, JSON.stringify(appConfig, null, 2) + '\n', 'utf8');
    return true;

  } catch (error) {
    console.error('更新 app.json 失败:', error.message);
    return false;
  }
}

/**
 * 更新 React Native Android build.gradle 版本号
 */
function updateAndroidVersion(projectPath, version) {
  try {
    const buildGradlePath = path.join(projectPath, 'android', 'app', 'build.gradle');
    
    if (!fs.existsSync(buildGradlePath)) {
      return false;
    }

    let content = fs.readFileSync(buildGradlePath, 'utf8');
    const versionCode = versionToVersionCode(version);

    // 更新 versionCode
    content = content.replace(
      /versionCode\s+\d+/,
      `versionCode ${versionCode}`
    );

    // 更新 versionName
    content = content.replace(
      /versionName\s+"[^"]*"/,
      `versionName "${version}"`
    );

    fs.writeFileSync(buildGradlePath, content, 'utf8');
    return true;

  } catch (error) {
    console.error('更新 Android build.gradle 失败:', error.message);
    return false;
  }
}

/**
 * 更新 React Native iOS 版本号
 * 支持两种方式：
 * 1. 直接更新 Info.plist（旧版）
 * 2. 更新 project.pbxproj 中的 MARKETING_VERSION 和 CURRENT_PROJECT_VERSION（新版）
 */
function updateIOSVersion(projectPath, version) {
  try {
    const iosDir = path.join(projectPath, 'ios');
    
    if (!fs.existsSync(iosDir)) {
      return false;
    }

    const versionCode = versionToVersionCode(version);
    let updated = false;

    // 方式 1: 尝试更新 project.pbxproj（新版 React Native）
    const items = fs.readdirSync(iosDir);
    const xcodeProject = items.find(item => item.endsWith('.xcodeproj'));
    
    if (xcodeProject) {
      const pbxprojPath = path.join(iosDir, xcodeProject, 'project.pbxproj');
      
      if (fs.existsSync(pbxprojPath)) {
        let content = fs.readFileSync(pbxprojPath, 'utf8');
        
        // 更新 MARKETING_VERSION（显示版本号）
        const marketingVersionRegex = /MARKETING_VERSION = [^;]+;/g;
        if (content.match(marketingVersionRegex)) {
          content = content.replace(
            marketingVersionRegex,
            `MARKETING_VERSION = ${version};`
          );
          updated = true;
        }
        
        // 更新 CURRENT_PROJECT_VERSION（构建号）
        const projectVersionRegex = /CURRENT_PROJECT_VERSION = [^;]+;/g;
        if (content.match(projectVersionRegex)) {
          content = content.replace(
            projectVersionRegex,
            `CURRENT_PROJECT_VERSION = ${versionCode};`
          );
          updated = true;
        }
        
        if (updated) {
          fs.writeFileSync(pbxprojPath, content, 'utf8');
          return true;
        }
      }
    }

    // 方式 2: 尝试更新 Info.plist（旧版 React Native）
    let infoPlistPath = null;
    
    for (const item of items) {
      const itemPath = path.join(iosDir, item);
      if (fs.statSync(itemPath).isDirectory() && !item.endsWith('.xcodeproj') && !item.endsWith('.xcworkspace')) {
        const possiblePath = path.join(itemPath, 'Info.plist');
        if (fs.existsSync(possiblePath)) {
          infoPlistPath = possiblePath;
          break;
        }
      }
    }

    if (!infoPlistPath) {
      return false;
    }

    let content = fs.readFileSync(infoPlistPath, 'utf8');
    
    // 检查是否使用了 Xcode 变量
    if (content.includes('$(MARKETING_VERSION)') || content.includes('$(CURRENT_PROJECT_VERSION)')) {
      // 如果使用了变量但没有找到 pbxproj，返回 false
      return false;
    }

    // 更新 CFBundleShortVersionString (显示版本号)
    const shortVersionUpdated = content.match(/(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]*(<\/string>)/);
    if (shortVersionUpdated) {
      content = content.replace(
        /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]*(<\/string>)/,
        `$1${version}$2`
      );
      updated = true;
    }

    // 更新 CFBundleVersion (构建号)
    const bundleVersionUpdated = content.match(/(<key>CFBundleVersion<\/key>\s*<string>)[^<]*(<\/string>)/);
    if (bundleVersionUpdated) {
      content = content.replace(
        /(<key>CFBundleVersion<\/key>\s*<string>)[^<]*(<\/string>)/,
        `$1${versionCode}$2`
      );
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(infoPlistPath, content, 'utf8');
      return true;
    }

    return false;

  } catch (error) {
    console.error('更新 iOS 版本号失败:', error.message);
    return false;
  }
}

/**
 * 更新项目版本号（根据项目类型自动选择更新方式）
 */
function updateAppVersion(projectPath, version, projectType) {
  const results = {
    success: false,
    updated: []
  };

  if (projectType === 'expo') {
    if (updateExpoAppConfig(projectPath, version)) {
      results.updated.push('app.json');
      results.success = true;
    }
  } else if (projectType === 'react-native') {
    if (updateAndroidVersion(projectPath, version)) {
      results.updated.push('Android build.gradle');
    }
    if (updateIOSVersion(projectPath, version)) {
      results.updated.push('iOS Info.plist');
    }
    results.success = results.updated.length > 0;
  }

  return results;
}

module.exports = {
  getAppName,
  getAppVersion,
  incrementVersion,
  updatePackageVersion,
  versionToVersionCode,
  updateExpoAppConfig,
  updateAndroidVersion,
  updateIOSVersion,
  updateAppVersion
};

