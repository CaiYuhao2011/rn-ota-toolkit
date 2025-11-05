# OTA 原生配置

## Android (Java)

**修改 `android/app/src/main/java/.../MainApplication.java`：**

```java
import java.io.File; // 添加导入
import android.content.res.AssetManager;
import android.content.res.Resources;

public class MainApplication extends Application implements ReactApplication {
  private final ReactNativeHost mReactNativeHost =
      new DefaultReactNativeHost(this) {
        // ... 其他代码 ...

        // 添加这个方法 - 加载自定义 bundle
        @Override
        protected String getJSBundleFile() {
          File bundleFile = new File(getFilesDir(), "bundle/index.android.bundle");
          if (bundleFile.exists()) {
            return bundleFile.getAbsolutePath();
          }
          return super.getJSBundleFile();
        }

        // 添加这个方法 - 加载自定义 assets 目录
        @Override
        protected String getBundleAssetName() {
          File bundleFile = new File(getFilesDir(), "bundle/index.android.bundle");
          if (bundleFile.exists()) {
            // 返回 null 表示使用文件系统而不是 APK 内的 assets
            return null;
          }
          return super.getBundleAssetName();
        }
      };
}
```


## Android (Kotlin)

**修改 `android/app/src/main/java/.../MainApplication.kt`：**

```kotlin
import java.io.File

class MainApplication : Application(), ReactApplication {
  
  private val mReactNativeHost = object : DefaultReactNativeHost(this) {
    // ... 其他代码 ...

    // 添加这个方法 - 加载自定义 bundle
    override fun getJSBundleFile(): String? {
      val bundleFile = File(filesDir, "bundle/index.android.bundle")
      return if (bundleFile.exists()) {
        bundleFile.absolutePath
      } else {
        super.getJSBundleFile()
      }
    }

    // 添加这个方法 - 加载自定义 assets 目录
    override fun getBundleAssetName(): String? {
      val bundleFile = File(filesDir, "bundle/index.android.bundle")
      return if (bundleFile.exists()) {
        // 返回 null 表示使用文件系统而不是 APK 内的 assets
        null
      } else {
        super.getBundleAssetName()
      }
    }
  }
  
  override val reactNativeHost: ReactNativeHost
    get() = mReactNativeHost
}
```

## iOS

**修改 `ios/YourApp/AppDelegate.mm`：**

```objective-c
- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
  NSString *documentsDirectory = [paths objectAtIndex:0];
  NSString *bundlePath = [documentsDirectory stringByAppendingPathComponent:@"bundle/index.ios.bundle"];
  
  if ([[NSFileManager defaultManager] fileExistsAtPath:bundlePath]) {
    return [NSURL fileURLWithPath:bundlePath];
  }

#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}
```

> **iOS 资源路径说明**：
> 
> iOS 的 React Native 在加载 bundle 时，会自动在 bundle 文件的同级目录查找图片资源。资源会被放置在与 bundle 同级的目录中。

## 静态资源说明

OTA 更新会同时更新 bundle 和静态资源（图片、字体等）。

### 资源目录结构

更新后的文件结构：
```
DocumentDirectory/bundle/
  ├── index.android.bundle  (或 index.ios.bundle)
  ├── drawable-mdpi/        (Android 图片资源)
  ├── drawable-hdpi/
  ├── drawable-xhdpi/
  └── raw/                  (其他资源)
```

React Native 会自动从 bundle 同级目录查找 `drawable-*` 资源。

### 调试资源加载

如果资源加载有问题，可以使用调试方法检查：

```javascript
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

async function debugOTA() {
  const bundleDir = `${RNFS.DocumentDirectoryPath}/bundle`;
  const bundlePath = `${bundleDir}/index.${Platform.OS}.bundle`;
  
  console.log('Bundle 存在:', await RNFS.exists(bundlePath));
  
  // 检查资源目录
  const files = await RNFS.readDir(bundleDir);
  console.log('Bundle 目录内容:', files.map(f => f.name));
}
```

## 完成

配置完成，重新编译应用即可。如果遇到问题，请查看上述排查步骤。

