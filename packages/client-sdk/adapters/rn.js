/**
 * React Native 适配器
 */
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import RNRestart from 'react-native-restart';
import RNFetchBlob from 'react-native-blob-util';

const RNAdapter = {
  platform: Platform.OS,

  /**
   * 获取文档目录路径
   */
  get documentDirectory() {
    return RNFS.DocumentDirectoryPath + '/';
  },

  /**
   * 检查文件是否存在
   */
  async exists(path) {
    return await RNFS.exists(path);
  },

  /**
   * 创建目录
   */
  async mkdir(path) {
    await RNFS.mkdir(path);
  },

  /**
   * 下载文件
   */
  async downloadFile({ fromUrl, toFile, progress }) {
    return RNFS.downloadFile({
      fromUrl,
      toFile,
      progress,
    });
  },

  /**
   * 删除文件
   */
  async unlink(path) {
    await RNFS.unlink(path);
  },

  /**
   * 移动文件
   */
  async moveFile(from, to) {
    await RNFS.moveFile(from, to);
  },

  /**
   * 安装 APK（仅 Android）
   */
  async installApk(path) {
    if (Platform.OS !== 'android') {
      throw new Error('仅支持 Android 平台');
    }
    await RNFetchBlob.android.actionViewIntent(path, 'application/vnd.android.package-archive');
  },

  /**
   * 重启应用
   */
  restart() {
    RNRestart.restart();
  },
};

export default RNAdapter;
