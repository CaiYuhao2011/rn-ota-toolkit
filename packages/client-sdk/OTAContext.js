import React, { createContext, useContext, useState, useCallback } from 'react';

const OTAContext = createContext(null);

export function OTAProvider({ children }) {
  const [modalState, setModalState] = useState({
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
  });

  const updateModalState = useCallback((newState) => {
    setModalState(prev => ({ ...prev, ...newState }));
  }, []);

  return (
    <OTAContext.Provider value={{ modalState, updateModalState }}>
      {children}
    </OTAContext.Provider>
  );
}

export function useOTAContext() {
  const context = useContext(OTAContext);
  if (!context) {
    throw new Error('useOTAContext must be used within OTAProvider');
  }
  return context;
}

// 导出一个全局更新函数供 OTAUpdater 使用
let globalUpdateModal = null;

export function setGlobalUpdateModal(updateFn) {
  globalUpdateModal = updateFn;
}

export function getGlobalUpdateModal() {
  return globalUpdateModal;
}

