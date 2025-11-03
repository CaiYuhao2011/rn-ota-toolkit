# React Native OTA 更新系统

一套完整的 React Native 热更新解决方案，支持局域网部署，无需外网访问。

## 项目结构

```
OTA/
├── packages/
│   ├── client-sdk/          # React Native 客户端 SDK
│   ├── cli/                 # 命令行工具
│   └── ...
├── ota-server/              # Java Spring Boot 服务端
└── README.md
```

## 核心组件

### 1. OTA Server (Java Spring Boot)

基于 Spring Boot 3 + MyBatis Plus + MinIO 的 OTA 更新服务器。

**技术栈**:
- Java 17
- Spring Boot 3.2.0
- MyBatis Plus 3.5.5
- MySQL 8.0
- MinIO 对象存储

**特性**:
- ✅ 版本上传与管理
- ✅ 自动更新检查
- ✅ 支持增量更新（Bundle）和全量更新（APK/IPA）
- ✅ 支持 Android 和 iOS 双平台
- ✅ Docker 一键部署

**快速启动**:
```bash
cd ota-server
docker-compose up -d
```

📖 [详细文档](./ota-server/README.md)

### 2. Client SDK (@rn-ota/client-sdk)

React Native 客户端 SDK，支持 React Native 和 Expo 项目。

**特性**:
- ✅ 自动检查更新
- ✅ 热更新（JS Bundle）
- ✅ 全量更新（APK/IPA）
- ✅ 下载进度提示
- ✅ TypeScript 支持
- ✅ React Native 和 Expo 双支持

**安装**:
```bash
npm install @rn-ota/client-sdk
```

**使用示例**:
```javascript
import { OTAUpdater, UpdateModal } from '@rn-ota/client-sdk';

const updater = new OTAUpdater({
  serverUrl: 'http://192.168.1.100:8080',
  appName: 'MyApp',
  version: '1.0.0'
});

updater.setModalComponent(UpdateModal);

// 检查更新
updater.checkUpdate();
```

📖 [详细文档](./packages/client-sdk/README.md)

### 3. CLI Tool (@rn-ota/cli)

命令行工具，用于构建和部署 React Native 应用。

**特性**:
- ✅ 自动检测项目类型（React Native / Expo）
- ✅ 支持 Android 和 iOS 双平台
- ✅ 支持 Bundle 和原生包（APK/IPA）构建
- ✅ 智能版本管理（自动递增、自动写回）
- ✅ 一键部署到 OTA 服务器

**安装**:
```bash
npm install -g @rn-ota/cli
```

**使用示例**:
```bash
# 配置服务器
rn-ota config set server http://192.168.1.100:8080

# 部署双平台热更新（自动版本管理）
cd my-app
rn-ota deploy

# 部署 Android 强制更新
rn-ota deploy --platform android -t apk
```

📖 [详细文档](./packages/cli/README.md)

## 快速开始

### 1. 启动 OTA 服务器

```bash
cd ota-server
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f ota-server
```

服务访问地址：
- OTA Server: http://localhost:8080
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)

### 2. 安装 CLI 工具

```bash
npm install -g @rn-ota/cli

# 配置服务器地址
rn-ota config set server http://localhost:8080
```

### 3. 集成客户端 SDK

在你的 React Native 项目中：

```bash
cd my-app
npm install @rn-ota/client-sdk

# React Native 需要额外安装
npm install react-native-fs react-native-restart

# Expo 需要额外安装
npx expo install expo-file-system expo-updates expo-constants
```

在代码中集成：

```javascript
// App.js
import React, { useEffect } from 'react';
import { OTAUpdater, UpdateModal } from '@rn-ota/client-sdk';

const updater = new OTAUpdater({
  serverUrl: 'http://192.168.1.100:8080',
  appName: 'MyApp',
  version: '1.0.0'
});

function App() {
  useEffect(() => {
    // 设置更新 UI 组件
    updater.setModalComponent(UpdateModal);
    
    // 检查更新
    updater.checkUpdate();
  }, []);

  return (
    // 你的应用内容
  );
}

export default App;
```

### 4. 构建和部署

