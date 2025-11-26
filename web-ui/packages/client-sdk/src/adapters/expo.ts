/**
 * Expo 适配器
 */
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { unzip } from 'react-native-zip-archive';
import * as Updates from 'expo-updates';
import type { OTAAdapter, DownloadOptions, DownloadResult, FileInfo, UpdateInfo } from '../types';

const ExpoAdapter: OTAAdapter = {
  platform: Platform.OS,
  isDownloading: false,

  /**
   * 获取文档目录路径
   */
  get documentDirectory(): string {
    return FileSystem.documentDirectory || '';
  },

  get bundlePath(): string {
    return `${this.documentDirectory}bundle`;
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
    // 下载完成后立即重启应用以应用更新
    Updates.reloadAsync();
  },

  /**
   * 开始 OTA 更新
   */
  async preStartOtaUpdate() {
    try {
      if (__DEV__) {
          // DEV 绕过检查更新
          return false;
      }
      const update = await Updates.checkForUpdateAsync();
      console.log('[OTA] 获取到更新信息:', update);
      return update.isAvailable;
    } catch (err) {
      console.error('[OTA] 预检查失败:', err);
      return false;
    }
  },

  async downloadOtaUpdate(updateInfo: UpdateInfo, onProgress?: (progress: number) => void) {
    if (this.isDownloading) {
      throw new Error('正在下载中');
    }
    this.isDownloading = true;
    console.log('[OTA] 开始下载更新...');
    
    // 模拟进度条（Expo Updates API 不支持真实的下载进度回调）
    let progressInterval: NodeJS.Timeout | null = null;
    let simulatedProgress = 0;
    const maxSimulatedProgress = 0.9; // 最多模拟到 90%，等待真实下载完成
    
    if (onProgress) {
      // 初始进度
      onProgress(0);
      
      // 开始模拟进度：每 200ms 增长，逐渐减慢
      progressInterval = setInterval(() => {
        if (simulatedProgress < maxSimulatedProgress) {
          // 使用递减的增长速度，让进度条看起来更自然
          const increment = (maxSimulatedProgress - simulatedProgress) * 0.1;
          simulatedProgress = Math.min(
            simulatedProgress + increment,
            maxSimulatedProgress
          );
          onProgress(simulatedProgress);
        }
      }, 200);
    }
    
    try {
      // 下载更新
      const fetchResult = await Updates.fetchUpdateAsync();
      
      // 清除模拟进度的定时器
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      
      // 立即设置进度为 100%
      if (onProgress) {
        onProgress(1);
      }
      
      if (fetchResult.isNew) {
        console.log('更新下载完成，准备重启应用');
      } else {
        console.log('[OTA] 已经是最新版');
      }
      return true;
    } catch(error) {
      // 清除模拟进度的定时器
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      
      console.error('[OTA] 下载失败:', error);
      throw error;
    } finally {
      this.isDownloading = false;
    }
  }
};

export default ExpoAdapter;
