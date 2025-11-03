# React Native OTA 客户端 SDK

支持 React Native 和 Expo 的 OTA 热更新客户端 SDK。

## 特性

- ✅ 支持 React Native（原生项目）
- ✅ 支持 Expo（通过 `/expo` 入口）
- ✅ TypeScript 类型支持
- ✅ 内置更新弹窗和进度条
- ✅ 支持 OTA 热更新（JS Bundle）
- ✅ 支持强制更新（APK/IPA）
- ✅ 使用 React Context 管理状态，无需手动传递 ref

## 安装

### React Native（原生项目）

```bash
npm install rn-ota-client react-native-fs react-native-restart react-native-blob-util
# 或
yarn add rn-ota-client react-native-fs react-native-restart react-native-blob-util
```

**iOS 额外步骤：**
```bash
cd ios && pod install
```

### Expo

```bash
npx expo install rn-ota-client expo-file-system expo-updates
```

## 使用方法

### 1. 在 App 根组件包裹 OTAProvider

```typescript
// App.tsx
import React from 'react';
import OTAUpdater, { OTAUpdateModal, OTAProvider } from 'rn-ota-client';
// Expo 项目使用：
// import OTAUpdater, { OTAUpdateModal, OTAProvider } from 'rn-ota-client/expo';

export default function App() {
  return (
    <OTAProvider>
      {/* 你的应用内容 */}
      <YourApp />
      
      {/* OTA 更新弹窗组件 */}
      <OTAUpdateModal />
    </OTAProvider>
  );
}
```

### 2. 初始化 OTAUpdater 并检查更新

```typescript
import React, { useEffect } from 'react';
import OTAUpdater from 'rn-ota-client';
import { Platform } from 'react-native';

// 在组件外部初始化
const otaUpdater = new OTAUpdater({
  serverUrl: 'http://192.168.1.100:8080',
  appName: 'MyApp',
  version: '1.0.0',
});

function YourApp() {
  useEffect(() => {
    // 应用启动时检查更新
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      const platform = Platform.OS;
      const response = await fetch(
        `http://192.168.1.100:8080/ota/check?appName=MyApp&platform=${platform}&version=1.0.0`
      );
      const result = await response.json();

      if (result.code === 200 && result.data) {
        const updateInfo = result.data;
        
        // 调用 SDK 处理更新
        otaUpdater.checkUpdate({
          version: updateInfo.version,
          type: updateInfo.updateType === 'full' ? 'force' : 'ota',
          downloadUrl: updateInfo.downloadUrl,
          description: updateInfo.description,
          minAppVersion: updateInfo.minAppVersion,
        });
      }
    } catch (error) {
      console.error('检查更新失败:', error);
    }
  };

  return (
    // 你的应用 UI
  );
}
```

### 3. WebSocket 推送更新（可选）

如果使用 WebSocket 推送更新通知：

```typescript
// websocket.ts
import OTAUpdater from 'rn-ota-client';
import { useEffect, useRef } from 'react';

const otaUpdaterRef = useRef(null);

export const useInitWebSocket = (url: string) => {
  useEffect(() => {
    // 初始化 OTA Updater
    otaUpdaterRef.current = new OTAUpdater({
      serverUrl: 'http://192.168.1.100:8080',
      appName: 'MyApp',
      version: '1.0.0',
    });
  }, []);

  const handleMessage = (message) => {
    if (message.type === 'NEW_VERSION') {
      const versionData = JSON.parse(message.content);
      
      otaUpdaterRef.current?.checkUpdate({
        version: versionData.version,
        type: versionData.updateType === 'full' ? 'force' : 'ota',
        downloadUrl: versionData.downloadUrl,
        description: versionData.description,
        minAppVersion: versionData.minAppVersion,
      });
    }
  };

  // ... WebSocket 连接逻辑
};
```

## API

### OTAUpdater

#### 构造函数

```typescript
new OTAUpdater(config: OTAConfig)
```

**OTAConfig:**
- `serverUrl: string` - OTA 服务器地址
- `appName: string` - 应用名称
- `version: string` - 当前版本号

#### 方法

- `checkUpdate(updateInfo: UpdateInfo)` - 检查并处理更新
- `downloadOtaUpdate(updateInfo, onProgress?)` - 下载 OTA 更新
- `downloadAndInstallApk(updateInfo, onProgress?)` - 下载并安装 APK（仅 Android）
- `openAppStore(url)` - 打开应用商店（仅 iOS）
- `restart()` - 重启应用
- `clearLocalUpdate()` - 清除本地更新

### UpdateInfo

```typescript
interface UpdateInfo {
  version: string;           // 新版本号
  type: 'ota' | 'force';    // 更新类型
  downloadUrl: string;       // 下载地址
  description?: string;      // 更新描述
  minAppVersion?: string;    // 最低原生版本要求
}
```

### 组件

- `<OTAProvider>` - 必须包裹在应用最外层
- `<OTAUpdateModal />` - 更新弹窗组件

## 更新类型

### OTA 更新（type: 'ota'）
- 仅更新 JavaScript 代码
- 自动下载并安装
- 提示用户重启应用

### 强制更新（type: 'force'）
- Android: 下载 APK 并引导用户安装
- iOS: 打开 App Store

## 注意事项

### Android 权限

确保在 `AndroidManifest.xml` 中添加安装权限：
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
```

### Expo 限制

- Expo Managed 工作流不支持直接安装 APK
- 需要使用 EAS Build 构建独立应用

## License

MIT
