/**
 * OTA 核心逻辑
 */
import { Linking, NativeModules, Platform } from 'react-native';
import React, { ComponentType } from 'react';
import UpdateModal from './UpdateModal';
import { OTAProvider as OTAProviderBase, useOTAContext, modalEmitter } from './OTAContext';
import type { OTAConfig, UpdateInfo, ModalState, OTAAdapter } from './types';

export class OTAUpdater {
  serverUrl: string;
  appName: string;
  version: string;
  platform: string;
  bundlePath: string;
  bundleFile: string;
  isDownloading: boolean;
  adapter!: OTAAdapter;
  devServerHost?: string;
 
  constructor(config: OTAConfig, adapter: OTAAdapter) {
    this.adapter = adapter;
    this.serverUrl = config.serverUrl;
    this.appName = config.appName;
    this.version = config.version;
    this.devServerHost = config.devServerHost;
    
    this.platform = adapter.platform;
    this.bundlePath = `${adapter.documentDirectory}bundle`;
    this.bundleFile = `${this.bundlePath}/index.${this.platform}.bundle`;
    
    this.isDownloading = false;

    this.init();
  }

  private async init(): Promise<void> {
    try {
      const exists = await this.adapter.exists(this.bundlePath);
      if (!exists) {
        await this.adapter.mkdir(this.bundlePath);
      }
    } catch (error) {
      console.error('[OTA] 初始化失败:', error);
    }
  }

  private updateModal(state: Partial<ModalState>): void {
    modalEmitter.emit(state);
  }

  /**
   * 将 localhost URL 转换为开发服务器地址
   */
  private convertLocalhostUrl(url: string): string {
    if (this.devServerHost && (url.includes('localhost') || url.includes('127.0.0.1'))) {
      return url
        .replace('localhost', this.devServerHost)
        .replace('127.0.0.1', this.devServerHost);
    }
    return url;
  }

  /**
   * 检查更新（自动请求服务器）
   * @returns 返回版本信息，如果没有更新则返回 null
   */
  async checkForUpdates(): Promise<any | null> {
    try {
      const url = `${this.serverUrl}/ota/check?appName=${this.appName}&platform=${this.platform}&version=${this.version}`;
      const response = await fetch(url);
      const result = await response.json();
      console.log('[OTA] 服务器返回:', result.code);

      if (result.code === 200 && result.data) {
        const updateInfo = result.data;
        
        // 自动显示更新弹窗
        this.showUpdate({
          version: updateInfo.version,
          type: updateInfo.updateType === 'full' ? 'force' : 'ota',
          downloadUrl: updateInfo.downloadUrl,
          description: updateInfo.description,
          minAppVersion: updateInfo.minAppVersion,
        });

        return updateInfo;
      }

      return null;
    } catch (error) {
      console.error('[OTA] 检查更新失败:', error);
      throw error;
    }
  }

  /**
   * 显示更新弹窗（手动传入版本信息）
   * @param updateInfo - 版本信息
   */
  showUpdate(updateInfo: UpdateInfo): void {
    if (!updateInfo || !updateInfo.version) {
      return;
    }

    if (updateInfo.version <= this.version) {
      return;
    }

    if (updateInfo.type === 'force') {
      this.showForceUpdateDialog(updateInfo);
    } else {
      this.showOtaUpdateDialog(updateInfo);
    }
  }

  /**
   * @deprecated 使用 showUpdate 代替
   * 为保持向后兼容而保留
   */
  checkUpdate(updateInfo: UpdateInfo): void {
    console.warn('[OTA] checkUpdate 已废弃，请使用 checkForUpdates() 自动检查更新，或使用 showUpdate(updateInfo) 手动显示更新');
    return this.showUpdate(updateInfo);
  }

  private showOtaUpdateDialog(updateInfo: UpdateInfo): void {
    this.updateModal({
      visible: true,
      title: '发现新版本',
      message: `版本 ${updateInfo.version}\n${updateInfo.description || ''}`,
      showProgress: false,
      progress: 0,
      confirmText: '立即更新',
      cancelText: '稍后',
      cancelable: true,
      onConfirm: async () => {
        try {
          await this.startOtaUpdate(updateInfo);
        } catch (error) {
          console.error('[OTA] onConfirm 错误:', error);
          this.updateModal({
            visible: true,
            title: '错误',
            message: (error as Error).message || '启动更新失败',
            confirmText: '确定',
            onConfirm: () => this.updateModal({ visible: false }),
          });
        }
      },
      onCancel: () => this.updateModal({ visible: false }),
    });
  }

