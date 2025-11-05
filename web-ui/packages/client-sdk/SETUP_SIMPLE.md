# React Native OTA 配置指南

## 1. 安装依赖

```bash
npm install rn-ota-client
# 或
yarn add rn-ota-client
```

## 2. Android 原生配置

### 2.1 修改 MainApplication

**Kotlin (MainApplication.kt):**

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
      // ... 其他配置 ...

      // OTA 支持：优先加载 OTA bundle，APK 升级时自动清理
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
        
        // 检查 OTA bundle
        val bundleFile = File(filesDir, "bundle/index.android.bundle")
        return if (bundleFile.exists()) {
          bundleFile.absolutePath
        } else {
          super.getJSBundleFile()
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

**Java (MainApplication.java):**

```java
package com.yourapp;

import android.app.Application;
import android.content.SharedPreferences;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.defaults.DefaultReactNativeHost;
import java.io.File;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost =
      new DefaultReactNativeHost(this) {
        // ... 其他配置 ...

        @Override
        protected String getJSBundleFile() {
          // 检测 APK 版本变化，自动清除旧 OTA
          SharedPreferences prefs = getSharedPreferences("OTA_CONFIG", MODE_PRIVATE);
          String currentVersion = BuildConfig.VERSION_NAME;
          String savedVersion = prefs.getString("apk_version", "");
          
          if (!currentVersion.equals(savedVersion)) {
            // APK 版本变化，删除旧 OTA
            deleteDirectory(new File(getFilesDir(), "bundle"));
            prefs.edit().putString("apk_version", currentVersion).apply();
            return super.getJSBundleFile();
          }
          
          // 检查 OTA bundle
          File bundleFile = new File(getFilesDir(), "bundle/index.android.bundle");
          if (bundleFile.exists()) {
            return bundleFile.getAbsolutePath();
          }
          return super.getJSBundleFile();
        }
        
        private void deleteDirectory(File dir) {
          if (dir.exists()) {
            File[] files = dir.listFiles();
            if (files != null) {
              for (File file : files) {
                if (file.isDirectory()) {
                  deleteDirectory(file);
                } else {
                  file.delete();
                }
              }
            }
            dir.delete();
          }
        }
      };
}
```

### 2.2 修改 AndroidManifest.xml

在 `android/app/src/main/AndroidManifest.xml` 添加：

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- 添加安装权限 -->
    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />

    <application
      android:name=".MainApplication"
      ... >
      
      <!-- 添加 FileProvider -->
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

### 2.3 创建 file_paths.xml

创建文件：`android/app/src/main/res/xml/file_paths.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<paths>
    <files-path name="files" path="." />
    <cache-path name="cache" path="." />
    <external-path name="external" path="." />
    <external-files-path name="external_files" path="." />
</paths>
```

## 3. 使用示例

```typescript
import React, { useEffect, useRef } from 'react';
import { View, Button, Text } from 'react-native';
import { OTAUpdater } from 'rn-ota-client';

function App() {
  const otaUpdaterRef = useRef<OTAUpdater>();

  useEffect(() => {
    // 初始化 OTA
    otaUpdaterRef.current = new OTAUpdater({
      updateUrl: 'https://your-server.com/api/ota/check',
      currentVersion: '1.0.0',
      onUpdateAvailable: (updateInfo) => {
        console.log('发现新版本:', updateInfo);
      },
      onDownloadProgress: (progress) => {
        console.log('下载进度:', progress);
      },
      onUpdateDownloaded: () => {
        console.log('下载完成');
      },
      onError: (error) => {
        console.error('更新失败:', error);
      },
    });

    // 自动检查更新
    otaUpdaterRef.current.checkForUpdates();
  }, []);

  const handleCheckUpdate = () => {
    otaUpdaterRef.current?.checkForUpdates();
  };

  return (
    <View>
      <Text>当前版本: 1.0.0</Text>
      <Button title="检查更新" onPress={handleCheckUpdate} />
    </View>
  );
}

export default App;
```

## 4. 更新流程说明

### 热更新流程（OTA）
1. 用户打开 App
2. 自动检查更新
3. 发现新版本 → 后台下载
4. 下载完成 → 提示用户重启
5. 重启后使用新版本

### 全量更新流程（APK）
1. 发现必须更新的新版本
2. 下载 APK (显示进度)
3. 下载完成 → 显示"立即安装"按钮
4. 用户点击 → 打开系统安装程序
5. 安装完成 → 使用新 APK

### APK 升级自动清理
- 安装新 APK 后，首次启动自动删除旧 OTA 更新
- 确保使用新 APK 内置的 bundle 和资源
- 无需手动清理

## 5. 目录结构

```
app_files/
└── bundle/
    ├── index.android.bundle      # JS bundle
    ├── drawable-mdpi/            # 图片资源
    ├── drawable-hdpi/
    ├── drawable-xhdpi/
    ├── drawable-xxhdpi/
    └── drawable-xxxhdpi/
```

## 6. 常见问题

**Q: OTA 更新后图片不见了？**
A: 确保 MainApplication 只重写了 `getJSBundleFile()`，不要重写 `getBundleAssetName()`

**Q: 安装新 APK 后还是显示旧版本？**
A: 已自动处理，新 APK 首次启动会清除旧 OTA

**Q: 全量更新下载后不弹出安装？**
A: 检查是否添加了 `REQUEST_INSTALL_PACKAGES` 权限和 FileProvider 配置

**Q: Android 7.0+ 无法安装？**
A: 必须配置 FileProvider，参考上面的配置

