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

### 1. 方式一：使用默认更新弹窗（推荐）

`OTAProvider` 会自动渲染更新弹窗，无需手动添加 `<OTAUpdateModal />`：

```javascript
import OTAUpdater, { OTAProvider } from 'rn-ota-client';

export default function App() {
  return (
    <OTAProvider>
      <YourApp />
    </OTAProvider>
  );
}
```

### 2. 方式二：完全自定义更新弹窗

如果需要完全自定义更新 UI，可以传入自定义组件：

```javascript
import { OTAProvider } from 'rn-ota-client';
import { Modal, View, Text, TouchableOpacity } from 'react-native';

// 自定义 Modal 组件
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
  cancelable,
}) {
  return (
    <Modal transparent visible={visible}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10 }}>
          <Text>{title}</Text>
          <Text>{message}</Text>
          {showProgress && <Text>进度: {Math.floor(progress * 100)}%</Text>}
          {onConfirm && (
            <TouchableOpacity onPress={onConfirm}>
              <Text>{confirmText || '确定'}</Text>
            </TouchableOpacity>
          )}
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

### 3. 方式三：不使用任何弹窗（自己完全控制 UI）

如果你想完全自己控制 UI，可以禁用自动渲染：

```javascript
import { OTAProvider, OTAUpdateModal } from 'rn-ota-client';

export default function App() {
  return (
    <OTAProvider renderModal={false}>
      <YourApp />
      {/* 在你想要的任何位置手动渲染 */}
      <OTAUpdateModal />
    </OTAProvider>
  );
}
```

### 4. 检查更新

**方式1：自动检查（推荐）**

SDK 会自动请求服务器并显示更新弹窗：

```javascript
import { useEffect } from 'react';
import OTAUpdater from 'rn-ota-client';

// 在组件外初始化
const otaUpdater = new OTAUpdater({
  serverUrl: 'http://192.168.1.100:10080',
  appName: 'MyApp',
  version: '1.0.0'
});

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

**方式2：手动控制（高级用法）**

如果需要自己处理请求逻辑：

```javascript
const handleCheckUpdate = async () => {
  try {
    const response = await fetch(
      `${serverUrl}/ota/check?appName=MyApp&platform=android&version=1.0.0`
    );
    const result = await response.json();

    if (result.code === 200 && result.data) {
      otaUpdater.showUpdate({
        version: result.data.version,
        type: result.data.updateType === 'full' ? 'force' : 'ota',
        downloadUrl: result.data.downloadUrl,
        description: result.data.description,
      });
    }
  } catch (error) {
    console.error('检查更新失败:', error);
  }
};
```

## API

### OTAProvider Props

```typescript
interface OTAProviderProps {
  children: ReactNode;
  // 可选：自定义 Modal 组件
  customModalComponent?: React.ComponentType<ModalState>;
  // 可选：是否自动渲染 Modal（默认 true）
  renderModal?: boolean;
}
```

**说明：**
- `customModalComponent`：传入自定义 Modal 组件，完全替换默认 UI
- `renderModal`：默认 `true`，Provider 会自动渲染 Modal。设为 `false` 则需手动添加 `<OTAUpdateModal />`

### UpdateModal Props（自定义样式）

```typescript
interface UpdateModalProps {
  // 基础属性
  visible: boolean;
  title: string;
  message: string;
  progress: number;
  showProgress: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText: string;
  cancelText: string;
  cancelable: boolean;
  
  // 样式自定义
  overlayStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  messageStyle?: StyleProp<TextStyle>;
  progressContainerStyle?: StyleProp<ViewStyle>;
  progressBarStyle?: StyleProp<ViewStyle>;
  progressFillStyle?: StyleProp<ViewStyle>;
  progressTextStyle?: StyleProp<TextStyle>;
  buttonContainerStyle?: StyleProp<ViewStyle>;
  cancelButtonStyle?: StyleProp<ViewStyle>;
  confirmButtonStyle?: StyleProp<ViewStyle>;
  cancelButtonTextStyle?: StyleProp<TextStyle>;
  confirmButtonTextStyle?: StyleProp<TextStyle>;
}
```

### OTAUpdater

**初始化：**

```javascript
const otaUpdater = new OTAUpdater({
  serverUrl: string,  // OTA 服务器地址
  appName: string,    // 应用名称
  version: string     // 当前版本号
});
```

**方法：**

```javascript
// 【推荐】自动检查更新（请求服务器 + 显示弹窗）
await otaUpdater.checkForUpdates();
// 返回：Promise<Object|null> - 版本信息或 null

// 手动显示更新弹窗（需要自己提供版本信息）
otaUpdater.showUpdate({
  version: '1.0.1',
  type: 'ota',  // 'ota' 或 'force'
  downloadUrl: 'http://...',
  description: '更新说明',
});

// 清除本地更新
await otaUpdater.clearLocalUpdate();

// 重启应用
otaUpdater.restart();

// ❌ 已废弃（保留向后兼容）
otaUpdater.checkUpdate(updateInfo);  
// 请改用 checkForUpdates() 或 showUpdate()
```

## 完成

配置完成后，应用将自动检查更新并提示用户。