  private async startOtaUpdate(updateInfo: UpdateInfo): Promise<void> {
    console.log('[OTA] 开始 OTA 更新');
    this.updateModal({
      visible: true,
      title: '正在更新',
      showProgress: true,
      progress: 0,
      message: '正在下载更新...',
      onConfirm: null,
      onCancel: null,
      cancelable: false,
    });

    try {
      console.log('[OTA] 调用 downloadOtaUpdate');
      await this.downloadOtaUpdate(updateInfo, (progress: number) => {
        this.updateModal({ progress });
      });
      console.log('[OTA] downloadOtaUpdate 完成');

      this.updateModal({
        visible: true,
        showProgress: false,
        title: '更新成功',
        message: '请重启应用以应用更新',
        confirmText: '立即重启',
        cancelText: '稍后',
        cancelable: true,
        onConfirm: () => {
          this.updateModal({ visible: false });
          this.restart();
        },
        onCancel: () => this.updateModal({ visible: false }),
      });
    } catch (error) {
      console.error('[OTA] 更新失败:', error);
      this.updateModal({
        visible: true,
        showProgress: false,
        title: '更新失败',
        message: (error as Error).message || '下载失败，请稍后重试',
        confirmText: '确定',
        cancelText: '',
        cancelable: true,
        onConfirm: () => this.updateModal({ visible: false }),
        onCancel: () => this.updateModal({ visible: false }),
      });
    }
  }

  private showForceUpdateDialog(updateInfo: UpdateInfo): void {
    if (this.adapter.installApk) {
      // Android 整包更新
      const message = updateInfo.description
        ? `版本 ${updateInfo.version}\n需要下载安装包进行更新\n\n${updateInfo.description}`
        : `版本 ${updateInfo.version}\n需要下载安装包进行更新`;
      
      this.updateModal({
        visible: true,
        title: '发现新版本',
        message: message,
        showProgress: false,
        progress: 0,
        confirmText: '立即更新',
        cancelText: '',
        cancelable: false,
        onConfirm: async () => {
          try {
            await this.startForceUpdate(updateInfo);
          } catch (error) {
            console.error('[OTA] 更新失败:', error);
            this.updateModal({
              visible: true,
              title: '更新失败',
              message: (error as Error).message || '下载失败，请稍后重试',
              confirmText: '确定',
              cancelText: '',
              cancelable: true,
              onConfirm: () => this.updateModal({ visible: false }),
            });
          }
        },
      });
    } else {
      // iOS 或其他平台，跳转应用商店
      this.updateModal({ visible: false });
      this.openAppStore(updateInfo.downloadUrl);
    }
  }

  private async startForceUpdate(updateInfo: UpdateInfo): Promise<void> {
    this.updateModal({
      visible: true,
      title: '正在更新',
      showProgress: true,
      progress: 0,
      message: '正在下载安装包...',
      onConfirm: null,
      onCancel: null,
      cancelable: false,
    });

    try {
      const apkPath = await this.downloadApk(updateInfo, (progress: number) => {
        this.updateModal({ progress });
      });

      // 下载完成，等待用户确认安装
      this.updateModal({
        visible: true,
        showProgress: false,
        title: '下载完成',
        message: '安装包已下载完成，点击立即安装',
        confirmText: '立即安装',
        cancelText: '',
        cancelable: false,
        onConfirm: async () => {
          this.updateModal({ visible: false });
          await this.adapter.installApk!(apkPath);
        },
        onCancel: null,
      });
    } catch (error) {
      console.error('[OTA] 安装包下载失败:', error);
      throw error;
    }
  }

