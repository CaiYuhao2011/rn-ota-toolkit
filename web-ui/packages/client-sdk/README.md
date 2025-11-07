# rn-ota-client

React Native OTA 热更新客户端 SDK。

## 平台支持

| 项目类型 | OTA 热更新 | APK/IPA 全量更新 | 说明 |
|---------|----------|-----------------|------|
| **React Native (Bare)** | ✅ | ✅ | 完全支持，需要配置原生代码 |
| **Expo Development Build** | ✅ | ✅ | 完全支持，使用 Config Plugin 自动配置 |
| **Expo Managed** | ❌ | ❌ | 不支持（无法访问原生代码） |

## 安装

### React Native 项目

```bash
npm install rn-ota-client react-native-fs react-native-restart react-native-blob-util react-native-zip-archive
cd ios && pod install
```

### Expo Development Build 项目

```bash
npm install rn-ota-client expo-file-system expo-intent-launcher react-native-zip-archive
```

**注意：** Expo Managed 项目不支持，必须是 `expo prebuild` 后的 Development Build。

## 配置原生代码

### React Native 项目

参考 [SETUP_SIMPLE.md](./SETUP_SIMPLE.md) 手动配置原生代码。

### Expo Development Build 项目

**使用 Config Plugin 自动配置（推荐）：**

1. 在项目根目录创建 `plugins/withOTABundleLoader.js`（见下方代码）
2. 在 `app.json` 的 `plugins` 数组最前面添加 `"./plugins/withOTABundleLoader"`
3. 运行 `npx expo prebuild` 应用配置
4. 构建 APK/IPA 时会自动应用 Config Plugin

