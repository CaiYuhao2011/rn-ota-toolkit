import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import {ModalState} from 'rn-ota-client/expo';

export default function NewVersion(props: ModalState) {
  const {
    visible,
    title,
    message,
    progress,
    showProgress,
    onConfirm,
    confirmText,
  } = props;

  const opacity = useSharedValue(0);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      opacity.value = withTiming(1, {duration: 200});
    } else {
      opacity.value = withTiming(0, {duration: 200});
      // 延迟卸载，等待动画完成
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [visible, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  if (!shouldRender) {
    return null;
  }

  return (
    <Animated.View style={[styles.modalContainer, animatedStyle]}>
      <View style={styles.dialog}>
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <Text style={styles.icon}>🔔</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.contentText}>{message}</Text>
          <View
            style={[styles.progressContainer, {opacity: showProgress ? 1 : 0}]}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, {width: `${progress * 100}%`}]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={() => onConfirm?.()}>
            <Text style={styles.buttonText}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9999,
  },
  dialog: {
    width: 400,
    maxWidth: '90%',
    overflow: 'hidden',
    borderRadius: 12,
    padding: 24,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2d3748',
    flex: 1,
  },
  content: {
    marginBottom: 20,
  },
  contentText: {
    color: '#4a5568',
    fontSize: 14,
    lineHeight: 20,
  },
  progressContainer: {
    marginTop: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    flex: 1,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1890ff',
    borderRadius: 4,
  },
  progressText: {
    color: '#2d3748',
    fontSize: 12,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'right',
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    backgroundColor: '#1890ff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
