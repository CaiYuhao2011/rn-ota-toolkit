# CLI 使用示例

本文档提供了 `rn-ota` CLI 工具的实际使用示例。

## 构建 Bundle

### React Native 项目

假设你有一个 React Native 项目位于 `~/Projects/MyApp`：

```bash
# 构建所有平台（Android + iOS）
rn-ota build -p ~/Projects/MyApp

# 输出示例：
# 📦 开始构建 Bundle
# 
# ═══════════════════════════════════════════════════════
# 
# 项目类型: react-native
# 项目路径: /Users/username/Projects/MyApp
# 入口文件: index.js
# 输出目录: /Users/username/Projects/MyApp/build
# 
# ═══════════════════════════════════════════════════════
# 
# ✔ Bundle 构建完成: index.android.bundle (2.35 MB)
# ✔ Bundle 构建完成: index.ios.bundle (2.41 MB)
# 
# ✅ 构建完成！
# 
# 构建产物：
# 
# 🤖 ANDROID
#    Bundle: /Users/username/Projects/MyApp/build/index.android.bundle
#    大小: 2.35 MB
#    资源: /Users/username/Projects/MyApp/build/assets
# 
# 🍎 IOS
#    Bundle: /Users/username/Projects/MyApp/build/index.ios.bundle
#    大小: 2.41 MB
#    资源: /Users/username/Projects/MyApp/build/assets
```

### Expo 项目

对于 Expo 项目，CLI 会自动检测并使用 `expo export`：

```bash
# 构建 Expo 项目
rn-ota build -p ~/Projects/MyExpoApp --android

# 输出示例：
# 📦 开始构建 Bundle
# 
# 项目类型: expo
# 项目路径: /Users/username/Projects/MyExpoApp
# 入口文件: index.js
# 输出目录: /Users/username/Projects/MyExpoApp/build
# 
# ✔ Bundle 构建完成: index.android.bundle (3.12 MB)
# 
# ✅ 构建完成！
```

### 指定输出目录

```bash
# 将构建产物输出到自定义目录
rn-ota build -p ./MyApp -o ./dist/bundles

# 输出将保存在：
# - ./dist/bundles/index.android.bundle
# - ./dist/bundles/index.ios.bundle
# - ./dist/bundles/assets/
```

### 自定义入口文件

如果你的项目使用非标准入口文件：

```bash
# 使用 TypeScript 入口
rn-ota build -p ./MyApp -e index.tsx

# 或其他自定义入口
rn-ota build -p ./MyApp -e src/index.js
```

## 完整工作流示例

### 场景 1：本地开发测试

```bash
# 1. 构建 Bundle
cd ~/Projects
rn-ota build -p ./MyApp --android

# 2. 查看构建产物
ls -lh MyApp/build/
# total 4.8M
# -rw-r--r-- 1 user user 2.4M Nov  3 10:30 index.android.bundle
# drwxr-xr-x 2 user user 4.0K Nov  3 10:30 assets/

# 3. 上传到测试服务器
rn-ota upload \
  -f ./MyApp/build/index.android.bundle \
  -a MyApp \
  -p android \
  -v 1.0.1-beta \
  -s http://192.168.1.100:8080 \
  -d "测试版本：修复登录问题"
```

### 场景 2：多平台发布

```bash
# 1. 构建所有平台
rn-ota build -p ./MyApp

# 2. 分别上传 Android 和 iOS
rn-ota upload \
  -f ./MyApp/build/index.android.bundle \
  -a MyApp \
  -p android \
  -v 1.0.2 \
  -s http://production.server.com:8080 \
  -d "修复了支付模块的崩溃问题"

rn-ota upload \
  -f ./MyApp/build/index.ios.bundle \
  -a MyApp \
  -p ios \
  -v 1.0.2 \
  -s http://production.server.com:8080 \
  -d "修复了支付模块的崩溃问题"

# 3. 验证发布
rn-ota list -s http://production.server.com:8080
```

### 场景 3：快速部署（推荐）

使用 `deploy` 命令一键完成构建和上传：

```bash
# 同时构建并部署 Android 和 iOS
rn-ota deploy \
  -r ./MyApp \
  -a MyApp \
  -v 1.0.3 \
  -s http://production.server.com:8080 \
  -d "新增分享功能" \
  --android \
  --ios

# 仅部署 Android（用于快速迭代）
rn-ota deploy \
  -r ./MyApp \
  -a MyApp \
  -v 1.0.3-hotfix \
  -s http://production.server.com:8080 \
  -d "紧急修复：闪退问题" \
  --android
```

