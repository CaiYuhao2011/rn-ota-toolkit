# rn-ota-cli

React Native OTA 命令行工具，支持 React Native 和 Expo Development Build 项目。

## 功能特性

- ✅ 自动检测项目类型（React Native / Expo）
- ✅ 支持 Hermes 字节码 (.hbc)
- ✅ 自动更新版本号（Android `versionCode` + iOS `buildNumber`）
- ✅ 构建 Bundle（OTA 更新）+ APK/IPA（全量更新）
- ✅ 一键部署到 OTA 服务器
- ✅ Expo Config Plugin 自动应用

## 安装

```bash
npm install -g rn-ota-cli
```

## 快速开始

### 1. 配置文件（可选）

在项目根目录创建 `.ota.config.json`：

```json
{
  "server": "http://192.168.1.100:10080",
  "appName": "MyApp"
}
```

### 2. 构建

```bash
# 构建 OTA Bundle
rn-ota build --platform android -t bundle

# 构建 APK
rn-ota build --platform android -t apk

# 构建 IPA (仅 macOS)
rn-ota build --platform ios -t ipa
```

### 3. 上传

```bash
rn-ota upload \
  --file build/MyApp_v1_0_0_ota.zip \
  --app MyApp \
  --platform android \
  --version 1.0.0
```

## 命令详解

### build - 构建

```bash
rn-ota build [options]

选项：
  -p, --project <path>      项目路径（默认: 当前目录）
  --platform <platform>     平台: android|ios
  -t, --target <type>       构建目标: bundle|apk|ipa
  -o, --output <path>       输出路径
  --debug                   Debug 模式（默认: Release）
  
示例：
  # 构建 Android Bundle
  rn-ota build --platform android -t bundle
  
  # 构建 Android APK (Release)
  rn-ota build --platform android -t apk
  
  # 构建 iOS IPA
  rn-ota build --platform ios -t ipa
```

**自动功能：**
- ✅ 自动检测项目类型（RN / Expo）
- ✅ 自动更新 `package.json` 版本号
- ✅ 自动更新 Android `versionCode` 和 `versionName`
- ✅ 自动更新 iOS `buildNumber` 和 `version`
- ✅ Expo 项目自动执行 `expo prebuild`（应用 Config Plugin）
- ✅ 生成规范文件名：
  - Bundle: `appName_v1_0_0_ota.zip`
  - APK: `appName_v1_0_0.apk`
  - IPA: `appName_v1_0_0.ipa`

**输出示例：**

```
📦 开始构建 Bundle

═══════════════════════════════════════════════════════
项目类型: expo
应用名称: moldcore
当前版本: 1.0.27
平台: android
目标: bundle
输出目录: /path/to/project/build
═══════════════════════════════════════════════════════

正在更新版本信息...
  ✔ 已更新 package.json: 1.0.27
  ✔ 已更新 app.json: version=1.0.27, versionCode=10027
  ✔ 已更新 android/app/build.gradle: versionCode=10027, versionName="1.0.27"

✔ Bundle 构建完成 (3.12 MB)
✔ 正在打包 bundle 和 assets...
✔ Bundle 已打包为 zip (3.25 MB)

✅ 构建完成！

构建产物:
  Bundle: /path/to/project/build/index.android.bundle (3.12 MB)
  Zip: /path/to/project/build/moldcore_v1_0_27_ota.zip (3.25 MB)
```

### upload - 上传

```bash
rn-ota upload [options]

选项：
  -f, --file <file>         Bundle zip 文件路径
  -a, --app <name>          应用名称
  -p, --platform <platform> 平台: android|ios
  -v, --version <version>   版本号
  -s, --server <url>        服务器地址
  -d, --description <text>  更新描述
  
示例：
  rn-ota upload \
    --file build/moldcore_v1_0_27_ota.zip \
    --app moldcore \
    --platform android \
    --version 1.0.27 \
    --server http://192.168.1.100:10080 \
    --description "修复登录问题"
```

### deploy - 一键部署

构建 + 上传的快捷命令：

```bash
rn-ota deploy [options]

选项：
  -p, --project <path>      项目路径
  --platform <platform>     平台
  -t, --target <type>       目标: bundle|apk|ipa
  -s, --server <url>        服务器地址
  -a, --app <name>          应用名称
  -d, --description <text>  更新描述
  
示例：
  # 构建并部署 Android Bundle
  rn-ota deploy \
    --project ./MyApp \
    --platform android \
    -t bundle \
    --server http://192.168.1.100:10080 \
    --app MyApp \
    --description "修复已知问题"
```

### list - 查看版本

```bash
rn-ota list [options]

选项：
  -s, --server <url>        服务器地址
  -a, --app <name>          应用名称（可选）
  
示例：
  rn-ota list --server http://192.168.1.100:10080 --app MyApp
```

### delete - 删除版本

```bash
rn-ota delete [options]

选项：
  -a, --app <name>          应用名称
  -p, --platform <platform> 平台
  -v, --version <version>   版本号
  -s, --server <url>        服务器地址
  
示例：
  rn-ota delete \
    --app MyApp \
    --platform android \
    --version 1.0.0 \
    --server http://192.168.1.100:10080
```

### config - 配置管理

```bash
rn-ota config [options]

选项：
  set <key> <value>         设置配置
  get <key>                 获取配置
  list                      列出所有配置
  
示例：
  rn-ota config set server http://192.168.1.100:10080
  rn-ota config set appName MyApp
  rn-ota config list
```

