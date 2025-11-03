import { Platform, Linking } from 'react-native';
import React, { Component } from 'react';
import UpdateModal from './UpdateModal';
import { getAdapter } from './adapters';

const adapter = getAdapter();

class OTAUpdater {
  constructor(config) {
    this.serverUrl = config.serverUrl;
    this.appName = config.appName;
    this.version = config.version;
    this.modalComponent = null;
    
    this.platform = adapter.platform;
    this.bundlePath = `${adapter.documentDirectory}bundle`;
    this.bundleFile = `${this.bundlePath}/index.${this.platform}.bundle`;
    
    this.isDownloading = false;
    this.modalState = {
      visible: false,
      title: '',
      message: '',
      progress: 0,
      showProgress: false,
      onConfirm: null,
      onCancel: null,
      confirmText: '',
      cancelText: '',
      cancelable: true,
    };

    this._init();
  }

  async _init() {
    try {
      const exists = await adapter.exists(this.bundlePath);
      if (!exists) {
        await adapter.mkdir(this.bundlePath);
      }
    } catch (error) {
      console.error('[OTA] 初始化失败:', error);
    }
  }

  setModalComponent(component) {
    this.modalComponent = component;
  }

  _updateModal(state) {
    this.modalState = { ...this.modalState, ...state };
    if (this.modalComponent && this.modalComponent.setState) {
      this.modalComponent.setState(this.modalState);
    }
  }

  checkUpdate(newVersionInfo) {
    if (!newVersionInfo || !newVersionInfo.version) {
      return;
    }

    if (newVersionInfo.version <= this.version) {
      return;
    }

    if (newVersionInfo.type === 'force') {
      this._showForceUpdateDialog(newVersionInfo);
    } else {
      this._showOtaUpdateDialog(newVersionInfo);
    }
  }

  _showOtaUpdateDialog(updateInfo) {
    this._updateModal({
      visible: true,
      title: '发现新版本',
      message: `版本 ${updateInfo.version}\n${updateInfo.description || ''}`,
      showProgress: false,
      progress: 0,
      confirmText: '立即更新',
      cancelText: '稍后',
      cancelable: true,
      onConfirm: () => this._startOtaUpdate(updateInfo),
      onCancel: () => this._updateModal({ visible: false }),
    });
  }

  async _startOtaUpdate(updateInfo) {
    this._updateModal({
      showProgress: true,
      progress: 0,
      message: '正在下载更新...',
      onConfirm: null,
      onCancel: null,
      cancelable: false,
    });

    try {
      await this.downloadOtaUpdate(updateInfo, (progress) => {
        this._updateModal({ progress });
      });

      this._updateModal({
        showProgress: false,
        title: '更新成功',
        message: '请重启应用以应用更新',
        confirmText: '立即重启',
        cancelText: '稍后',
        cancelable: true,
        onConfirm: () => {
          this._updateModal({ visible: false });
          this.restart();
        },
        onCancel: () => this._updateModal({ visible: false }),
      });
    } catch (error) {
      this._updateModal({
        showProgress: false,
        title: '更新失败',
        message: error.message || '下载失败，请稍后重试',
        confirmText: '确定',
        cancelText: '',
        cancelable: true,
        onConfirm: () => this._updateModal({ visible: false }),
        onCancel: () => this._updateModal({ visible: false }),
      });
    }
  }

  _showForceUpdateDialog(updateInfo) {
    this._updateModal({
      visible: true,
      title: '发现新版本',
      message: `版本 ${updateInfo.version}\n${updateInfo.description || ''}\n\n请更新到最新版本`,
      showProgress: false,
      progress: 0,
      confirmText: '立即更新',
      cancelText: '稍后',
      cancelable: true,
      onConfirm: () => this._startForceUpdate(updateInfo),
      onCancel: () => this._updateModal({ visible: false }),
    });
  }

  async _startForceUpdate(updateInfo) {
    if (Platform.OS === 'android') {
      this._updateModal({
        showProgress: true,
        progress: 0,
        message: '正在下载安装包...',
        onConfirm: null,
        onCancel: null,
        cancelable: false,
      });

      try {
        await this.downloadAndInstallApk(updateInfo, (progress) => {
          this._updateModal({ progress });
        });
      } catch (error) {
        this._updateModal({
          showProgress: false,
          title: '更新失败',
          message: error.message || '下载失败，请稍后重试',
          confirmText: '确定',
          cancelText: '',
          cancelable: true,
          onConfirm: () => this._updateModal({ visible: false }),
          onCancel: () => this._updateModal({ visible: false }),
        });
      }
    } else {
      this._updateModal({ visible: false });
      this.openAppStore(updateInfo.downloadUrl);
    }
  }

  async downloadOtaUpdate(updateInfo, onProgress) {
    if (this.isDownloading) {
      throw new Error('正在下载中');
    }

    this.isDownloading = true;

    try {
      const tempFile = `${this.bundlePath}/temp.bundle`;
      
      const download = await adapter.downloadFile({
        fromUrl: updateInfo.downloadUrl,
        toFile: tempFile,
        progress: (res) => {
          if (onProgress) {
            onProgress(res.bytesWritten / res.contentLength);
          }
        },
      });

      const downloadResult = await download.promise;

      if (downloadResult.statusCode !== 200) {
        throw new Error(`下载失败: HTTP ${downloadResult.statusCode}`);
      }

      const oldExists = await adapter.exists(this.bundleFile);
      if (oldExists) {
        await adapter.unlink(this.bundleFile);
      }

      await adapter.moveFile(tempFile, this.bundleFile);

      return true;
    } catch (error) {
      console.error('[OTA] 下载失败:', error);
      throw error;
    } finally {
      this.isDownloading = false;
    }
  }

  async downloadAndInstallApk(updateInfo, onProgress) {
    if (Platform.OS !== 'android') {
      throw new Error('仅支持 Android');
    }

    if (this.isDownloading) {
      throw new Error('正在下载中');
    }

    this.isDownloading = true;

    try {
      const apkPath = `${adapter.documentDirectory}update_${updateInfo.version}.apk`;
      
      const download = await adapter.downloadFile({
        fromUrl: updateInfo.downloadUrl,
        toFile: apkPath,
        progress: (res) => {
          if (onProgress) {
            onProgress(res.bytesWritten / res.contentLength);
          }
        },
      });

      const downloadResult = await download.promise;

      if (downloadResult.statusCode !== 200) {
        throw new Error(`下载失败: HTTP ${downloadResult.statusCode}`);
      }

      await adapter.installApk(apkPath);
      
      return true;
    } catch (error) {
      console.error('[OTA] 下载安装包失败:', error);
      throw error;
    } finally {
      this.isDownloading = false;
    }
  }

  openAppStore(url) {
    if (!url) {
      throw new Error('URL 不能为空');
    }
    return Linking.openURL(url);
  }

  restart() {
    adapter.restart();
  }

  async clearLocalUpdate() {
    try {
      const bundleExists = await adapter.exists(this.bundleFile);
      if (bundleExists) {
        await adapter.unlink(this.bundleFile);
      }

      return true;
    } catch (error) {
      console.error('[OTA] 清除失败:', error);
      throw error;
    }
  }

  getModalComponent() {
    return (ref) => {
      this.modalComponent = ref;
      return <UpdateModal ref={ref} {...this.modalState} />;
    };
  }
}

class OTAUpdateModal extends Component {
  render() {
    return <UpdateModal {...this.props} />;
  }
}

export { OTAUpdateModal };
export default OTAUpdater;
