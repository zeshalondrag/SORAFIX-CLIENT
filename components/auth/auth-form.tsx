import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { InputWithIcon, PasswordInput } from '@/components/auth/input-with-icon';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { authApi, isApiError } from '@/lib/auth-api';
import { isValidEmail, isValidPassword, isValidPhone, passwordRequirements } from '@/lib/validation';

type FormMode = 'login' | 'register' | 'reset';

const CODE_LENGTH = 6;

export function AuthForm() {
  const [mode, setMode] = useState<FormMode>('login');
  // Для восстановления аккаунта
  const [restoreEmail, setRestoreEmail] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const handleNeedsRestoration = (email: string) => {
    setRestoreEmail(email);
    setShowRestoreModal(true);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {mode === 'login' && (
          <LoginForm
            onSwitchToRegister={() => setMode('register')}
            onSwitchToReset={() => setMode('reset')}
            onNeedsRestoration={handleNeedsRestoration}
          />
        )}
        {mode === 'register' && <RegisterForm onSwitchToLogin={() => setMode('login')} />}
        {mode === 'reset' && <ResetForm onSwitchToLogin={() => setMode('login')} />}
      </ScrollView>

      <RestoreAccountModal
        visible={showRestoreModal}
        email={restoreEmail}
        onClose={() => setShowRestoreModal(false)}
      />
    </KeyboardAvoidingView>
  );
}

