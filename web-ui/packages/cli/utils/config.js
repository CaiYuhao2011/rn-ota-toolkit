const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_FILE = path.join(os.homedir(), '.rn-ota-config.json');

/**
 * 读取配置
 */
function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('读取配置文件失败:', error.message);
  }
  return {};
}

/**
 * 写入配置
 */
function writeConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('写入配置文件失败:', error.message);
    return false;
  }
}

/**
 * 获取配置项
 */
function getConfig(key) {
  const config = readConfig();
  return config[key];
}

/**
 * 设置配置项
 */
function setConfig(key, value) {
  const config = readConfig();
  config[key] = value;
  return writeConfig(config);
}

/**
 * 删除配置项
 */
function deleteConfig(key) {
  const config = readConfig();
  delete config[key];
  return writeConfig(config);
}

/**
 * 获取所有配置
 */
function getAllConfig() {
  return readConfig();
}

/**
 * 获取配置文件路径
 */
function getConfigPath() {
  return CONFIG_FILE;
}

module.exports = {
  readConfig,
  writeConfig,
  getConfig,
  setConfig,
  deleteConfig,
  getAllConfig,
  getConfigPath
};