  async downloadOtaUpdate(updateInfo: UpdateInfo, onProgress?: (progress: number) => void): Promise<boolean> {
    console.log('[OTA] downloadOtaUpdate 开始, url:', updateInfo.downloadUrl);
    if (this.isDownloading) {
      throw new Error('正在下载中');
    }

    this.isDownloading = true;

    const tempZipFile = `${this.bundlePath}/temp.zip`;
    const tempExtractDir = `${this.bundlePath}/temp_extract`;

    try {
      // 转换 localhost URL
      const downloadUrl = this.convertLocalhostUrl(updateInfo.downloadUrl);
      console.log('[OTA] 转换后的 URL:', downloadUrl);
      
      // 下载 zip 文件
      console.log('[OTA] 开始下载文件到:', tempZipFile);
      const download = this.adapter.downloadFile({
        fromUrl: downloadUrl,
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

      const extractDirExists = await this.adapter.exists(tempExtractDir);
      if (extractDirExists) {
        await this.adapter.unlink(tempExtractDir);
      }
      await this.adapter.mkdir(tempExtractDir);

      await this.adapter.unzipFile(tempZipFile, tempExtractDir);

      if (onProgress) {
        onProgress(0.85);
      }

      // 查找解压后的 bundle 文件（支持 .bundle 和 .hbc Hermes bytecode）
      const files = await this.adapter.readDir(tempExtractDir);
      const bundleFile = files.find(f => 
        f.name && (f.name.includes('.bundle') || f.name.endsWith('.hbc'))
      );
      
      if (!bundleFile) {
        throw new Error('解压后未找到 bundle 文件（.bundle 或 .hbc）');
      }

      const extractedBundlePath = `${tempExtractDir}/${bundleFile.name}`;

      // 删除旧的 bundle
      const oldBundleExists = await this.adapter.exists(this.bundleFile);
      if (oldBundleExists) {
        await this.adapter.unlink(this.bundleFile);
      }

      // 删除旧的 drawable-* 目录（与 bundle 同级）
      const drawableDirs = ['drawable-mdpi', 'drawable-hdpi', 'drawable-xhdpi', 'drawable-xxhdpi', 'drawable-xxxhdpi', 'raw'];
      for (const dir of drawableDirs) {
        const oldDrawableDir = `${this.bundlePath}/${dir}`;
        const exists = await this.adapter.exists(oldDrawableDir);
        if (exists) {
          await this.adapter.unlink(oldDrawableDir);
        }
      }

      // 移动新的 bundle 文件
      await this.adapter.moveFile(extractedBundlePath, this.bundleFile);

      // 移动解压目录中的 drawable-* 等资源目录到 bundle 同级目录
      // 注意：现在 zip 中 drawable-* 已经在根目录，不在 assets 子目录中了
      const extractedFiles = await this.adapter.readDir(tempExtractDir);
      for (const file of extractedFiles) {
        if (file.name && (file.name.startsWith('drawable-') || file.name === 'raw')) {
          const from = `${tempExtractDir}/${file.name}`;
          const to = `${this.bundlePath}/${file.name}`;
          const fromExists = await this.adapter.exists(from);
          if (fromExists) {
            await this.adapter.moveFile(from, to);
          }
        }
      }

      if (onProgress) {
        onProgress(0.95);
      }

      // 清理临时文件
      await this.adapter.unlink(tempZipFile);
      const tempDirExists = await this.adapter.exists(tempExtractDir);
      if (tempDirExists) {
        await this.adapter.unlink(tempExtractDir);
      }

      if (onProgress) {
        onProgress(1);
      }

      return true;
    } catch (error) {
      console.error('[OTA] 下载失败:', error);
      
      // 清理临时文件
      try {
        const zipExists = await this.adapter.exists(tempZipFile);
        if (zipExists) {
          await this.adapter.unlink(tempZipFile);
        }
        const extractDirExists = await this.adapter.exists(tempExtractDir);
        if (extractDirExists) {
          await this.adapter.unlink(tempExtractDir);
        }
      } catch (cleanupError) {
        console.error('[OTA] 清理临时文件失败:', cleanupError);
      }

      throw error;
    } finally {
      this.isDownloading = false;
    }
  }

  async downloadApk(updateInfo: UpdateInfo, onProgress?: (progress: number) => void): Promise<string> {
    if (this.isDownloading) {
      throw new Error('正在下载中');
    }

    this.isDownloading = true;

    try {
      // 转换 localhost URL
      const downloadUrl = this.convertLocalhostUrl(updateInfo.downloadUrl);
      
      const apkPath = `${this.adapter.documentDirectory}update.apk`;
      const download = this.adapter.downloadFile({
        fromUrl: downloadUrl,
        toFile: apkPath,
        progress: (res) => {
          if (onProgress) {
            onProgress(res.bytesWritten / res.contentLength);
          }
        },
      });

      const result = await download.promise;
      if (result.statusCode !== 200) {
        throw new Error(`下载失败: HTTP ${result.statusCode}`);
      }

      return apkPath;
    } catch (error) {
      console.error('[OTA] 下载安装包失败:', error);
      throw error;
    } finally {
      this.isDownloading = false;
    }
  }

  openAppStore(url: string): void {
    Linking.openURL(url).catch(err => console.error('打开应用商店失败:', err));
  }

  /**
   * 清除所有 OTA 更新文件
   */
  async clearOtaUpdates(): Promise<void> {
    try {
      const exists = await this.adapter.exists(this.bundleFile);
      if (exists) {
        await this.adapter.unlink(this.bundleFile);
      }
      
      // 清除 drawable-* 目录
      const drawableDirs = ['drawable-mdpi', 'drawable-hdpi', 'drawable-xhdpi', 'drawable-xxhdpi', 'drawable-xxxhdpi', 'raw'];
      for (const dir of drawableDirs) {
        const drawableDir = `${this.bundlePath}/${dir}`;
        const dirExists = await this.adapter.exists(drawableDir);
        if (dirExists) {
          await this.adapter.unlink(drawableDir);
        }
      }
    } catch (error) {
      console.error('[OTA] 清除失败:', error);
    }
  }

  /**
   * 调试：检查 OTA 文件状态
   * 用于排查静态资源加载问题
   */
  async debugOTAFiles(): Promise<{
    bundleExists: boolean;
    bundlePath: string;
    drawableDirs: Record<string, boolean>;
    bundleDirFiles?: string[];
  }> {
    try {
      const bundleExists = await this.adapter.exists(this.bundleFile);
      
      // 检查 drawable-* 目录是否存在
      const drawableDirs: Record<string, boolean> = {};
      const dirs = ['drawable-mdpi', 'drawable-hdpi', 'drawable-xhdpi', 'drawable-xxhdpi', 'drawable-xxxhdpi', 'raw'];
      for (const dir of dirs) {
        const dirPath = `${this.bundlePath}/${dir}`;
        drawableDirs[dir] = await this.adapter.exists(dirPath);
      }
      
      // 列出 bundle 目录下的所有文件/目录
      let bundleDirFiles: string[] = [];
      try {
        const files = await this.adapter.readDir(this.bundlePath);
        bundleDirFiles = files.map(f => f.name).filter(Boolean) as string[];
      } catch (e) {
        bundleDirFiles = ['无法读取目录'];
      }

      const result = {
        bundleExists,
        bundlePath: this.bundleFile,
        drawableDirs,
        bundleDirFiles: bundleDirFiles.slice(0, 30),
      };

      console.log('[OTA Debug] 文件状态:', result);
      return result;
    } catch (error) {
      console.error('[OTA] 调试检查失败:', error);
      throw error;
    }
  }

  /**
   * 重启应用
   */
  restart(): void {
    this.adapter.restart();
  }
}

export function OTAUpdateModal() {
  const { modalState, customModalComponent } = useOTAContext();
  const ModalComponent = customModalComponent || UpdateModal;
  return <ModalComponent {...modalState} />;
}

// 增强版 OTAProvider，内部自动渲染 Modal
function OTAProviderWrapper({ children, customModalComponent, renderModal = true }: { 
  children: React.ReactNode; 
  customModalComponent?: ComponentType<ModalState>; 
  renderModal?: boolean;
}) {
  return (
    <OTAProviderBase customModalComponent={customModalComponent} renderModal={renderModal}>
       {children}
       {renderModal && <OTAUpdateModal />}
    </OTAProviderBase>
  );
}

// 导出增强版作为默认的 OTAProvider
export { OTAProviderWrapper as OTAProvider };

