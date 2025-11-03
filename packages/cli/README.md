# RN OTA CLI

React Native/Expo OTA 命令行工具，支持自动检测项目类型并构建 Bundle。

## 特性

- ✅ 自动检测项目类型（React Native / Expo）
- ✅ 支持 Android 和 iOS 双平台
- ✅ 支持 Bundle（热更新）和原生包（APK/IPA）构建
- ✅ 智能版本管理（自动递增、自动写回）
- ✅ 支持部署到 OTA 服务器
- ✅ 版本管理（列出、删除）
- ✅ 友好的命令行界面

## 安装

### 全局安装

```bash
npm install -g rn-ota-cli
```

### 项目内安装

```bash
npm install --save-dev rn-ota-cli
```

## 使用方法

### 1. 配置服务器地址（推荐）

首次使用时，建议先配置默认服务器地址：

```bash
# 设置服务器地址
rn-ota config set server http://192.168.1.100:8080

# 查看配置
rn-ota config list

# 获取单个配置
rn-ota config get server

# 删除配置
rn-ota config delete server
```

配置后，所有命令都会使用配置的服务器地址，无需每次指定 `-s` 参数。

### 2. 构建 Bundle 或原生包

自动检测项目类型（React Native 或 Expo）并构建 Bundle 或原生安装包。

```bash
# 构建 Android Bundle（默认）
rn-ota build

# 构建 iOS Bundle
rn-ota build --platform ios

# 构建 Android APK
rn-ota build -t apk

# 构建 iOS IPA（需要 macOS）
rn-ota build -t ipa

# 构建 Debug 版本
rn-ota build -t apk --debug

# 指定项目路径和输出目录
rn-ota build -p ./my-app -o ./dist

# 指定 Bundle 入口文件
rn-ota build -e index.tsx
```

**参数说明：**
- `-p, --project <path>` - 项目路径（可选，默认为当前目录 `.`）
- `-t, --type <type>` - 构建类型：`bundle`、`apk` 或 `ipa`（可选，默认为 `bundle`）
- `--platform <platform>` - 平台：`android` 或 `ios`（仅 bundle 时需要，默认 `android`）
- `-o, --output <path>` - 输出路径（可选，默认为项目的 `build` 目录）
- `-e, --entry <file>` - Bundle 入口文件（可选，默认为 `index.js`）
- `--debug` - 构建 Debug 版本（仅原生包）

**输出示例：**
```
📦 开始构建 iOS Bundle

═══════════════════════════════════════════════════════

项目类型: expo
项目路径: /path/to/my-app
平台: IOS
入口文件: index.js
输出目录: /path/to/my-app/build

═══════════════════════════════════════════════════════

✔ Bundle 构建完成: index.ios.bundle (2.41 MB)

✅ 构建完成！

构建产物：

🍎 IOS
   Bundle: /path/to/my-app/build/index.ios.bundle
   大小: 2.41 MB
   资源: /path/to/my-app/build/assets
```

### 3. 上传文件

将构建好的文件（Bundle、APK 或 IPA）上传到 OTA 服务器。

```bash
# 上传 Android Bundle
rn-ota upload -f ./build/index.android.bundle -a MyApp -p android -v 1.0.1

# 上传 iOS Bundle
rn-ota upload -f ./build/index.ios.bundle -a MyApp -p ios -v 1.0.1

# 上传 APK
rn-ota upload -f ./build/app-release.apk -a MyApp -p android -v 2.0.0

# 上传 IPA
rn-ota upload -f ./build/app-release.ipa -a MyApp -p ios -v 2.0.0
```

**参数说明：**
- `-f, --file <path>` - 文件路径（必需）
- `-a, --app <name>` - 应用名称（必需）
- `-v, --version <version>` - 版本号（必需）
- `-p, --platform <platform>` - 平台：`android` 或 `ios`（必需）
- `-s, --server <url>` - 服务器地址（可选）
- `-d, --description <text>` - 版本描述（可选）

### 4. 部署（构建 + 上传）⭐ 推荐

一键构建并部署到 OTA 服务器。应用名称和版本号会自动从 `package.json` 读取和管理。

**智能版本管理：**
- 不指定 `-v` 参数时，自动读取 `package.json` 中的 `version` 并 +1
- 部署成功后，版本号会自动同步到 `package.json`（无论是自动还是手动指定）
- 例如：当前版本 `1.0.0` → 自动升级到 `1.0.1` → 写回 `package.json`
- 手动指定版本号（如 `-v 2.0.0`）也会同步更新到 `package.json`

```bash
# 最简单的用法（完全自动，双平台）
cd my-app
rn-ota deploy

# 仅部署 Android
rn-ota deploy --platform android

# 仅部署 iOS
rn-ota deploy --platform ios

# 部署 Android 强制更新（APK）
rn-ota deploy --platform android -t apk -d "重大更新"

# 部署 iOS 强制更新（IPA）
rn-ota deploy --platform ios -t ipa -d "重大更新"

# 双平台强制更新（APK + IPA）
rn-ota deploy --platform all -t apk -d "重大更新"

# 手动指定版本号
rn-ota deploy -v 2.0.0

# 指定最低版本要求
rn-ota deploy -m 1.0.0 -d "修复登录问题"
```

