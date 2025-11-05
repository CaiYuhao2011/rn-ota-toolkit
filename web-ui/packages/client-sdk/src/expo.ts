/**
 * Expo 入口
 */
import adapter from './adapters/expo';
import { OTAUpdater, OTAUpdateModal, OTAProvider } from './core';

export { OTAUpdateModal, OTAProvider, adapter };
export default OTAUpdater;
export type { OTAConfig, UpdateInfo, ModalState } from './types';
