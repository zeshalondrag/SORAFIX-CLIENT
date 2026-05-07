import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type ToastType = 'success' | 'error';

type ToastContextValue = {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('success');
  const slideAnim = useRef(new Animated.Value(150)).current;

  const showToast = useCallback((msg: string, type: ToastType) => {
    setMessage(msg);
    setToastType(type);
    setVisible(true);
    slideAnim.setValue(150);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
    const t = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: 150,
        useNativeDriver: true,
        duration: 200,
      }).start(() => setVisible(false));
      clearTimeout(t);
    }, 2500);
  }, [slideAnim]);

  const showSuccess = useCallback((msg: string) => {
    showToast(msg, 'success');
  }, [showToast]);

  const showError = useCallback((msg: string) => {
    showToast(msg, 'error');
  }, [showToast]);

  const iconName = toastType === 'success' ? 'check-circle' : 'error';
  const iconColor = toastType === 'success' ? 'rgba(5, 148, 103, 0.6)' : 'rgba(220, 38, 38, 0.6)';

  return (
    <ToastContext.Provider value={{ showSuccess, showError }}>
      {children}
      {visible && (
        <View style={styles.container} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.toast,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            <MaterialIcons
              name={iconName}
              size={22}
              color={iconColor}
              style={styles.icon}
            />
            <Text style={styles.text}>{message}</Text>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    left: 24,
    alignItems: 'flex-end',
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    marginRight: 10,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
});
