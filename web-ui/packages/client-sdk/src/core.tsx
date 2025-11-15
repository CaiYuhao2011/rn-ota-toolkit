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
  /**
   * 框架
   */
  framework?: 'bare' | 'expo';
 
  constructor(config: OTAConfig, adapter: OTAAdapter) {
    this.adapter = adapter;
    this.serverUrl = config.serverUrl;
    this.appName = config.appName;
    this.version = config.version;
    this.devServerHost = config.devServerHost;
    this.framework = config.framework;
    this.platform = adapter.platform;
    this.bundlePath = this.adapter.bundlePath;
    this.bundleFile = `${this.bundlePath}/index.${this.platform}.bundle`;
    
    this.isDownloading = false;

    this.init();
  }

  async init() {
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
        const updateInfo: UpdateInfo = result.data;    
        
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
    // 转换 localhost URL
    updateInfo.downloadUrl = this.convertLocalhostUrl(updateInfo.downloadUrl);
    console.log('[OTA] 转换后的 URL:', updateInfo.downloadUrl);

    if (updateInfo.type === 'force') {
      this.showForceUpdateDialog(updateInfo);
    } else {
      this.showOtaUpdateDialog(updateInfo);
    }
  }

  private showUpdateError(error: Error, defaultMessage: string = '更新失败，请稍后重试'): void {
    console.error('[OTA] 更新失败:', error);
    this.updateModal({
      visible: true,
      title: '更新失败',
      message: error.message || defaultMessage,
      showProgress: false,
      confirmText: '知道了',
      cancelText: '取消',
      cancelable: false,
      onConfirm: () => this.updateModal({ visible: false }),
      onCancel: null,
    });
  }

  private showOtaUpdateDialog(updateInfo: UpdateInfo): void {
    // 全自动更新：直接开始下载，不显示确认弹窗
    this.adapter.preStartOtaUpdate(updateInfo).then((res) => {
      if (res) {
        console.log('[OTA] 检测到新版本，自动开始更新');
        this.startOtaUpdate(updateInfo).catch((error) => {
          this.showUpdateError(error);
        });
      }
    });
  }

  private async startOtaUpdate(updateInfo: UpdateInfo): Promise<void> {
    console.log('[OTA] 开始 OTA 更新');
    const versionMessage = `版本 ${updateInfo.version}${updateInfo.description ? '\n更新日志：' + updateInfo.description : ''}`;
    this.updateModal({
      visible: true,
      title: '正在更新',
      showProgress: true,
      progress: 0,
      message: `${versionMessage}\n\n正在下载更新...`,
      confirmText: '下载更新',
      cancelText: '取消',
      cancelable: false,
      onConfirm: null,
      onCancel: null,
    });

    try {
      console.log('[OTA] 调用 downloadOtaUpdate');
      await this.adapter.downloadOtaUpdate(updateInfo, (progress: number) => {
        this.updateModal({ progress });
      });
      console.log('[OTA] downloadOtaUpdate 完成');

      // 全自动更新：下载完成后直接重启，不显示确认弹窗
      console.log('[OTA] 更新完成，自动重启应用');
      this.updateModal({
        visible: true,
        showProgress: false,
        title: '更新完成',
        message: `${versionMessage}\n\n正在重启应用...`,
        confirmText: '重启应用',
        cancelText: '取消',
        cancelable: false,
        onConfirm: null,
        onCancel: null,
      });
      
      // 延迟 500ms 让用户看到提示
      setTimeout(() => {
        this.updateModal({ visible: false });
        this.restart();
      }, 500);
    } catch (error) {
      this.showUpdateError(error as Error, '下载失败，请稍后重试');
    }
  }

  private showForceUpdateDialog(updateInfo: UpdateInfo): void {
    if (this.adapter.installApk) {
      // Android 整包更新 - 全自动下载并触发安装
      console.log('[OTA] 检测到全量更新，自动开始下载安装包');
      this.startForceUpdate(updateInfo).catch((error) => {
        this.showUpdateError(error as Error, '下载失败，请稍后重试');
      });
    } else {
      // iOS 或其他平台，跳转应用商店
      this.updateModal({ visible: false });
      this.openAppStore(updateInfo.downloadUrl);
    }
  }

  private async startForceUpdate(updateInfo: UpdateInfo): Promise<void> {
    const versionMessage = `版本 ${updateInfo.version}${updateInfo.description ? '\n更新日志：' + updateInfo.description : ''}`;
    this.updateModal({
      visible: true,
      title: '正在更新',
      showProgress: true,
      progress: 0,
      message: `${versionMessage}\n\n正在下载安装包...`,
      confirmText: '下载更新',
      cancelText: '取消',
      cancelable: false,
      onConfirm: null,
      onCancel: null,
    });

    try {
      const apkPath = await this.downloadApk(updateInfo, (progress: number) => {
        this.updateModal({ progress });
      });

      // 下载完成，等待用户确认安装
      console.log('[OTA] APK 下载完成，等待用户确认安装');
      this.updateModal({
        visible: true,
        showProgress: false,
        title: '下载完成',
        message: `${versionMessage}\n\n安装包已下载完成`,
        confirmText: '立即安装',
        cancelText: '取消',
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

