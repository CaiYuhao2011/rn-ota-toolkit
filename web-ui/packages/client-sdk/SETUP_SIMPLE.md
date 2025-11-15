# React Native OTA 配置指南

本指南提供 React Native 和 Expo 项目的 OTA 配置方法。

## 项目类型说明

| 项目类型 | 配置方式 | 说明 |
|---------|---------|------|
| **React Native (Bare)** | 手动配置原生代码 | 直接修改 `MainApplication` 和 `AppDelegate` |
| **Expo Development Build** | Config Plugin 自动配置 | 使用插件自动注入，支持重复 prebuild |
| **Expo Managed** | 不支持 | 无法访问原生代码 |

---

## 方案一：React Native 项目（手动配置）

### 1. 安装依赖

```bash
npm install rn-ota-client react-native-fs react-native-restart react-native-blob-util react-native-zip-archive
cd ios && pod install
```

### 2. Android 配置

#### 2.1 修改 MainApplication.kt

文件路径：`android/app/src/main/java/com/yourapp/MainApplication.kt`

```kotlin
package com.yourapp

import android.app.Application
import android.content.Context
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.defaults.DefaultReactNativeHost
import java.io.File

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
    object : DefaultReactNativeHost(this) {
      // ... 其他配置保持不变 ...

      // OTA 支持：优先加载自定义 bundle
      override fun getJSBundleFile(): String? {
        // 检测 APK 版本变化，自动清除旧 OTA
        val prefs = getSharedPreferences("OTA_CONFIG", Context.MODE_PRIVATE)
        val currentVersion = BuildConfig.VERSION_NAME
        val savedVersion = prefs.getString("apk_version", "")
        
        if (currentVersion != savedVersion) {
          // APK 版本变化，删除旧 OTA
          val otaDir = File(filesDir, "bundle")
          deleteDirectory(otaDir)
          prefs.edit().putString("apk_version", currentVersion).apply()
          return super.getJSBundleFile()
        }
        
        // 检查 OTA bundle（支持 Hermes .hbc 格式）
        val hbcFile = File(filesDir, "bundle/index.android.bundle.hbc")
        val bundleFile = File(filesDir, "bundle/index.android.bundle")
        
        return when {
          hbcFile.exists() -> hbcFile.absolutePath
          bundleFile.exists() -> bundleFile.absolutePath
          else -> super.getJSBundleFile()
        }
      }
      
      private fun deleteDirectory(dir: File) {
        if (dir.exists()) {
          dir.listFiles()?.forEach { file ->
            if (file.isDirectory) {
              deleteDirectory(file)
            } else {
              file.delete()
            }
          }
          dir.delete()
        }
      }
    }
}
```

#### 2.2 修改 AndroidManifest.xml

文件路径：`android/app/src/main/AndroidManifest.xml`

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- 添加安装权限 -->
    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />

    <application
      android:name=".MainApplication"
      ... >
      
      <!-- 添加 FileProvider（用于 APK 安装） -->
      <provider
        android:name="androidx.core.content.FileProvider"
        android:authorities="${applicationId}.fileprovider"
        android:exported="false"
        android:grantUriPermissions="true">
        <meta-data
          android:name="android.support.FILE_PROVIDER_PATHS"
          android:resource="@xml/file_paths" />
      </provider>

      <activity ... />
    </application>
</manifest>
```

#### 2.3 创建 file_paths.xml

文件路径：`android/app/src/main/res/xml/file_paths.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<paths>
    <files-path name="files" path="." />
    <cache-path name="cache" path="." />
    <external-path name="external" path="." />
    <external-files-path name="external_files" path="." />
