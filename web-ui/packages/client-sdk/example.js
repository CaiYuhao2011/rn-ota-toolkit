/**
 * React Native OTA Client SDK 使用示例
 */
import React, { useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import OTAUpdater, { OTAUpdateModal, OTAProvider } from 'rn-ota-client';
// Expo 项目使用: import OTAUpdater, { OTAUpdateModal, OTAProvider } from 'rn-ota-client/expo';

// 在 App 根组件外初始化
const otaUpdater = new OTAUpdater({
  serverUrl: 'http://192.168.1.100:8080',
  appName: 'MyApp',
  version: '1.0.0',
});

function AppContent() {
  useEffect(() => {
    // 应用启动时检查更新
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      const response = await fetch(
        `http://192.168.1.100:8080/ota/check?appName=MyApp&platform=android&version=1.0.0`
      );
      const result = await response.json();

      if (result.code === 200 && result.data) {
        const updateInfo = result.data;
        
        // 调用 SDK 处理更新
        otaUpdater.checkUpdate({
          version: updateInfo.version,
          type: updateInfo.updateType === 'full' ? 'force' : 'ota',
          downloadUrl: updateInfo.downloadUrl,
          description: updateInfo.description,
          minAppVersion: updateInfo.minAppVersion,
        });
      }
    } catch (error) {
      console.error('检查更新失败:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>React Native OTA Example</Text>
      <Text style={styles.version}>当前版本: 1.0.0</Text>
      
      <Button title="手动检查更新" onPress={checkForUpdates} />
      
      {/* OTA 更新弹窗 */}
      <OTAUpdateModal />
    </View>
  );
}

export default function App() {
  return (
    <OTAProvider>
      <AppContent />
    </OTAProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});