**Config Plugin 代码：** [点击查看完整代码](https://github.com/your-repo/rn-ota/blob/main/examples/expo-config-plugin.js)

**app.json 配置：**

```json
{
  "expo": {
    "plugins": [
      "./plugins/withOTABundleLoader",
      "expo-router",
      ...其他插件
    ]
  }
}
```

## 使用方式

### 1. 基础使用（推荐）

使用 `OTAProvider` 包裹应用，自动处理更新检测和 UI：

**React Native:**

```javascript
import OTAUpdater, { OTAProvider } from 'rn-ota-client';

// 在应用外部初始化（重要）
const otaUpdater = new OTAUpdater({
  serverUrl: 'http://192.168.1.100:10080',
  appName: 'MyApp',
  version: '1.0.0'
});

export default function App() {
  return (
    <OTAProvider>
      <YourApp />
    </OTAProvider>
  );
}
```

**Expo:**

```javascript
import OTAUpdater, { OTAProvider, adapter } from 'rn-ota-client/expo';

const otaUpdater = new OTAUpdater({
  serverUrl: 'http://192.168.1.100:10080',
  appName: 'MyApp',
  version: '1.0.0'
}, adapter);

export default function App() {
  return (
    <OTAProvider>
      <YourApp />
    </OTAProvider>
  );
}
```

### 2. 检查更新

```javascript
import { useEffect } from 'react';

function YourApp() {
  useEffect(() => {
    // 应用启动时自动检查更新
    otaUpdater.checkForUpdates();
  }, []);

  const handleCheckUpdate = () => {
    // 手动触发检查更新
    otaUpdater.checkForUpdates();
  };

  return (
    <View>
      <Button title="检查更新" onPress={handleCheckUpdate} />
    </View>
  );
}
```

### 3. 自定义更新 UI

```javascript
import { OTAProvider } from 'rn-ota-client';
import { Modal, View, Text, TouchableOpacity } from 'react-native';

function MyCustomUpdateModal({
  visible,
  title,
  message,
  progress,
  showProgress,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
}) {
  return (
    <Modal transparent visible={visible}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, minWidth: 300 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>{title}</Text>
          <Text style={{ marginBottom: 20 }}>{message}</Text>
          {showProgress && (
            <View>
              <Text>下载进度: {Math.floor(progress * 100)}%</Text>
              <View style={{ height: 4, backgroundColor: '#eee', borderRadius: 2, marginTop: 10 }}>
                <View style={{ height: 4, backgroundColor: '#007AFF', width: `${progress * 100}%`, borderRadius: 2 }} />
              </View>
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 }}>
            {onCancel && (
              <TouchableOpacity onPress={onCancel} style={{ marginRight: 10, padding: 10 }}>
                <Text>{cancelText || '取消'}</Text>
              </TouchableOpacity>
            )}
            {onConfirm && (
              <TouchableOpacity onPress={onConfirm} style={{ padding: 10, backgroundColor: '#007AFF', borderRadius: 5 }}>
                <Text style={{ color: 'white' }}>{confirmText || '确定'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function App() {
  return (
    <OTAProvider customModalComponent={MyCustomUpdateModal}>
      <YourApp />
    </OTAProvider>
  );
}
```

## API 文档

### OTAUpdater 构造函数

```typescript
const otaUpdater = new OTAUpdater(config, adapter?);

interface OTAConfig {
  serverUrl: string;   // OTA 服务器地址
  appName: string;     // 应用名称
  version: string;     // 当前版本号
}

// adapter 参数：
// - React Native: 不传（使用默认适配器）
// - Expo: 传入 adapter（从 'rn-ota-client/expo' 导入）
```

### 方法

```typescript
// 自动检查更新（推荐）
await otaUpdater.checkForUpdates(): Promise<UpdateInfo | null>

// 手动显示更新弹窗
otaUpdater.showUpdate(updateInfo: UpdateInfo): void

// 清除本地 OTA 更新
await otaUpdater.clearLocalUpdate(): Promise<void>

// 重启应用
otaUpdater.restart(): void
```

### OTAProvider Props

```typescript
interface OTAProviderProps {
  children: ReactNode;
  // 自定义 Modal 组件
  customModalComponent?: React.ComponentType<ModalState>;
  // 是否自动渲染 Modal（默认 true）
  renderModal?: boolean;
}
```

## Expo 特别说明

### 支持的 Expo 环境

✅ **支持：Expo Development Build (已 prebuild)**
- 使用 `expo prebuild` 生成了 `android/` 和 `ios/` 目录
- 或使用 `eas build` 构建
- 可以使用 Config Plugin 自动配置

❌ **不支持：Expo Managed (纯 Expo Go)**
- 没有访问原生代码的能力
- 无法配置自定义 bundle 加载逻辑

### Expo 项目检查方式

```bash
# 检查项目类型
ls android ios

# 如果存在 android 和 ios 目录 → Development Build ✅
# 如果不存在 → Managed ❌（需要运行 expo prebuild）
```

### Expo Config Plugin 说明

Config Plugin 会自动注入以下功能：
- **Android**: 修改 `MainApplication.kt`，添加自定义 bundle 加载逻辑
- **iOS**: 修改 `AppDelegate.mm`，添加自定义 bundle 加载逻辑
- **Hermes 支持**: 自动识别 `.hbc` (Hermes 字节码) 文件
- **APK 升级清理**: APK 版本变更时自动清除旧 OTA 更新

**工作流程：**
1. 构建时执行 `expo prebuild` → Config Plugin 自动注入代码
2. EAS Build 或本地构建时会自动应用配置
3. 无需手动修改原生代码，支持重复 prebuild

## 更新流程说明

### OTA 热更新流程
1. 应用启动，调用 `checkForUpdates()`
2. SDK 请求服务器检查更新
3. 发现新版本 → 显示更新弹窗
4. 用户确认 → 后台下载 bundle
5. 下载完成 → 提示重启
6. 重启后使用新 bundle

### APK 全量更新流程
1. 检测到强制更新
2. 下载 APK 文件（显示进度）
3. 下载完成 → 提示安装
4. 用户点击 → 系统安装界面
5. 安装完成 → 首次启动自动清除旧 OTA

## 常见问题

### React Native 项目

**Q: OTA 更新后图片不见了？**
A: 确保只重写了 `getJSBundleFile()`，不要重写 `getBundleAssetName()`。

**Q: 安装新 APK 后还显示旧版本？**
A: 已自动处理，新 APK 首次启动会清除旧 OTA。

### Expo 项目

**Q: Expo Managed 项目可以用吗？**
A: 不可以，必须是 Development Build（有 `android/ios` 目录）。

**Q: 需要每次 prebuild 时重新配置吗？**
A: 不需要，Config Plugin 会在每次 prebuild 时自动注入。

**Q: EAS Build 云端构建支持吗？**
A: 支持，EAS Build 会在云端执行 prebuild，自动应用 Config Plugin。

**Q: 使用 Hermes 会有问题吗？**
A: 不会，Config Plugin 自动支持 `.hbc` 文件。

## 完整示例

查看完整示例项目：
- React Native: [examples/rn-example](https://github.com/your-repo/rn-ota/tree/main/examples/rn-example)
- Expo: [examples/expo-example](https://github.com/your-repo/rn-ota/tree/main/examples/expo-example)

## License

MIT
