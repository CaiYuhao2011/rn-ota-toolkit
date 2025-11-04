# OTA 原生配置

## Android

**修改 `android/app/src/main/java/.../MainApplication.java`：**

```java
import java.io.File; // 添加导入

public class MainApplication extends Application implements ReactApplication {
  private final ReactNativeHost mReactNativeHost =
      new DefaultReactNativeHost(this) {
        // ... 其他代码 ...

        // 添加这个方法
        @Override
        protected String getJSBundleFile() {
          File bundleFile = new File(getFilesDir(), "bundle/index.android.bundle");
          if (bundleFile.exists()) {
            return bundleFile.getAbsolutePath();
          }
          return super.getJSBundleFile();
        }
      };
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

## 完成

配置完成，重新编译应用即可。