// ——— Авторизация ———
function LoginForm({
  onSwitchToRegister,
  onSwitchToReset,
  onNeedsRestoration,
}: {
  onSwitchToRegister: () => void;
  onSwitchToReset: () => void;
  onNeedsRestoration: (email: string) => void;
}) {
  const { login } = useAuth();
  const { showSuccess } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async () => {
    let ok = true;
    setApiError('');
    if (!email.trim()) {
      setEmailError('Введите почту');
      ok = false;
    } else if (!isValidEmail(email)) {
      setEmailError('Некорректный формат почты');
      ok = false;
    } else setEmailError('');
    if (!password) {
      setPasswordError('Введите пароль');
      ok = false;
    } else setPasswordError('');
    if (!ok) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
      showSuccess('Успешная авторизация');
    } catch (e) {
      if (isApiError(e)) {
        if (e.status === 403 && e.needsRestoration) {
          onNeedsRestoration(email.trim());
        } else {
          setApiError(e.message || 'Ошибка авторизации');
        }
      } else {
        setApiError('Ошибка соединения. Проверьте подключение к API.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.welcomeTitle}>Добро пожаловать!</Text>
      <Text style={styles.welcomeSubtitle}>
        Войдите в аккаунт для продолжения работы
      </Text>
      {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Почта</Text>
      <InputWithIcon
        icon="email"
        placeholder="name@example.com"
        value={email}
        onChangeText={(v) => { setEmail(v); setEmailError(''); setApiError(''); }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        error={emailError}
        editable={!loading}
      />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Пароль</Text>
      <PasswordInput
        placeholder="••••••••"
        value={password}
        onChangeText={(v) => { setPassword(v); setPasswordError(''); setApiError(''); }}
        error={passwordError}
        editable={!loading}
      />
      </View>

      <View style={styles.loginOptionsRow}>
        <TouchableOpacity
          style={styles.rememberMeRow}
          onPress={() => setRememberMe((v) => !v)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
            {rememberMe ? <MaterialIcons name="check" size={14} color="#FFFFFF" /> : null}
          </View>
          <Text style={styles.rememberMeText}>Запомнить меня</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSwitchToReset}>
          <Text style={styles.link}>Забыли пароль?</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        activeOpacity={0.8}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.light.buttonText} />
        ) : (
          <Text style={styles.buttonText}>Авторизоваться</Text>
        )}
      </TouchableOpacity>

      <View style={styles.links}>
        <View style={styles.linkRow}>
          <Text style={styles.linkHint}>Нет аккаунта? </Text>
          <TouchableOpacity onPress={onSwitchToRegister}>
            <Text style={styles.link}>Регистрация</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ——— Регистрация ———
function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { register } = useAuth();
  const { showSuccess } = useToast();
  const [surname, setSurname] = useState('');
  const [name, setName] = useState('');
  const [patronymic, setPatronymic] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [surnameError, setSurnameError] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleSubmit = async () => {
    let ok = true;
    if (!surname.trim()) {
      setSurnameError('Введите фамилию');
      ok = false;
    } else setSurnameError('');
    if (!name.trim()) {
      setNameError('Введите имя');
      ok = false;
    } else setNameError('');
    if (!email.trim()) {
      setEmailError('Введите почту');
      ok = false;
    } else if (!isValidEmail(email)) {
      setEmailError('Некорректный формат почты');
      ok = false;
    } else setEmailError('');
    if (!phone.trim()) {
      setPhoneError('Введите номер телефона');
      ok = false;
    } else if (!isValidPhone(phone)) {
      setPhoneError('Некорректный номер телефона');
      ok = false;
    } else setPhoneError('');
    if (!isValidPassword(password)) {
      setPasswordError(passwordRequirements);
      ok = false;
    } else setPasswordError('');
    if (password !== confirmPassword) {
      setConfirmError('Пароли не совпадают');
      ok = false;
    } else if (!isValidPassword(confirmPassword)) {
      setConfirmError(passwordRequirements);
      ok = false;
    } else setConfirmError('');
    if (!ok) return;
    setLoading(true);
    setApiError('');
    try {
      await register({
        lastName: surname.trim(),
        firstName: name.trim(),
        middleName: patronymic.trim() || null,
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      showSuccess('Успешная регистрация');
    } catch (e) {
      if (isApiError(e)) {
        const msg = e.errors
          ? Object.values(e.errors).flat().join(', ')
          : e.message;
        setApiError(msg || 'Ошибка регистрации');
      } else {
        setApiError('Ошибка соединения. Проверьте подключение к API.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.welcomeTitle}>Создайте аккаунт</Text>
      <Text style={styles.welcomeSubtitle}>Настройте рабочее пространство за пару минут</Text>
      {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Фамилия</Text>
      <InputWithIcon
        icon="person"
        placeholder="Иванов"
        value={surname}
        onChangeText={(v) => { setSurname(v); setSurnameError(''); setApiError(''); }}
        error={surnameError}
        editable={!loading}
      />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Имя</Text>
      <InputWithIcon
        icon="person"
        placeholder="Иван"
        value={name}
        onChangeText={(v) => { setName(v); setNameError(''); setApiError(''); }}
        error={nameError}
        editable={!loading}
      />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Отчество (необязательно)</Text>
      <InputWithIcon
        icon="person"
        placeholder="Иванович"
        value={patronymic}
        onChangeText={setPatronymic}
        editable={!loading}
      />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Почта</Text>
      <InputWithIcon
        icon="email"
        placeholder="name@example.com"
        value={email}
        onChangeText={(v) => { setEmail(v); setEmailError(''); setApiError(''); }}
        keyboardType="email-address"
        autoCapitalize="none"
        error={emailError}
        editable={!loading}
      />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Номер телефона</Text>
      <InputWithIcon
        icon="phone"
        placeholder="+7 (999) 123-45-67"
        value={phone}
        onChangeText={(v) => { setPhone(v); setPhoneError(''); setApiError(''); }}
        keyboardType="phone-pad"
        error={phoneError}
        editable={!loading}
      />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Пароль</Text>
      <PasswordInput
        placeholder="Не менее 8 символов"
        value={password}
        onChangeText={(v) => { setPassword(v); setPasswordError(''); setApiError(''); }}
        error={passwordError}
        editable={!loading}
      />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Подтверждение пароля</Text>
      <PasswordInput
        placeholder="Повторите пароль"
        value={confirmPassword}
        onChangeText={(v) => { setConfirmPassword(v); setConfirmError(''); setApiError(''); }}
        error={confirmError}
        editable={!loading}
      />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        activeOpacity={0.8}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.light.buttonText} />
        ) : (
          <Text style={styles.buttonText}>Зарегистрироваться</Text>
        )}
      </TouchableOpacity>

      <View style={styles.links}>
        <View style={styles.linkRow}>
          <Text style={styles.linkHint}>Уже есть аккаунт? </Text>
          <TouchableOpacity onPress={onSwitchToLogin}>
            <Text style={styles.link}>Авторизация</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ——— Сброс пароля ———
type ResetStep = 'email' | 'code' | 'password';

function ResetForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { showSuccess } = useToast();
  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleSendCode = async () => {
    if (!email.trim()) {
      setEmailError('Введите почту');
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError('Некорректный формат почты');
      return;
    }
    setEmailError('');
    setApiError('');
    setLoading(true);
    try {
      await authApi.requestPasswordReset(email.trim());
      showSuccess('Код отправлен на почту');
      setStep('code');
    } catch (e) {
      if (isApiError(e)) {
        setApiError(e.message || 'Ошибка отправки кода');
      } else {
        setApiError('Ошибка соединения');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (code.length !== CODE_LENGTH) {
      setCodeError('Введите 6-значный код');
      return;
    }
    setCodeError('');
    setStep('password');
  };

  const handleResetPassword = async () => {
    let ok = true;
    if (!isValidPassword(newPassword)) {
      setPasswordError(passwordRequirements);
      ok = false;
    } else setPasswordError('');
    if (newPassword !== confirmPassword) {
      setConfirmError('Пароли не совпадают');
      ok = false;
    } else setConfirmError('');
    if (!ok) return;

    setApiError('');
    setLoading(true);
    try {
      await authApi.resetPassword({
        email: email.trim(),
        code,
        newPassword,
      });
      showSuccess('Пароль успешно изменён');
      onSwitchToLogin();
    } catch (e) {
      if (isApiError(e)) {
        setApiError(e.message || 'Ошибка сброса пароля');
      } else {
        setApiError('Ошибка соединения');
      }
    } finally {
      setLoading(false);
    }
  };

  if (step === 'email') {
    return (
      <View style={styles.form}>
        <Text style={styles.welcomeTitle}>Восстановление пароля</Text>
        <Text style={styles.welcomeSubtitle}>Введите адрес электронной почты, связанный с вашим аккаунтом. Мы отправим код для восстановления доступа</Text>
        {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Почта</Text>
        <InputWithIcon
          icon="email"
          placeholder="name@example.com"
          value={email}
          onChangeText={(v) => { setEmail(v); setEmailError(''); setApiError(''); }}
          keyboardType="email-address"
          autoCapitalize="none"
          error={emailError}
          editable={!loading}
        />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSendCode}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.light.buttonText} />
          ) : (
            <Text style={styles.buttonText}>Отправить код</Text>
          )}
        </TouchableOpacity>

        <View style={styles.links}>
          <TouchableOpacity onPress={onSwitchToLogin}>
            <Text style={styles.link}>Вернуться к авторизации</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (step === 'code') {
    return (
      <View style={styles.form}>
        <Text style={styles.title}>Сброс пароля</Text>
        <Text style={styles.subtitle}>
          Введите 6-значный код, отправленный на {email}
        </Text>
        {codeError ? <Text style={styles.apiError}>{codeError}</Text> : null}

        <Text style={styles.fieldLabel}>Код подтверждения</Text>
        <TextInput
          style={[
            styles.codeInput,
            Platform.OS === 'web' && ({
              outlineStyle: 'none',
              outlineWidth: 0,
            } as Record<string, unknown>),
          ]}
          value={code}
          onChangeText={(t) => { setCode(t.replace(/\D/g, '').slice(0, CODE_LENGTH)); setCodeError(''); }}
          placeholder="000000"
          placeholderTextColor={Colors.light.placeholder}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
        />

        <TouchableOpacity
          style={[styles.button, code.length !== CODE_LENGTH && styles.buttonDisabled]}
          onPress={handleVerifyCode}
          activeOpacity={0.8}
          disabled={code.length !== CODE_LENGTH}
        >
          <Text style={styles.buttonText}>Далее</Text>
        </TouchableOpacity>

        <View style={styles.links}>
          <TouchableOpacity onPress={() => setStep('email')}>
            <Text style={styles.link}>Изменить почту</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // step === 'password'
  return (
    <View style={styles.form}>
      <Text style={styles.title}>Новый пароль</Text>
      <Text style={styles.subtitle}>
        Введите новый пароль и подтвердите его
      </Text>
      {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Новый пароль</Text>
      <PasswordInput
        placeholder="Не менее 8 символов"
        value={newPassword}
        onChangeText={(v) => { setNewPassword(v); setPasswordError(''); setApiError(''); }}
        error={passwordError}
        editable={!loading}
      />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Подтверждение пароля</Text>
      <PasswordInput
        placeholder="Повторите пароль"
        value={confirmPassword}
        onChangeText={(v) => { setConfirmPassword(v); setConfirmError(''); setApiError(''); }}
        error={confirmError}
        editable={!loading}
      />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleResetPassword}
        activeOpacity={0.8}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.light.buttonText} />
        ) : (
          <Text style={styles.buttonText}>Сохранить пароль</Text>
        )}
      </TouchableOpacity>

      <View style={styles.links}>
        <TouchableOpacity onPress={() => setStep('code')}>
          <Text style={styles.link}>Назад</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ——— Восстановление деактивированного аккаунта ———
function RestoreAccountModal({
  visible,
  email,
  onClose,
}: {
  visible: boolean;
  email: string;
  onClose: () => void;
}) {
  const { refreshUser } = useAuth();
  const { showSuccess } = useToast();
  const [step, setStep] = useState<'info' | 'code'>('info');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestCode = async () => {
    setLoading(true);
    setError('');
    try {
      await authApi.requestRestore(email);
      showSuccess('Код отправлен на почту');
      setStep('code');
    } catch (e) {
      if (isApiError(e)) {
        setError(e.message || 'Ошибка');
      } else {
        setError('Ошибка соединения');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== CODE_LENGTH) return;
    setLoading(true);
    setError('');
    try {
      await authApi.verifyRestore({ email, code });
      showSuccess('Аккаунт восстановлен');
      await refreshUser();
      onClose();
    } catch (e) {
      if (isApiError(e)) {
        setError(e.message || 'Неверный код');
      } else {
        setError('Ошибка соединения');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('info');
    setCode('');
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.box}>
          {step === 'info' ? (
            <>
              <Text style={modalStyles.title}>Аккаунт деактивирован</Text>
              <Text style={modalStyles.subtitle}>
                Ваш аккаунт был деактивирован. Вы можете восстановить его,
                подтвердив свою почту.{'\n\n'}
                На {email} будет отправлен код подтверждения.
              </Text>
              {error ? <Text style={modalStyles.error}>{error}</Text> : null}
              <View style={modalStyles.buttons}>
                <TouchableOpacity style={modalStyles.buttonSecondary} onPress={handleClose}>
                  <Text style={modalStyles.buttonSecondaryText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={modalStyles.button}
                  onPress={handleRequestCode}
                  disabled={loading}
                >
                  <Text style={modalStyles.buttonText}>
                    {loading ? 'Отправка...' : 'Восстановить'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={modalStyles.title}>Введите код</Text>
              <Text style={modalStyles.subtitle}>
                Введите 6-значный код, отправленный на {email}
              </Text>
              {error ? <Text style={modalStyles.error}>{error}</Text> : null}
              <TextInput
                style={[
                  modalStyles.codeInput,
                  Platform.OS === 'web' && ({
                    outlineStyle: 'none',
                    outlineWidth: 0,
                  } as Record<string, unknown>),
                ]}
                value={code}
                onChangeText={(t) => { setCode(t.replace(/\D/g, '').slice(0, CODE_LENGTH)); setError(''); }}
                placeholder="000000"
                placeholderTextColor={Colors.light.placeholder}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}
                editable={!loading}
              />
              <View style={modalStyles.buttons}>
                <TouchableOpacity style={modalStyles.buttonSecondary} onPress={() => setStep('info')}>
                  <Text style={modalStyles.buttonSecondaryText}>Назад</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modalStyles.button, code.length !== CODE_LENGTH && modalStyles.buttonDisabled]}
                  onPress={handleVerifyCode}
                  disabled={code.length !== CODE_LENGTH || loading}
                >
                  <Text style={modalStyles.buttonText}>
                    {loading ? 'Проверка...' : 'Подтвердить'}
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
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 4,
  },
  form: {
    width: '100%',
  },
  fieldGroup: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  welcomeTitle: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    color: Colors.light.link,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 22,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    color: Colors.light.link,
    marginBottom: 22,
    textAlign: 'center'
  },
  button: {
    backgroundColor: Colors.light.button,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.buttonText,
  },
  links: {
    alignItems: 'center',
    gap: 14,
  },
  loginOptionsRow: {
    marginTop: 2,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: Colors.light.button,
    borderColor: Colors.light.button,
  },
  rememberMeText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkHint: {
    fontSize: 16,
    color: Colors.light.link,
  },
  link: {
    fontSize: 16,
    color: Colors.dark.link,
    textDecorationLine: 'none',
  },
  apiError: {
    fontSize: 15,
    color: '#DC2626',
    marginBottom: 14,
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 20,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 420,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.link,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  error: {
    fontSize: 14,
    color: '#DC2626',
    marginBottom: 12,
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