**参数说明：**
- `-v, --version <version>` - 版本号（可选，默认自动从 package.json 读取并 +1）
- `-a, --app <name>` - 应用名称（可选，默认从 package.json 读取）
- `-p, --project <path>` - 项目路径（可选，默认当前目录）
- `--platform <platform>` - 平台：`android`、`ios` 或 `all`（默认 `all`）
- `-t, --type <type>` - 类型：`bundle`（热更新）、`apk` 或 `ipa`（强制更新），默认 `bundle`
- `-s, --server <url>` - 服务器地址（可选）
- `-d, --description <text>` - 版本描述（可选）
- `-m, --min-app-version <version>` - 最低版本要求（可选）
- `--debug` - 构建 Debug 版本（仅原生包）

### 5. 列出版本

查看服务器上所有已发布的版本。

```bash
rn-ota list
```

### 6. 删除版本

删除服务器上指定的版本。

```bash
# 删除 Android 版本
rn-ota delete -a MyApp -p android -v 1.0.1

# 删除 iOS 版本
rn-ota delete -a MyApp -p ios -v 1.0.1
```

**参数说明：**
- `-a, --app <name>` - 应用名称（必需）
- `-v, --version <version>` - 版本号（必需）
- `-p, --platform <platform>` - 平台：`android` 或 `ios`（必需）
- `-s, --server <url>` - 服务器地址（可选）

## 项目类型检测

CLI 会自动检测项目类型：

### React Native 项目
- 检测 `package.json` 中是否有 `react-native` 依赖
- 使用 `react-native bundle` 命令构建 Bundle
- 使用 Gradle 构建 Android APK
- 使用 Xcodebuild 构建 iOS IPA（需要 macOS）

### Expo 项目
- 检测 `package.json` 中是否有 `expo` 依赖
- 使用 `expo export` 命令构建 Bundle

## 典型工作流

### 首次配置

```bash
# 配置服务器地址（只需一次）
rn-ota config set server http://192.168.1.100:8080
```

### 日常部署流程

```bash
# 1. 开发并测试你的 RN/Expo 应用
cd my-app
npm run start

# 2. 热更新部署（双平台，自动版本管理）
rn-ota deploy

# 3. 强制更新部署（Android APK）
rn-ota deploy --platform android -t apk -d "重大功能更新"

# 4. 强制更新部署（iOS IPA）
rn-ota deploy --platform ios -t ipa -d "重大功能更新"
```

### 手动上传流程

```bash
# 1. 先构建 Bundle
rn-ota build --platform android  # 或 ios

# 2. 再手动上传
rn-ota upload \
  -f ./build/index.android.bundle \
  -a MyApp \
  -p android \
  -v 1.0.1
```

## 常见问题

### Q: 构建失败，提示找不到 react-native 命令？

A: 确保项目目录下已安装依赖：
```bash
cd my-app
npm install
```

### Q: Expo 项目构建失败？

A: 确保安装了 Expo CLI：
```bash
npm install -g expo-cli
# 或
npx expo --version
```

### Q: 版本号管理规则是什么？

A: 
- 不指定 `-v` 参数时，自动从 `package.json` 读取当前版本号，末位 +1
- 例如：`1.0.0` → `1.0.1`，`1.2.9` → `1.2.10`
- 部署成功后，版本号会自动同步到 `package.json`
- 手动指定版本号（`-v 2.0.0`）也会在部署成功后写回 `package.json`
- 保证 `package.json` 中的版本号始终与服务器上最新发布的版本一致

### Q: 如何在 CI/CD 中使用？

A: 示例 GitHub Actions 配置：
```yaml
- name: Deploy OTA
  run: |
    npm install -g rn-ota-cli
    rn-ota config set server ${{ secrets.OTA_SERVER_URL }}
    cd my-app
    rn-ota deploy
    # 版本号会自动管理，无需手动指定
```

### Q: Bundle 文件太大？

A: 考虑以下优化：
1. 启用 Hermes 引擎
2. 移除未使用的依赖
3. 使用代码分割
4. 压缩图片资源

### Q: iOS IPA 构建失败？

A: 
- 确保在 macOS 上构建
- 确保已安装 Xcode 和命令行工具
- 检查签名配置和证书
- 对于企业分发，需要企业证书
- 建议使用 TestFlight 或 App Store 进行 iOS 分发

## 故障排查

### 查看详细日志

构建失败时，查看错误输出：
```bash
rn-ota build -p ./my-app 2>&1 | tee build.log
```

### 清除缓存重新构建

React Native:
```bash
cd my-app
rm -rf node_modules
npm install
npx react-native start --reset-cache
```

Expo:
```bash
cd my-app
npx expo start -c
```

## License

MIT
