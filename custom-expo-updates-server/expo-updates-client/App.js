import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Image, Alert, AppState } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useEffect, useRef, useCallback } from 'react';

export default function App() {
  const isCheckingRef = useRef(false);
  const hasShownAlertRef = useRef(false);
  const checkIntervalRef = useRef(null);

  const checkForUpdates = useCallback(async () => {
    // 防止重复检查
    if (isCheckingRef.current) {
      return;
    }

    // 检查更新是否启用
    if (!Updates.isEnabled) {
      console.log('expo-updates 未启用');
      return;
    }

    // 开发模式下跳过
    if (__DEV__) {
      console.log('开发模式，跳过更新检查');
      return;
    }

    try {
      isCheckingRef.current = true;
      console.log('开始检查更新...');

      // 检查是否有可用更新
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable && !hasShownAlertRef.current) {
        hasShownAlertRef.current = true;
        console.log('检测到新版本，显示更新提示');

        Alert.alert(
          '发现新版本',
          '检测到有新版本可用，是否立即更新？',
          [
            {
              text: '稍后',
              style: 'cancel',
              onPress: () => {
                hasShownAlertRef.current = false;
                isCheckingRef.current = false;
              },
            },
            {
              text: '立即更新',
              onPress: async () => {
                try {
                  console.log('开始下载更新...');
                  
                  // 下载更新
                  const fetchResult = await Updates.fetchUpdateAsync();
                  
                  if (fetchResult.isNew) {
                    console.log('更新下载完成，准备重启应用');
                    
                    // 下载完成后立即重启应用以应用更新
                    await Updates.reloadAsync();
                  } else {
                    Alert.alert('提示', '已是最新版本');
                    hasShownAlertRef.current = false;
                    isCheckingRef.current = false;
                  }
                } catch (error) {
                  console.error('下载更新失败:', error);
                  Alert.alert('更新失败', error.message || '下载更新时出现错误，请检查网络连接后重试');
                  hasShownAlertRef.current = false;
                  isCheckingRef.current = false;
                }
              },
            },
          ],
          { cancelable: false }
        );
      } else {
        console.log('已是最新版本');
        isCheckingRef.current = false;
      }
    } catch (error) {
      console.error('检查更新失败:', error);
      isCheckingRef.current = false;
      // 检查失败不弹窗，避免打扰用户
    }
  }, []);

  useEffect(() => {
    // 应用启动时检查更新
    checkForUpdates();

    // 设置定时检查更新（每5分钟检查一次）
    const CHECK_INTERVAL = 5 * 60 * 1000; // 5分钟
    checkIntervalRef.current = setInterval(() => {
      // 只在应用处于前台时检查
      if (AppState.currentState === 'active') {
        hasShownAlertRef.current = false; // 重置标记，允许再次提示
        checkForUpdates();
      }
    }, CHECK_INTERVAL);

    // 监听应用状态变化
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // 应用从后台回到前台时立即检查更新
        hasShownAlertRef.current = false;
        checkForUpdates();
      }
    });

    return () => {
      // 清理定时器和监听器
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      subscription.remove();
    };
  }, [checkForUpdates]);

  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app 2222!</Text>
      <Text>{Constants.expoConfig.name}</Text>
      <Text>当前版本 ID: {Updates.updateId || '开发版本'}</Text>
      <Text>更新状态: {Updates.isEnabled ? '已启用' : '未启用'}</Text>
      <Image source={require('./assets/favicon.png')} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
