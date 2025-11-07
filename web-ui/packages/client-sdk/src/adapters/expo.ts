/**
 * Expo 适配器
 */
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { unzip } from 'react-native-zip-archive';
import RNRestart from 'react-native-restart';
import type { OTAAdapter, DownloadOptions, DownloadResult, FileInfo } from '../types';

const ExpoAdapter: OTAAdapter = {
  platform: Platform.OS,

  /**
   * 获取文档目录路径
   */
  get documentDirectory(): string {
    return FileSystem.documentDirectory || '';
  },

  /**
   * 检查文件是否存在
   */
  async exists(path: string): Promise<boolean> {
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
  async mkdir(path: string): Promise<void> {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  },

  /**
   * 下载文件
   */
  downloadFile({ fromUrl, toFile, progress }: DownloadOptions): DownloadResult {
    const callback = progress ? (downloadProgress: FileSystem.DownloadProgressData) => {
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

    const downloadPromise = downloadResumable.downloadAsync();
    
    return {
      jobId: Date.now(),
      promise: downloadPromise.then(result => {
        if (!result) {
          throw new Error('下载失败');
        }
        return {
          statusCode: result.status,
          bytesWritten: 0,
        };
      }),
    };
  },

  /**
   * 删除文件
   */
  async unlink(path: string): Promise<void> {
    await FileSystem.deleteAsync(path, { idempotent: true });
  },

  /**
   * 移动文件
   */
  async moveFile(from: string, to: string): Promise<void> {
    await FileSystem.moveAsync({ from, to });
  },

  /**
   * 解压 zip 文件
   */
  async unzipFile(zipPath: string, targetPath: string): Promise<string> {
    return await unzip(zipPath, targetPath);
  },

  /**
   * 读取目录
   */
  async readDir(path: string): Promise<FileInfo[]> {
    const files = await FileSystem.readDirectoryAsync(path);
    return files.map((name: string) => ({
      name,
      path: `${path}/${name}`,
      size: 0,
      isFile: () => true,
      isDirectory: () => false,
    }));
  },

  /**
   * 安装 APK
   */
  async installApk(path: string): Promise<void> {
    if (Platform.OS !== 'android') {
      throw new Error('仅支持 Android 平台');
    }
    
    console.log('[OTA] 开始安装 APK, path:', path);
    
    try {
      // 使用 getContentUriAsync 获取 content:// URI
      const contentUri = await FileSystem.getContentUriAsync(path);
      console.log('[OTA] 获取 content URI 成功:', contentUri);
      
      // 使用 IntentLauncher 打开安装界面
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        type: 'application/vnd.android.package-archive',
        flags: 0x10000000 | 0x00000001 | 0x00000002, // FLAG_ACTIVITY_NEW_TASK | FLAG_GRANT_READ_URI_PERMISSION | FLAG_GRANT_WRITE_URI_PERMISSION
      });
      
      console.log('[OTA] 安装界面已打开');
    } catch (error) {
      console.error('[OTA] 安装 APK 失败:', error);
      throw new Error(`安装 APK 失败: ${error}`);
    }
  },

  /**
   * 重启应用
   */
  restart(): void {
    // 使用 react-native-restart 真正重启应用
    // 这会触发应用完全重启，MainApplication.getJSBundleFile() 会重新执行
    RNRestart.restart();
  },
};

export default ExpoAdapter;
