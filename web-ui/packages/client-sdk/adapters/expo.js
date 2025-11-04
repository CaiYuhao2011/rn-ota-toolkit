/**
 * Expo 适配器
 */
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Updates from 'expo-updates';
import * as IntentLauncher from 'expo-intent-launcher';
import { unzip } from 'react-native-zip-archive';

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
   * 解压 zip 文件
   */
  async unzipFile(zipPath, targetPath) {
    return await unzip(zipPath, targetPath);
  },

  /**
   * 读取目录
   * 返回格式兼容 react-native-fs: { name: string }[]
   */
  async readDir(path) {
    const fileNames = await FileSystem.readDirectoryAsync(path);
    // 转换为与 react-native-fs 兼容的格式
    return fileNames.map(name => ({ name }));
  },

  /**
   * 安装 APK（调起系统安装程序）
   */
  async installApk(path) {
    if (Platform.OS !== 'android') {
      throw new Error('仅支持 Android 平台');
    }

    try {
      // 获取 content URI（Android 7.0+ 需要）
      const contentUri = await FileSystem.getContentUriAsync(path);

      // 调起系统安装程序
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/vnd.android.package-archive',
      });
    } catch (error) {
      throw new Error(`调起安装程序失败: ${error.message}`);
    }
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
