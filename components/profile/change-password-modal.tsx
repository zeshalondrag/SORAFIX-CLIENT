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

import { PasswordInput } from '@/components/auth/input-with-icon';
import { Colors } from '@/constants/theme';

type Step = 'code' | 'password';

type ChangePasswordModalProps = {
  visible: boolean;
  email: string;
  onClose: () => void;
  onCodeSubmit?: (code: string) => void | Promise<void>;
  onPasswordSubmit?: (newPassword: string, code: string) => void | Promise<void>;
};

const CODE_LENGTH = 6;

export function ChangePasswordModal({
  visible,
  email,
  onClose,
  onCodeSubmit,
  onPasswordSubmit,
}: ChangePasswordModalProps) {
  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [savedCode, setSavedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleCodeSubmit = async () => {
    if (code.length !== CODE_LENGTH) return;
    setLoading(true);
    try {
      await onCodeSubmit?.(code);
      setSavedCode(code);
      setStep('password');
    } catch {
      // Ошибка — остаёмся на шаге кода
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    setPasswordError('');
    if (newPassword.length < 8) {
      setPasswordError('Пароль должен быть не менее 8 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }
    if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/.test(newPassword)) {
      setPasswordError(
        'Пароль должен содержать заглавную букву, цифру и спецсимвол'
      );
      return;
    }
    setLoading(true);
    try {
      await onPasswordSubmit?.(newPassword, savedCode);
      setNewPassword('');
      setConfirmPassword('');
      setCode('');
      setSavedCode('');
      setStep('code');
      onClose();
    } catch {
      // Ошибка — остаёмся на шаге пароля
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('code');
    setCode('');
    setSavedCode('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    onClose();
  };

  const handleBackToCode = () => {
    setStep('code');
    setCode(savedCode);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, styles.overlayPhone]}>
        <View style={[styles.box, styles.boxPhone]}>
          {step === 'code' ? (
            <>
              <View style={styles.header}>
                <MaterialIcons name="lock" size={40} color={Colors.light.button} />
                <Text style={styles.title}>Изменение пароля</Text>
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
                  onPress={handleCodeSubmit}
                  disabled={code.length !== CODE_LENGTH || loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Проверка...' : 'Далее'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.header}>
                <MaterialIcons name="vpn-key" size={40} color={Colors.light.button} />
                <Text style={styles.title}>Новый пароль</Text>
                <Text style={styles.subtitle}>
                  Введите новый пароль и подтвердите его
                </Text>
              </View>
              <PasswordInput
                placeholder="Новый пароль"
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <PasswordInput
                placeholder="Подтвердите пароль"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={passwordError || undefined}
              />
              <View style={[styles.buttons, styles.buttonsStack]}>
                <TouchableOpacity style={[styles.buttonSecondary, styles.btnFull]} onPress={handleBackToCode}>
                  <Text style={styles.buttonSecondaryText}>Назад</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.btnFull]}
                  onPress={handlePasswordSubmit}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Сохранение...' : 'Сохранить'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
