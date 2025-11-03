/**
 * Expo 适配器
 */
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Updates from 'expo-updates';

const ExpoAdapter = {
  platform: Platform.OS,

  /**
   * 获取文档目录路径
   */
  get documentDirectory() {
    return FileSystem.documentDirectory;
  },

  /**
   * 检查文件是否存在
   */
  async exists(path) {
    try {
      const info = await FileSystem.getInfoAsync(path);
      return info.exists;
    } catch {
      return false;
    }
  },

  /**
   * 创建目录
   */
  async mkdir(path) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  },

  /**
   * 下载文件
   */
  async downloadFile({ fromUrl, toFile, progress }) {
    const callback = progress ? (downloadProgress) => {
      const totalBytesWritten = downloadProgress.totalBytesWritten;
      const totalBytesExpectedToWrite = downloadProgress.totalBytesExpectedToWrite;
      if (totalBytesExpectedToWrite > 0) {
        progress({
          bytesWritten: totalBytesWritten,
          contentLength: totalBytesExpectedToWrite,
        });
      }
    } : undefined;

    const downloadResumable = FileSystem.createDownloadResumable(
      fromUrl,
      toFile,
      {},
      callback
    );

    const result = await downloadResumable.downloadAsync();
    
    return {
      promise: Promise.resolve({
        statusCode: result.status || 200,
      }),
    };
  },

  /**
   * 删除文件
   */
  async unlink(path) {
    await FileSystem.deleteAsync(path, { idempotent: true });
  },

  /**
   * 移动文件
   */
  async moveFile(from, to) {
    await FileSystem.moveAsync({ from, to });
  },

  /**
   * 安装 APK（Expo 不支持，需要使用原生模块）
   */
  async installApk(path) {
    throw new Error('Expo 不支持直接安装 APK，请使用 expo-build 构建独立应用');
  },

  /**
   * 重启应用
   */
  async restart() {
    if (Updates.reloadAsync) {
      await Updates.reloadAsync();
    } else {
      throw new Error('Updates.reloadAsync 不可用');
    }
  },
};

export default ExpoAdapter;
