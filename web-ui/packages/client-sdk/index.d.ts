import { Component, ReactNode } from 'react';

export interface OTAConfig {
  /** 服务器地址 */
  serverUrl: string;
  /** 应用名称 */
  appName: string;
  /** 当前版本号 */
  version: string;
}

export interface UpdateInfo {
  /** 新版本号 */
  version: string;
  /** 更新类型: 'ota' 热更新 | 'force' 强制更新(APK/IPA) */
  type: 'ota' | 'force';
  /** 下载地址 */
  downloadUrl: string;
  /** 更新描述 */
  description?: string;
  /** 最低原生版本要求 */
  minAppVersion?: string;
}

export interface ModalState {
  /** 是否显示 */
  visible: boolean;
  /** 标题 */
  title: string;
  /** 消息内容 */
  message: string;
  /** 下载进度 (0-1) */
  progress: number;
  /** 是否显示进度条 */
  showProgress: boolean;
  /** 确认按钮回调 */
  onConfirm: (() => void) | null;
  /** 取消按钮回调 */
  onCancel: (() => void) | null;
  /** 确认按钮文本 */
  confirmText: string;
  /** 取消按钮文本 */
  cancelText: string;
  /** 是否可取消 */
  cancelable: boolean;
}

export type ProgressCallback = (progress: number) => void;

/**
 * OTA 更新器
 */
export default class OTAUpdater {
  constructor(config: OTAConfig);

  /**
   * 设置 Modal 组件实例
   * @param component Modal 组件引用
   */
  setModalComponent(component: Component | null): void;

  /**
   * 检查并处理更新
   * @param newVersionInfo 新版本信息
   */
  checkUpdate(newVersionInfo: UpdateInfo): void;

  /**
   * 下载 OTA 更新
   * @param updateInfo 更新信息
   * @param onProgress 进度回调
   * @returns Promise<boolean>
   */
  downloadOtaUpdate(updateInfo: UpdateInfo, onProgress?: ProgressCallback): Promise<boolean>;

  /**
   * 下载并安装 APK（仅 Android）
   * @param updateInfo 更新信息
   * @param onProgress 进度回调
   * @returns Promise<boolean>
   */
  downloadAndInstallApk(updateInfo: UpdateInfo, onProgress?: ProgressCallback): Promise<boolean>;

  /**
   * 打开应用商店
   * @param url 应用商店链接
   * @returns Promise<void>
   */
  openAppStore(url: string): Promise<void>;

  /**
   * 重启应用
   */
  restart(): void;

  /**
   * 清除本地更新
   * @returns Promise<boolean>
   */
  clearLocalUpdate(): Promise<boolean>;

  /**
   * 获取 Modal 组件
   * @returns 返回 Modal 组件渲染函数
   */
  getModalComponent(): (ref: any) => JSX.Element;
}

/**
 * OTA Provider Props
 */
export interface OTAProviderProps {
  children: ReactNode;
}

/**
 * OTA Context Provider
 * 必须包裹在应用最外层，为 OTAUpdateModal 提供状态管理
 */
export function OTAProvider(props: OTAProviderProps): JSX.Element;

/**
 * OTA 更新弹窗组件
 * 必须在 OTAProvider 内部使用
 */
export function OTAUpdateModal(): JSX.Element;

