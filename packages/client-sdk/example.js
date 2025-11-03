import React, { useEffect, useRef } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import OTAUpdater, { OTAUpdateModal } from './index';

/**
 * 示例：如何使用 OTA 更新 SDK
 * 
 * 支持环境：
 * - React Native 原生项目
 * - Expo Managed 工作流
 * - Expo Bare 工作流
 */
const App = () => {
  const otaUpdaterRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    // 初始化 OTA 更新器
    otaUpdaterRef.current = new OTAUpdater({
      serverUrl: 'http://192.168.1.100:8080',
      appName: 'MyApp',
      version: '1.0.0',
    });

    // 绑定 Modal 组件
    otaUpdaterRef.current.setModalComponent(modalRef.current);

    // 实际使用场景：
    // 1. 通过推送通知接收新版本信息
    // 2. 从自定义接口获取版本信息
    // 3. 其他外部触发方式
  }, []);

  // 模拟 OTA 更新
  const handleCheckOtaUpdate = () => {
    const newVersionInfo = {
      version: '1.0.1',
      type: 'ota',
      downloadUrl: 'http://192.168.1.100:8080/bundles/MyApp_android_1.0.1.bundle',
      description: '修复了一些 bug\n优化了性能',
    };

    otaUpdaterRef.current.checkUpdate(newVersionInfo);
  };

  // 模拟强制更新（APK/IPA）
  const handleCheckForceUpdate = () => {
    const newVersionInfo = {
      version: '2.0.0',
      type: 'force',
      downloadUrl: 'http://192.168.1.100:8080/apk/MyApp_2.0.0.apk', // Android
      // downloadUrl: 'https://apps.apple.com/app/idXXXXXX', // iOS
      description: '新增重要功能\n需要更新到最新版本',
      minAppVersion: '1.5.0',
    };

    otaUpdaterRef.current.checkUpdate(newVersionInfo);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OTA 更新示例</Text>
      <Text style={styles.version}>当前版本: 1.0.0</Text>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="检查 OTA 更新" 
          onPress={handleCheckOtaUpdate} 
        />
        <View style={styles.spacer} />
        <Button 
          title="检查强制更新" 
          onPress={handleCheckForceUpdate}
          color="#ff6b6b"
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.infoText}>💡 提示：</Text>
        <Text style={styles.infoText}>• OTA 更新：仅更新 JS 代码</Text>
        <Text style={styles.infoText}>• 强制更新：下载安装 APK/IPA</Text>
        <Text style={styles.infoText}>• 自动环境检测（RN/Expo）</Text>
      </View>
      
      {/* 必须渲染 Modal 组件 */}
      <OTAUpdateModal ref={modalRef} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  version: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  spacer: {
    height: 15,
  },
  info: {
    marginTop: 40,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '100%',
    maxWidth: 300,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
});

export default App;

