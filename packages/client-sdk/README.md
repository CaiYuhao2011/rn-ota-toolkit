# React Native OTA 客户端 SDK

支持 React Native 和 Expo 的 OTA 热更新客户端 SDK。

## 特性

- ✅ 支持 React Native（原生项目）
- ✅ 支持 Expo（Managed 和 Bare 工作流）
- ✅ 自动环境检测，无需手动配置
- ✅ TypeScript 类型支持
- ✅ 内置更新弹窗和进度条
- ✅ 支持 OTA 热更新（JS Bundle）
- ✅ 支持强制更新（APK/IPA）

## 安装

### React Native（原生项目）

```bash
npm install rn-ota-client react-native-fs react-native-restart
# 或
yarn add rn-ota-client react-native-fs react-native-restart
```

**iOS 额外步骤：**
```bash
cd ios && pod install
```

### Expo（Managed 工作流）

```bash
npx expo install rn-ota-client expo-file-system expo-updates expo-constants
```

### Expo（Bare 工作流）

```bash
npm install rn-ota-client expo-file-system expo-updates expo-constants
# 或
yarn add rn-ota-client expo-file-system expo-updates expo-constants

cd ios && pod install
```

## 使用方法

### TypeScript

```typescript
import React, { useEffect, useRef } from 'react';
import { View, Text, Button } from 'react-native';
import OTAUpdater, { OTAUpdateModal, UpdateInfo } from 'rn-ota-client';

const App: React.FC = () => {
  const otaUpdater = useRef<OTAUpdater | null>(null);
  const modalRef = useRef(null);

  useEffect(() => {
    // 初始化 OTA 更新器
    otaUpdater.current = new OTAUpdater({
      serverUrl: 'http://192.168.1.100:8080',
      appName: 'MyApp',
      version: '1.0.0',
    });

    // 绑定 Modal 组件
    otaUpdater.current.setModalComponent(modalRef.current);
  }, []);

  // 当收到推送或其他方式获取到新版本信息时调用
  const handleNewVersion = (versionInfo: UpdateInfo) => {
    otaUpdater.current?.checkUpdate(versionInfo);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>当前版本: 1.0.0</Text>
      <Button 
        title="模拟检查更新" 
        onPress={() => handleNewVersion({
          version: '1.0.1',
          type: 'ota',
          downloadUrl: 'http://192.168.1.100:8080/bundles/MyApp_android_1.0.1.bundle',
          description: '修复了一些 bug'
        })} 
      />
      
      {/* 必须渲染 Modal 组件 */}
      <OTAUpdateModal ref={modalRef} />
    </View>
  );
};

export default App;
```

### JavaScript

```javascript
import React, { useEffect, useRef } from 'react';
import { View, Text, Button } from 'react-native';
import OTAUpdater, { OTAUpdateModal } from 'rn-ota-client';

const App = () => {
  const otaUpdater = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    otaUpdater.current = new OTAUpdater({
      serverUrl: 'http://192.168.1.100:8080',
      appName: 'MyApp',
      version: '1.0.0',
    });

    otaUpdater.current.setModalComponent(modalRef.current);
  }, []);

  const handleNewVersion = (versionInfo) => {
    otaUpdater.current?.checkUpdate(versionInfo);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>当前版本: 1.0.0</Text>
      <Button 
        title="模拟检查更新" 
        onPress={() => handleNewVersion({
          version: '1.0.1',
          type: 'ota',
          downloadUrl: 'http://192.168.1.100:8080/bundles/MyApp_android_1.0.1.bundle',
          description: '修复了一些 bug'
        })} 
      />
      
      <OTAUpdateModal ref={modalRef} />
    </View>
  );
};

export default App;
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

- `setModalComponent(component)` - 设置 Modal 组件引用
- `checkUpdate(newVersionInfo)` - 检查并处理更新
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

## 更新类型

### OTA 更新（type: 'ota'）
- 仅更新 JavaScript 代码
- 自动下载并安装
- 提示用户重启应用

### 强制更新（type: 'force'）
- Android: 下载 APK 并引导用户安装
- iOS: 打开 App Store

## 环境检测

SDK 会自动检测运行环境：
- 如果检测到 `expo-constants`，使用 Expo 适配器
- 否则使用 React Native 适配器

无需手动配置。

## 注意事项

### Expo 限制

1. **Expo Managed 工作流**
   - 不支持 APK 直接安装（`type: 'force'` 在 Android 上会抛出错误）
   - 需要使用 EAS Build 构建独立应用

2. **Expo Bare 工作流**
   - 支持所有功能
   - 需要安装对应的原生依赖

### React Native 原生项目

1. **Android**
   - 确保已在 `AndroidManifest.xml` 中添加安装权限：
   ```xml
   <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
   ```

2. **iOS**
   - 确保已正确配置 `react-native-restart`

## License

MIT