```bash
# 在项目目录下
cd my-app

# 部署热更新（双平台，自动版本管理）
rn-ota deploy

# 或者分步操作
# 1. 构建 Bundle
rn-ota build --platform android

# 2. 上传
rn-ota upload -f ./build/index.android.bundle -a MyApp -p android -v 1.0.1
```

## 完整工作流

### 开发流程

```bash
# 1. 启动 OTA 服务器
cd ota-server
docker-compose up -d

# 2. 开发 React Native 应用
cd ../my-app
npm run start

# 3. 测试功能

# 4. 部署热更新
rn-ota deploy
```

### 版本管理

```bash
# 查看所有版本
rn-ota list

# 删除指定版本
rn-ota delete -a MyApp -p android -v 1.0.0

# 部署新版本（自动版本号 +1）
rn-ota deploy -d "修复若干问题"
```

## 系统架构

```
┌─────────────────┐
│  React Native   │
│   Application   │ ◄── 集成 @rn-ota/client-sdk
└────────┬────────┘
         │
         │ HTTP Request
         │
         ▼
┌─────────────────┐
│   OTA Server    │
│  (Spring Boot)  │
├─────────────────┤
│  - API Layer    │
│  - Service      │
│  - MySQL        │ ◄── 存储版本信息
│  - MinIO        │ ◄── 存储 Bundle/APK/IPA 文件
└────────┬────────┘
         ▲
         │
         │ CLI Upload
         │
┌─────────────────┐
│   @rn-ota/cli   │
│  (Command Tool) │ ◄── 开发者使用
└─────────────────┘
```

## API 接口

### 检查更新
```
GET /ota/check?appName=MyApp&platform=android&version=1.0.0
```

### 上传版本
```
POST /ota/upload
Content-Type: multipart/form-data

bundle: <file>
appName: MyApp
platform: android
version: 1.0.1
updateType: incremental
```

### 版本列表
```
GET /ota/versions
```

### 删除版本
```
DELETE /ota/upload/{appName}/{platform}/{version}
```

## 配置说明

### 服务器配置 (application.yml)

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/ota
    username: root
    password: root

minio:
  endpoint: http://localhost:9000
  access-key: minioadmin
  secret-key: minioadmin
  bucket-name: ota-files
```

### 客户端配置

```javascript
const updater = new OTAUpdater({
  serverUrl: 'http://192.168.1.100:8080',  // OTA 服务器地址
  appName: 'MyApp',                        // 应用名称
  version: '1.0.0'                         // 当前版本
});
```

### CLI 配置

```bash
# 配置文件位置: ~/.rn-ota-config.json
rn-ota config set server http://192.168.1.100:8080
```

## 常见问题

### Q: 如何在局域网中使用？

A: 
1. 启动 OTA Server 在局域网内的服务器上
2. 配置客户端 `serverUrl` 为服务器的局域网 IP
3. 确保移动设备和服务器在同一局域网

### Q: 如何实现灰度发布？

A: 在服务端添加灰度逻辑，根据设备 ID 或用户 ID 返回不同版本。

### Q: 热更新后何时生效？

A: 
- OTA 更新：下载完成后会提示用户重启应用
- 全量更新：下载完成后引导用户安装 APK 或跳转 App Store

### Q: 支持回滚吗？

A: 可以通过部署旧版本实现回滚，客户端会自动检测到"新"版本并更新。

### Q: 如何保证更新安全？

A: 
1. 使用 HTTPS
2. 对 Bundle 文件进行签名验证
3. 在服务端添加访问控制

## 开发指南

### 开发客户端 SDK

```bash
cd packages/client-sdk
npm install
npm link

# 在测试项目中
cd my-test-app
npm link @rn-ota/client-sdk
```

### 开发 CLI 工具

```bash
cd packages/cli
npm install
npm link

# 测试
rn-ota --help
```

### 开发服务端

```bash
cd ota-server
mvn clean install
mvn spring-boot:run
```

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## License

MIT

## 相关链接

- [OTA Server 文档](./ota-server/README.md)
- [Client SDK 文档](./packages/client-sdk/README.md)
- [CLI 文档](./packages/cli/README.md)
