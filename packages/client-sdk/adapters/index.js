/**
 * 适配器工厂
 * 根据运行环境自动选择合适的适配器
 */

let adapter = null;

// 检测是否在 Expo 环境中
function isExpo() {
  try {
    // Expo 环境会有 expo-constants 模块
    require('expo-constants');
    return true;
  } catch {
    return false;
  }
}

// 获取适配器实例
export function getAdapter() {
  if (!adapter) {
    if (isExpo()) {
      console.log('[OTA] 检测到 Expo 环境');
      adapter = require('./expo').default;
    } else {
      console.log('[OTA] 检测到 React Native 环境');
      adapter = require('./rn').default;
    }
  }
  return adapter;
}

export default getAdapter;

