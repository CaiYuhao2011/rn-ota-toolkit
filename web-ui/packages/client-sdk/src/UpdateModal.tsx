import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import type { ModalState } from './types';

interface UpdateModalProps extends ModalState {
  // 自定义样式
  overlayStyle?: ViewStyle;
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  messageStyle?: TextStyle;
  progressContainerStyle?: ViewStyle;
  progressBarStyle?: ViewStyle;
  progressFillStyle?: ViewStyle;
  progressTextStyle?: TextStyle;
  buttonContainerStyle?: ViewStyle;
  cancelButtonStyle?: ViewStyle;
  confirmButtonStyle?: ViewStyle;
  cancelButtonTextStyle?: TextStyle;
  confirmButtonTextStyle?: TextStyle;
}

const UpdateModal: React.FC<UpdateModalProps> = ({ 
  visible, 
  title, 
  message, 
  progress, 
  onConfirm, 
  onCancel, 
  confirmText, 
  cancelText, 
  showProgress, 
  cancelable = false,
  // 自定义样式
  overlayStyle,
  containerStyle,
  titleStyle,
  messageStyle,
  progressContainerStyle,
  progressBarStyle,
  progressFillStyle,
  progressTextStyle,
  buttonContainerStyle,
  cancelButtonStyle,
  confirmButtonStyle,
  cancelButtonTextStyle,
  confirmButtonTextStyle
}) => {
  return (
    <Modal 
      transparent 
      visible={visible} 
      animationType="fade" 
      onRequestClose={() => {}}
    >
      <View style={[styles.overlay, overlayStyle]}>
        <View style={[styles.container, containerStyle]}>
          <Text style={[styles.title, titleStyle]}>{title}</Text>
          <Text style={[styles.message, messageStyle]}>{message}</Text>
          
          {showProgress && (
            <View style={[styles.progressContainer, progressContainerStyle]}>
              <View style={[styles.progressBar, progressBarStyle]}>
                <View style={[styles.progressFill, progressFillStyle, { width: `${Math.floor(progress * 100)}%` }]} />
              </View>
              <Text style={[styles.progressText, progressTextStyle]}>{Math.floor(progress * 100)}%</Text>
            </View>
          )}
          
          <View style={[styles.buttonContainer, buttonContainerStyle]}>
            {cancelable && onCancel && (
              <TouchableOpacity style={[styles.button, styles.cancelButton, cancelButtonStyle]} onPress={onCancel}>
                <Text style={[styles.cancelButtonText, cancelButtonTextStyle]}>{cancelText || '取消'}</Text>
              </TouchableOpacity>
            )}
            {onConfirm && (
              <TouchableOpacity style={[styles.button, styles.confirmButton, confirmButtonStyle]} onPress={onConfirm}>
                <Text style={[styles.confirmButtonText, confirmButtonTextStyle]}>{confirmText || '确定'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '80%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#333',
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1890ff',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  confirmButton: {
    backgroundColor: '#1890ff',
  },
  cancelButtonText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
  },
  confirmButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
  },
});

export default UpdateModal;