### 场景 4：CI/CD 集成

GitHub Actions 示例：

```yaml
name: Build and Deploy OTA

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy-ota:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd MyApp
          npm install
      
      - name: Install OTA CLI
        run: npm install -g rn-ota-cli
      
      - name: Build and Deploy
        env:
          OTA_SERVER: ${{ secrets.OTA_SERVER_URL }}
          VERSION: ${{ github.ref_name }}
        run: |
          rn-ota deploy \
            -r ./MyApp \
            -a MyApp \
            -v $VERSION \
            -s $OTA_SERVER \
            -d "Release $VERSION" \
            --android \
            --ios
```

### 场景 5：Expo 项目部署

```bash
# Expo 项目会自动检测
rn-ota build -p ./MyExpoApp

# 或者使用 deploy 一键部署
rn-ota deploy \
  -r ./MyExpoApp \
  -a MyExpoApp \
  -v 1.0.0 \
  -s http://192.168.1.100:8080 \
  --android
```

## 版本管理示例

### 查看所有版本

```bash
rn-ota list -s http://production.server.com:8080

# 输出示例：
# 📋 已发布的版本:
# 
# MyApp - android
# ├─ 1.0.3 (2024-11-03) - 新增分享功能
# ├─ 1.0.2 (2024-11-02) - 修复了支付模块的崩溃问题
# └─ 1.0.1 (2024-11-01) - 修复登录问题
# 
# MyApp - ios
# ├─ 1.0.3 (2024-11-03) - 新增分享功能
# └─ 1.0.2 (2024-11-02) - 修复了支付模块的崩溃问题
```

### 删除旧版本

```bash
# 删除 Android 旧版本
rn-ota delete \
  -a MyApp \
  -p android \
  -v 1.0.1 \
  -s http://production.server.com:8080

# 批量删除（使用 shell 脚本）
for version in 1.0.1 1.0.2 1.0.3; do
  rn-ota delete -a MyApp -p android -v $version -s http://localhost:8080
done
```

## 常见问题处理

### 构建失败：找不到 react-native 命令

```bash
# 确保项目依赖已安装
cd MyApp
npm install

# 然后重新构建
cd ..
rn-ota build -p ./MyApp
```

### Bundle 文件过大

```bash
# 查看 Bundle 大小
ls -lh MyApp/build/*.bundle

# 优化建议：
# 1. 启用 Hermes 引擎（在 android/app/build.gradle 中）
# 2. 移除未使用的依赖
# 3. 使用 ProGuard（Android）/ Strip（iOS）
```

### Expo 项目构建失败

```bash
# 清除 Expo 缓存
cd MyExpoApp
npx expo start -c

# 确保 Expo CLI 是最新版本
npm install -g expo-cli

# 重新构建
cd ..
rn-ota build -p ./MyExpoApp
```

## 脚本自动化

创建一个快速发布脚本 `scripts/deploy-ota.sh`：

```bash
#!/bin/bash

# 配置
PROJECT_PATH="./MyApp"
APP_NAME="MyApp"
SERVER="http://production.server.com:8080"

# 读取版本号
echo "请输入版本号（例如 1.0.4）："
read VERSION

# 读取更新描述
echo "请输入更新描述："
read DESCRIPTION

# 选择平台
echo "选择平台："
echo "1) Android"
echo "2) iOS"
echo "3) 两者"
read PLATFORM_CHOICE

PLATFORMS=""
case $PLATFORM_CHOICE in
  1) PLATFORMS="--android" ;;
  2) PLATFORMS="--ios" ;;
  3) PLATFORMS="--android --ios" ;;
  *) echo "无效选择"; exit 1 ;;
esac

# 执行部署
echo "开始部署 $VERSION..."
rn-ota deploy \
  -r "$PROJECT_PATH" \
  -a "$APP_NAME" \
  -v "$VERSION" \
  -s "$SERVER" \
  -d "$DESCRIPTION" \
  $PLATFORMS

echo "部署完成！"
```

使用脚本：

```bash
chmod +x scripts/deploy-ota.sh
./scripts/deploy-ota.sh
```

## 总结

- 使用 `build` 命令单独构建 Bundle（支持 RN/Expo 自动检测）
- 使用 `upload` 命令上传已有的 Bundle
- 使用 `deploy` 命令一键构建并部署（推荐）
- 使用 `list` 和 `delete` 命令管理版本
- 集成到 CI/CD 实现自动化发布

