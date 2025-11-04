/**
 * React Native 入口
 */
import adapter from './adapters/rn';
import { createOTAUpdater, OTAUpdateModal, OTAProvider } from './core';

const OTAUpdater = createOTAUpdater(adapter);

export { OTAUpdateModal, OTAProvider };
export default OTAUpdater;
