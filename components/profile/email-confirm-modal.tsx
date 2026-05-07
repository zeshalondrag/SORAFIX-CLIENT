import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import {
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';

import { Colors } from '@/constants/theme';

export type CodeModalVariant = 'email_confirm' | 'password_reset' | 'password_change';

const MODAL_TITLES: Record<CodeModalVariant, string> = {
  email_confirm: 'Подтверждение почты',
  password_reset: 'Сброс пароля',
  password_change: 'Изменение пароля',
};

type EmailConfirmModalProps = {
  visible: boolean;
  email: string;
  variant?: CodeModalVariant;
  onClose: () => void;
  onConfirm?: (code: string) => void | Promise<void>;
};

const CODE_LENGTH = 6;

export function EmailConfirmModal({
  visible,
  email,
  variant = 'email_confirm',
  onClose,
  onConfirm,
}: EmailConfirmModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (code.length !== CODE_LENGTH) return;
    setLoading(true);
    try {
      await onConfirm?.(code);
      setCode('');
      onClose();
    } catch {
      // Ошибка — пока оставляем модалку открытой
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCode('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, styles.overlayPhone]}>
        <View style={[styles.box, styles.boxPhone]}>
          <View style={styles.header}>
            <MaterialIcons name="mark-email-read" size={40} color={Colors.light.button} />
            <Text style={styles.title}>{MODAL_TITLES[variant]}</Text>
            <Text style={styles.subtitle}>
              Введите 6-значный код, отправленный на {email}
            </Text>
          </View>
          <TextInput
            style={[
              styles.codeInput,
              Platform.OS === 'web' && ({
                outlineStyle: 'none',
                outlineWidth: 0,
              } as Record<string, unknown>),
            ]}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, CODE_LENGTH))}
            placeholder="000000"
            placeholderTextColor={Colors.light.placeholder}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            editable={!loading}
          />
          <View style={[styles.buttons, styles.buttonsStack]}>
            <TouchableOpacity style={[styles.buttonSecondary, styles.btnFull]} onPress={handleClose}>
              <Text style={styles.buttonSecondaryText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.btnFull, code.length !== CODE_LENGTH && styles.buttonDisabled]}
              onPress={handleConfirm}
              disabled={code.length !== CODE_LENGTH || loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Проверка...' : 'Подтвердить'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayPhone: {
    padding: 12,
    justifyContent: 'flex-end',
  },
  box: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  boxPhone: {
    maxWidth: '100%',
    padding: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.link,
    textAlign: 'center',
  },
  codeInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  buttonsStack: {
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
  },
  btnFull: {
    alignSelf: 'stretch',
    width: '100%',
    alignItems: 'center',
  },
  button: {
    backgroundColor: Colors.light.button,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.buttonText,
  },
  buttonSecondary: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  buttonSecondaryText: {
    fontSize: 14,
    color: Colors.light.text,
  },
});
