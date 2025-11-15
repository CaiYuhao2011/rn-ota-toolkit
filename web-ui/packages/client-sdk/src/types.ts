/**
 * OTA SDK 类型定义
 */

export interface OTAConfig {
  serverUrl: string;
  appName: string;
  version: string;
  /** 开发环境服务器地址，用于替换 localhost，例如 '192.168.1.100' 或 '10.0.2.2' */
  devServerHost?: string;
  /** 框架 */
  framework?: 'bare' | 'expo';
}

export interface UpdateInfo {
  version: string;
  type: 'ota' | 'force';
  downloadUrl: string;
  description?: string;
  minAppVersion?: string;
  updateType?: string;
}

export interface ModalState {
  visible: boolean;
  title: string;
  message: string;
  progress: number;
  showProgress: boolean;
  onConfirm: (() => void) | null;
  onCancel: (() => void) | null;
  confirmText: string;
  cancelText: string;
  cancelable: boolean;
}

export interface DownloadOptions {
  fromUrl: string;
  toFile: string;
  progress?: (progress: { bytesWritten: number; contentLength: number }) => void;
}

export interface DownloadResult {
  jobId: number;
  promise: Promise<{ statusCode: number; bytesWritten: number }>;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  isFile: () => boolean;
  isDirectory: () => boolean;
}

export interface OTAAdapter {
  platform: string;
  isDownloading: boolean;
  documentDirectory: string;
  bundlePath: string;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  downloadFile(options: DownloadOptions): DownloadResult;
  unlink(path: string): Promise<void>;
  moveFile(from: string, to: string): Promise<void>;
  unzipFile(zipPath: string, targetPath: string): Promise<string>;
  readDir(path: string): Promise<FileInfo[]>;
  installApk?(path: string): Promise<void>;
  restart(): void;
  openAppStore?(url: string): void;
  preStartOtaUpdate(updateInfo: UpdateInfo): Promise<boolean>;
  downloadOtaUpdate(updateInfo: UpdateInfo, onProgress: (progress: number) => void): Promise<boolean>;
}
