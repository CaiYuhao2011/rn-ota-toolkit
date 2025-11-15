/**
 * React Native 适配器
 */
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import RNRestart from 'react-native-restart';
import RNFetchBlob from 'react-native-blob-util';
import { unzip } from 'react-native-zip-archive';
import type { OTAAdapter, FileInfo, UpdateInfo } from '../types';

const RNAdapter: OTAAdapter = {
  platform: Platform.OS,
  isDownloading: false,

  /**
   * 获取文档目录路径
   */
  get documentDirectory(): string {
    return RNFS.DocumentDirectoryPath + '/';
  },

  get bundlePath(): string {
    return `${this.documentDirectory}bundle`;
  },

  /**
   * 检查文件是否存在
   */
  async exists(path: string): Promise<boolean> {
    return await RNFS.exists(path);
  },

  /**
   * 创建目录
   */
  async mkdir(path: string): Promise<void> {
    await RNFS.mkdir(path);
  },

  /**
   * 下载文件
   */
  downloadFile({ fromUrl, toFile, progress }) {
    console.log('[Adapter] downloadFile 调用, fromUrl:', fromUrl, 'toFile:', toFile);
    const result = RNFS.downloadFile({
      fromUrl,
      toFile,
      progress,
    });
    console.log('[Adapter] RNFS.downloadFile 成功, jobId:', result.jobId);
    return result;
  },

  /**
   * 删除文件
   */
  async unlink(path: string): Promise<void> {
    await RNFS.unlink(path);
  },

  /**
   * 移动文件
   */
  async moveFile(from: string, to: string): Promise<void> {
    await RNFS.moveFile(from, to);
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
    return await RNFS.readDir(path) as FileInfo[];
  },

  /**
   * 安装 APK（调起系统安装程序）
   */
  async installApk(path: string): Promise<void> {
    if (Platform.OS !== 'android') {
      throw new Error('仅支持 Android 平台');
    }
    // 调起系统安装程序，用户手动点击安装
    await RNFetchBlob.android.actionViewIntent(path, 'application/vnd.android.package-archive');
  },

  /**
   * 重启应用
   */
  restart(): void {
    RNRestart.restart();
  },

  /**
   * 预检查OTA 更新
   * @returns Boolean
   */
  async preStartOtaUpdate() {
    return Promise.resolve(true);
  },

  async downloadOtaUpdate(updateInfo: UpdateInfo, onProgress?: (progress: number) => void) {
    console.log('[OTA] downloadOtaUpdate 开始, url:', updateInfo.downloadUrl);
    if (this.isDownloading) {
      throw new Error('正在下载中');
    }

    this.isDownloading = true;

    const tempZipFile = `${this.bundlePath}/temp.zip`;
    const tempExtractDir = `${this.bundlePath}/temp_extract`;

    try {
      // 下载 zip 文件
      console.log('[OTA] 开始下载文件到:', tempZipFile);
      const download = this.downloadFile({
        fromUrl: updateInfo.downloadUrl,
        toFile: tempZipFile,
        progress: (res) => {
          if (onProgress) {
            // 下载占 70% 进度
            onProgress((res.bytesWritten / res.contentLength) * 0.7);
          }
        },
      });

      const downloadResult = await download.promise;

      if (downloadResult.statusCode !== 200) {
        throw new Error(`下载失败: HTTP ${downloadResult.statusCode}`);
      }

      // 解压 zip 文件
      if (onProgress) {
        onProgress(0.75);
      }

      const extractDirExists = await this.exists(tempExtractDir);
      if (extractDirExists) {
        await this.unlink(tempExtractDir);
      }
      await this.mkdir(tempExtractDir);

      await this.unzipFile(tempZipFile, tempExtractDir);

      if (onProgress) {
        onProgress(0.85);
      }

      // 查找解压后的 bundle 文件（支持 .bundle 和 .hbc Hermes bytecode）
      const files = await this.readDir(tempExtractDir);
      const bundleFile = files.find(f => 
        f.name && (f.name.includes('.bundle') || f.name.endsWith('.hbc'))
      );
      
      if (!bundleFile) {
        throw new Error('解压后未找到 bundle 文件（.bundle 或 .hbc）');
      }

      const extractedBundlePath = `${tempExtractDir}/${bundleFile.name}`;

      // 清空整个 bundle 目录（删除所有旧文件和目录）
      // 这样可以清理旧的 bundle、assets、drawable-* 等所有内容
      // 注意：跳过临时文件（temp.zip 和 temp_extract）
      const bundleDirExists = await this.exists(this.bundlePath);
      if (bundleDirExists) {
        const oldFiles = await this.readDir(this.bundlePath);
        for (const oldFile of oldFiles) {
          // 跳过临时文件
          if (oldFile.name === 'temp.zip' || oldFile.name === 'temp_extract') {
            continue;
          }
          
          const oldPath = `${this.bundlePath}/${oldFile.name}`;
          try {
            await this.unlink(oldPath);
          } catch (err) {
            // 忽略删除错误，继续
          }
        }
      }

      // 移动新的 bundle 文件（保留原始文件名，包括 .hbc 扩展名）
      const targetBundlePath = `${this.bundlePath}/${bundleFile.name}`;
      console.log('[OTA] 移动 bundle 文件:', extractedBundlePath, '→', targetBundlePath);
      await this.moveFile(extractedBundlePath, targetBundlePath);
      console.log('[OTA] bundle 文件移动成功');

      // 移动所有资源文件
      // Expo: 扁平化的哈希文件名（assets）
      // RN: drawable-*/raw 目录
      const extractedFiles = await this.readDir(tempExtractDir);
      console.log('[OTA] 解压目录文件数量:', extractedFiles.length);
      
      let movedCount = 0;
      for (const file of extractedFiles) {
        // 跳过已经移动的 bundle 文件
        if (file.name === bundleFile.name) {
          continue;
        }
        
        // 移动所有文件和目录（assets + drawable-* + raw）
        const from = `${tempExtractDir}/${file.name}`;
        const to = `${this.bundlePath}/${file.name}`;
        const fromExists = await this.exists(from);
        if (fromExists) {
          await this.moveFile(from, to);
          movedCount++;
        }
      }
      console.log('[OTA] 已移动', movedCount, '个资源文件');

      if (onProgress) {
        onProgress(0.95);
      }

      // 清理临时文件
      await this.unlink(tempZipFile);
      const tempDirExists = await this.exists(tempExtractDir);
      if (tempDirExists) {
        await this.unlink(tempExtractDir);
      }

      if (onProgress) {
        onProgress(1);
      }

      return true;
    } catch (error) {
      console.error('[OTA] 下载失败:', error);
      
      // 清理临时文件
      try {
        const zipExists = await this.exists(tempZipFile);
        if (zipExists) {
          await this.unlink(tempZipFile);
        }
        const extractDirExists = await this.exists(tempExtractDir);
        if (extractDirExists) {
          await this.unlink(tempExtractDir);
        }
      } catch (cleanupError) {
        console.error('[OTA] 清理临时文件失败:', cleanupError);
      }

      throw error;
    } finally {
      this.isDownloading = false;
    }
  }
};

export default RNAdapter;
