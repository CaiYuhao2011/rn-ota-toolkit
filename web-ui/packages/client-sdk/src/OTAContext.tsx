import React, { createContext, useContext, useState, useEffect, ReactNode, ComponentType } from 'react';
import type { ModalState } from './types';

interface OTAContextValue {
  modalState: ModalState;
  customModalComponent?: ComponentType<ModalState>;
  renderModal: boolean;
}

const OTAContext = createContext<OTAContextValue | null>(null);

// 事件发射器
class ModalEventEmitter {
  private listeners: Array<(state: Partial<ModalState>) => void> = [];

  subscribe(listener: (state: Partial<ModalState>) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  emit(state: Partial<ModalState>): void {
    this.listeners.forEach(listener => listener(state));
  }
}

export const modalEmitter = new ModalEventEmitter();

interface OTAProviderProps {
  children?: ReactNode | ReactNode[] | null;
  customModalComponent?: ComponentType<ModalState>;
  renderModal?: boolean;
}

export function OTAProvider({ children = null, customModalComponent, renderModal = true }: OTAProviderProps) {
  const [modalState, setModalState] = useState<ModalState>({
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

  useEffect(() => {
    const unsubscribe = modalEmitter.subscribe((newState: Partial<ModalState>) => {
      console.log('[OTA] 收到事件, visible:', newState.visible);
      setModalState(prev => ({ ...prev, ...newState }));
    });
    return unsubscribe;
  }, []);

  return (
    <OTAContext.Provider value={{ modalState, customModalComponent, renderModal }}>
      {children}
    </OTAContext.Provider>
  );
}

export function useOTAContext(): OTAContextValue {
  const context = useContext(OTAContext);
  if (!context) {
    throw new Error('useOTAContext must be used within OTAProvider');
  }
  return context;
}
