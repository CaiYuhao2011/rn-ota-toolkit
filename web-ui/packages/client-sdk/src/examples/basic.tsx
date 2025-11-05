/**
 * React Native OTA Client SDK 使用示例
 */
import React, { useEffect } from 'react';
import { View, Text, Button, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import OTAUpdater, { OTAUpdateModal, OTAProvider, adapter, ModalState } from 'rn-ota-client';
// Expo 项目使用: import OTAUpdater, { OTAUpdateModal, OTAProvider } from 'rn-ota-client/expo';

// 在 App 根组件外初始化
const otaUpdater = new OTAUpdater({
  serverUrl: 'http://192.168.1.100:10080',
  appName: 'MyApp',
  version: '1.0.0',
}, adapter);

function AppContent() {
  useEffect(() => {
    // 应用启动时自动检查更新
    handleCheckUpdate();
  }, []);

  const handleCheckUpdate = async () => {
    try {
      // 方式1：使用 SDK 自动检查更新（推荐）
      await otaUpdater.checkForUpdates();
      
      // 方式2：手动请求后调用（不推荐）
      // const response = await fetch(
      //   `http://192.168.1.100:10080/ota/check?appName=MyApp&platform=android&version=1.0.0`
      // );
      // const result = await response.json();
      // if (result.code === 200 && result.data) {
      //   const updateInfo = result.data;
      //   otaUpdater.showUpdate({
      //     version: updateInfo.version,
      //     type: updateInfo.updateType === 'full' ? 'force' : 'ota',
      //     downloadUrl: updateInfo.downloadUrl,
      //     description: updateInfo.description,
      //   });
      // }
    } catch (error) {
      console.error('检查更新失败:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>React Native OTA Example</Text>
      <Text style={styles.version}>当前版本: 1.0.0</Text>
      
      <Button title="手动检查更新" onPress={handleCheckUpdate} />
    </View>
  );
}

// ========== 方式1: 使用默认的更新弹窗 ==========
export default function App() {
  return (
    <OTAProvider>
      <AppContent />
    </OTAProvider>
  );
}

// ========== 方式2: 使用完全自定义的更新弹窗 ==========
// 自定义 Modal 组件
function CustomUpdateModal({
  visible,
  title,
  message,
  progress,
  showProgress,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  cancelable,
}: ModalState) {
  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={customStyles.overlay}>
        <View style={customStyles.container}>
          {/* 自定义样式的标题 */}
          <Text style={customStyles.title}>{title}</Text>
          
          {/* 自定义样式的消息 */}
          <Text style={customStyles.message}>{message}</Text>
          
          {/* 自定义进度条 */}
          {showProgress && (
            <View style={customStyles.progressContainer}>
              <View style={customStyles.progressBar}>
                <View 
                  style={[
                    customStyles.progressFill,
                    { width: `${Math.floor(progress * 100)}%` }
                  ]} 
                />
              </View>
              <Text style={customStyles.progressText}>
                {Math.floor(progress * 100)}%
              </Text>
            </View>
          )}
          
          {/* 自定义按钮 */}
          <View style={customStyles.buttonContainer}>
            {cancelable && onCancel && (
              <TouchableOpacity
                style={[customStyles.button, customStyles.cancelButton]}
                onPress={onCancel}
              >
                <Text style={customStyles.cancelButtonText}>
                  {cancelText || '取消'}
                </Text>
              </TouchableOpacity>
            )}
            {onConfirm && (
              <TouchableOpacity
                style={[customStyles.button, customStyles.confirmButton]}
                onPress={onConfirm}
              >
                <Text style={customStyles.confirmButtonText}>
                  {confirmText || '确定'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const customStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 25,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#cccccc',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  progressContainer: {
    marginBottom: 25,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#333333',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00ff88',
  },
  progressText: {
    marginTop: 10,
    fontSize: 14,
    color: '#00ff88',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#333333',
  },
  confirmButton: {
    backgroundColor: '#00ff88',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});

// 使用自定义 Modal 的 App
export function AppWithCustomModal() {
  return (
    <OTAProvider customModalComponent={CustomUpdateModal}>
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
