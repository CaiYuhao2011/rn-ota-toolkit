/**
 * React Native 适配器
 */
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import RNRestart from 'react-native-restart';
import RNFetchBlob from 'react-native-blob-util';
import { unzip } from 'react-native-zip-archive';
import type { OTAAdapter, DownloadOptions, DownloadResult, FileInfo } from '../types';

const RNAdapter: OTAAdapter = {
  platform: Platform.OS,

  /**
   * 获取文档目录路径
   */
  get documentDirectory(): string {
    return RNFS.DocumentDirectoryPath + '/';
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
};

export default RNAdapter;
