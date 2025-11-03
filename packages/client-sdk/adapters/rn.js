/**
 * React Native 适配器
 */
import RNFS from 'react-native-fs';
import { NativeModules, Platform } from 'react-native';

const { RNRestart } = NativeModules;

const RNAdapter = {
  platform: Platform.OS,

  /**
   * 获取文档目录路径
   */
  get documentDirectory() {
    return RNFS.DocumentDirectoryPath;
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
      progressDivider: 10,
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
      throw new Error('仅支持 Android');
    }
    await RNFS.installApk(path);
  },

  /**
   * 重启应用
   */
  async restart() {
    if (RNRestart && RNRestart.Restart) {
      RNRestart.Restart();
    } else {
      throw new Error('RNRestart 不可用');
    }
  },
};

export default RNAdapter;