## 项目类型说明

### React Native (Bare) 项目

**特点：**
- 有 `android/` 和 `ios/` 目录
- 使用 `react-native bundle` 构建
- 使用 `./gradlew` 构建 APK
- 使用 `xcodebuild` 构建 IPA

**版本更新：**
- `package.json`: version
- `android/app/build.gradle`: versionCode, versionName
- `ios/Info.plist` 或 `project.pbxproj`: CFBundleVersion, CFBundleShortVersionString

### Expo Development Build 项目

**特点：**
- 有 `app.json` 或 `app.config.js`
- 可能有 `android/ios` 目录（prebuild 后）
- 使用 `npx expo export` 构建 Bundle
- 使用 `eas build --local` 构建 APK/IPA

**版本更新：**
- `package.json`: version
- `app.json`: expo.version, expo.android.versionCode, expo.ios.buildNumber
- `android/app/build.gradle`: versionCode, versionName（如果存在）
- `ios/Info.plist`: 版本信息（如果存在）

**Config Plugin 自动应用：**
- CLI 在构建 APK/IPA 时会检测 `plugins/` 目录
- 如果存在，自动执行 `expo prebuild` 应用 Config Plugin
- 无需手动 prebuild

**Hermes 支持：**
- Expo 54+ 默认启用 Hermes
- CLI 自动识别 `.hbc` 文件（Hermes 字节码）
- Bundle 命名：`index.android.bundle.hbc` 或 `index.ios.bundle.hbc`

## 版本号管理

### 版本号格式

CLI 使用语义化版本：`major.minor.patch`（如 `1.0.27`）

**Android versionCode 转换规则：**
- `1.0.0` → `10000`
- `1.0.27` → `10027`
- `2.5.13` → `20513`
- `10.20.30` → `102030`

**iOS buildNumber：**
- 与 versionCode 相同：`10027`

### 自动更新流程

CLI 在构建前会自动更新所有版本信息：

```bash
# 1. 读取 package.json 的 version
# 2. 计算 versionCode
# 3. 更新所有配置文件：
#    - package.json
#    - app.json (Expo)
#    - android/app/build.gradle
#    - ios/Info.plist 或 project.pbxproj
```

**输出示例：**

```
正在更新版本信息...
  ✔ 已更新 package.json: 1.0.27
  ✔ 已更新 app.json: version=1.0.27, versionCode=10027
  ✔ 已更新 android/app/build.gradle: versionCode=10027, versionName="1.0.27"
```

## 文件命名规范

### Bundle（OTA 更新）

格式：`appName_v1_0_27_ota.zip`

```bash
moldcore_v1_0_27_ota.zip
├── index.android.bundle (或 .hbc)
├── assets/
│   ├── drawable-mdpi/
│   ├── drawable-hdpi/
│   ├── drawable-xhdpi/
│   ├── drawable-xxhdpi/
│   └── drawable-xxxhdpi/
└── metadata.json
```

### APK/IPA（全量更新）

格式：
- APK: `appName_v1_0_27.apk`
- IPA: `appName_v1_0_27.ipa`

**临时文件自动清理：**
- Expo 构建会生成临时 APK/IPA（如 `build-xxx.apk`）
- CLI 会自动复制到规范文件名并删除临时文件

## 使用示例

### 基础工作流

```bash
# 1. 修改代码
# 2. 更新 package.json 版本号（如 1.0.27 → 1.0.28）
# 3. 构建 Bundle
cd /path/to/project
rn-ota build --platform android -t bundle

# 4. 上传
rn-ota upload \
  --file build/moldcore_v1_0_28_ota.zip \
  --app moldcore \
  --platform android \
  --version 1.0.28 \
  --server http://192.168.1.100:10080
```

### 使用 npm scripts（推荐）

在 `package.json` 中添加：

```json
{
  "scripts": {
    "bundle:dev": "rn-ota build --platform android -t bundle --project .",
    "bundle:prod": "NODE_ENV=production rn-ota build --platform android -t bundle --project .",
    "release:dev": "rn-ota build --platform android -t apk --project .",
    "release:prod": "NODE_ENV=production rn-ota build --platform android -t apk --project ."
  }
}
```

使用：

```bash
npm run bundle:prod   # 构建 Bundle
npm run release:prod  # 构建 APK
```

## 常见问题

### Q: Expo 项目构建时没有应用 Config Plugin？

A: CLI 会自动检测 `plugins/` 目录并执行 `expo prebuild`。如果失败，请手动运行：

```bash
npx expo prebuild --platform android
```

### Q: 版本号更新失败？

A: 确保：
1. `package.json` 的 `version` 字段格式正确（如 `1.0.27`）
2. 有权限修改项目文件
3. `android/app/build.gradle` 中 `versionCode` 和 `versionName` 是静态值，不是动态计算

### Q: Hermes 支持吗？

A: 完全支持。CLI 会自动识别 `.hbc` 文件并正确打包。

### Q: 构建 APK 时看不到详细日志？

A: 已修复。`gradlew` 命令现在使用 `stdio: 'inherit'` 显示完整输出。

### Q: 输出文件名不规范？

A: 已修复。现在统一使用：
- Bundle: `appName_v1_0_27_ota.zip`
- APK: `appName_v1_0_27.apk`
- IPA: `appName_v1_0_27.ipa`
