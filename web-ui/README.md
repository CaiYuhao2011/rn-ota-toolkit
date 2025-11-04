# React Native OTA 更新系统

完整的 React Native 热更新解决方案。

## 支持

- ✅ React Native 原生项目
- ✅ Expo Bare/Ejected
- ⚠️ Expo Managed（只支持 APK 全量更新）

**说明**：
- APK 安装：所有项目都支持
- OTA 热更新：需要原生代码配置

## 项目结构

```
OTA/
├── packages/
│   ├── client-sdk/    # React Native 客户端 SDK
│   └── cli/           # 命令行工具
└── ota-server/        # Java Spring Boot 服务端
```

## 快速开始

### 1. 启动服务端

```bash
cd ota-server
docker-compose up -d
```

服务端运行在 `http://localhost:8080`

### 2. 安装 CLI

```bash
npm install -g rn-ota-cli
```

### 3. 部署更新

```bash
cd your-rn-project
rn-ota deploy --platform android
```

### 4. 客户端集成

**安装：**

```bash
npm install rn-ota-client react-native-fs react-native-restart react-native-blob-util react-native-zip-archive
cd ios && pod install
```

**配置原生代码：**

参考 [SETUP_SIMPLE.md](./packages/client-sdk/SETUP_SIMPLE.md)

**使用：**

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

// 在某处初始化并检查更新
const otaUpdater = new OTAUpdater({
  serverUrl: 'http://192.168.1.100:8080',
  appName: 'MyApp',
  version: '1.0.0'
});

otaUpdater.checkUpdate();
```

## 文档

- [OTA Server 文档](./ota-server/README.md)
- [Client SDK 文档](./packages/client-sdk/README.md)
- [CLI 文档](./packages/cli/README.md)
- [原生配置指南](./packages/client-sdk/SETUP_SIMPLE.md)

## 工作流程

1. **开发** → 修改 React Native 代码
2. **构建** → `rn-ota build --platform android`
3. **上传** → `rn-ota upload --file build/bundle-android.zip`
4. **客户端** → 自动检查并下载更新
5. **重启** → 加载新 bundle
