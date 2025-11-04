/**
 * Expo 入口
 */
import adapter from './adapters/expo';
import { createOTAUpdater, OTAUpdateModal, OTAProvider } from './core';

const OTAUpdater = createOTAUpdater(adapter);

export { OTAUpdateModal, OTAProvider };
export default OTAUpdater;
