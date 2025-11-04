# rn-ota-client

React Native OTA 热更新客户端。

## 支持

- ✅ React Native 原生项目
- ✅ Expo Bare/Ejected
- ⚠️ Expo Managed（只支持 APK 安装，OTA 更新需要原生配置）

## 安装

**React Native：**
```bash
npm install rn-ota-client react-native-fs react-native-restart react-native-blob-util react-native-zip-archive
cd ios && pod install
```

**Expo：**
```bash
npm install rn-ota-client expo-file-system expo-updates expo-intent-launcher react-native-zip-archive
```

## 配置原生代码

⚠️ **OTA 热更新需要配置**（APK 安装不需要），参考 [SETUP_SIMPLE.md](./SETUP_SIMPLE.md)

**说明**：
- **APK 安装（全量更新）**：无需配置，直接可用
- **OTA 热更新（Bundle 更新）**：需要配置原生代码加载 bundle

## 使用

### 1. App.tsx

```javascript
import OTAUpdater, { OTAUpdateModal, OTAProvider } from 'rn-ota-client';

export default function App() {
  return (
    <OTAProvider>
      <YourApp />
      <OTAUpdateModal />
    </OTAProvider>
  );
}
```

### 2. 检查更新

```javascript
import { useEffect, useRef } from 'react';
import OTAUpdater from 'rn-ota-client';

function YourApp() {
  const otaUpdater = useRef(null);

  useEffect(() => {
    otaUpdater.current = new OTAUpdater({
      serverUrl: 'http://192.168.1.100:8080',
      appName: 'MyApp',
      version: '1.0.0'
    });

    otaUpdater.current.checkUpdate();
  }, []);
}
```

## API

### OTAUpdater

```javascript
const otaUpdater = new OTAUpdater({
  serverUrl: string,  // OTA 服务器地址
  appName: string,    // 应用名称
  version: string     // 当前版本号
});

// 检查更新
await otaUpdater.checkUpdate();

// 清除本地更新
await otaUpdater.clearLocalUpdate();

// 重启应用
otaUpdater.restart();
```

## 完成

配置完成后，应用将自动检查更新并提示用户。