</paths>
```

### 3. iOS 配置

#### 3.1 修改 AppDelegate.mm

文件路径：`ios/YourApp/AppDelegate.mm`

在 `sourceURLForBridge:` 方法中添加 OTA 支持：

```objective-c
- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  // OTA 支持：检查自定义 bundle
  NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
  NSString *documentsDirectory = [paths objectAtIndex:0];
  NSString *otaBundlePath = [documentsDirectory stringByAppendingPathComponent:@"bundle/index.ios.bundle"];
  
  NSFileManager *fileManager = [NSFileManager defaultManager];
  if ([fileManager fileExistsAtPath:otaBundlePath]) {
    return [NSURL fileURLWithPath:otaBundlePath];
  }
  
  // 回退到默认 bundle
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}
```

---

## 方案二：Expo Development Build（Config Plugin）

### 1. 安装依赖

```bash
npm install rn-ota-client expo-file-system expo-intent-launcher react-native-zip-archive
```

### 2. 应用配置

```bash
# 应用 Config Plugin
npx expo prebuild

# 或者在构建时自动应用（EAS Build）
eas build --platform android
```

### 3. Expo 特别说明

**何时需要 prebuild：**
- ✅ 首次添加 Config Plugin
- ✅ 修改了 `app.json` 的 `plugins` 数组
- ✅ 添加或删除了需要原生配置的包
- ❌ 日常代码修改不需要

**EAS Build 说明：**
- EAS Build 会在云端自动执行 `expo prebuild`
- Config Plugin 会自动应用，无需手动操作
- 本地的 `android/ios` 目录可以不提交到 git

**本地构建流程：**
```bash
# CLI 工具会自动执行 prebuild
npm run release:prod

# 或手动构建
npx expo prebuild
npx expo run:android --variant release
```

---

## 使用示例

### React Native 项目

```javascript
import OTAUpdater, { OTAProvider } from 'rn-ota-client';

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

### Expo 项目

```javascript
import OTAUpdater, { OTAProvider, adapter } from 'rn-ota-client/expo';

const otaUpdater = new OTAUpdater({
  serverUrl: 'http://192.168.1.100:10080',
  appName: 'MyApp',
  version: '1.0.0'
}, adapter);  // 传入 Expo 适配器

export default function App() {
  return (
    <OTAProvider>
      <YourApp />
    </OTAProvider>
  );
}
```

---

## 更新流程说明

### OTA 热更新（Bundle 更新）
1. 应用启动，检查更新
2. 发现新版本 → 下载 bundle 和 assets 到 `files/bundle/`
3. 下载完成 → 提示重启
4. 重启后，`getJSBundleFile()` 返回自定义 bundle 路径
5. React Native 加载新 bundle

### APK 全量更新
1. 发现强制更新 → 下载 APK
2. 下载完成 → 提示安装
3. 用户安装新 APK
4. 新 APK 首次启动：
   - 检测到版本号变化
   - 自动删除 `files/bundle/` 目录
   - 使用 APK 内置的 bundle

### 目录结构

```
app_files/bundle/
├── index.android.bundle      # JS bundle
├── index.android.bundle.hbc  # Hermes 字节码（如果启用）
└── drawable-*/               # 图片资源
    ├── drawable-mdpi/
    ├── drawable-hdpi/
    ├── drawable-xhdpi/
    ├── drawable-xxhdpi/
    └── drawable-xxxhdpi/
```

---

## 常见问题

### React Native 项目

**Q: OTA 更新后图片不见了？**
A: 只重写 `getJSBundleFile()`，不要重写 `getBundleAssetName()`。

**Q: Hermes 支持吗？**
A: 支持，代码会自动检测 `.hbc` 文件。

**Q: 安装新 APK 后还是旧版本？**
A: 已自动处理，首次启动会清除旧 OTA。

### Expo 项目

**Q: Expo Managed 可以用吗？**
A: 不可以，必须是 Development Build（有 `android/ios` 目录）。

**Q: 每次 prebuild 都要重新配置吗？**
A: 不需要，Config Plugin 每次 prebuild 都会自动注入。

**Q: EAS Build 支持吗？**
A: 完全支持，EAS 会在云端自动应用 Config Plugin。

**Q: 如何检查配置是否生效？**
A: 查看 `android/app/src/main/java/.../MainApplication.kt`，搜索 `OTA_BUNDLE_LOADER_INJECTED` 标记。

---

## 完成

配置完成后，应用将支持 OTA 热更新和 APK 全量更新。
