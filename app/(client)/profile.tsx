import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
  useWindowDimensions,
    View,
} from 'react-native';

import { InputWithIcon } from '@/components/auth/input-with-icon';
import { ChangePasswordModal } from '@/components/profile/change-password-modal';
import { EmailConfirmModal } from '@/components/profile/email-confirm-modal';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { authApi, isApiError, type User } from '@/lib/auth-api';
import { usersApi } from '@/lib/requests-api';
import { getUserFullName, getUserInitials } from '@/lib/user-utils';

const isWeb = Platform.OS === 'web';

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function ProfileSection({
  icon,
  title,
  children,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={profileStyles.section}>
      <View style={profileStyles.sectionHeader}>
        <MaterialCommunityIcons name={icon} size={22} color={Colors.light.button} />
        <Text style={profileStyles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function EditableField({
  label,
  value,
  editable,
  onChangeText,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  editable: boolean;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}) {
  return (
    <View style={profileStyles.fieldInline}>
      <Text style={profileStyles.fieldLabel}>{label}</Text>
      <InputWithIcon
        icon={icon}
        value={value || ''}
        onChangeText={onChangeText}
        placeholder={placeholder}
        readOnly={!editable}
      />
    </View>
  );
}

// Модальное окно предупреждения о почте
function EmailWarningModal({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.box}>
          <View style={modalStyles.header}>
            <MaterialIcons name="warning" size={40} color="#D97706" />
            <Text style={modalStyles.title}>Почта не подтверждена</Text>
            <Text style={modalStyles.subtitle}>
              Ваша электронная почта не подтверждена. Подтвердите её, чтобы получать
              важные уведомления и иметь возможность восстановить доступ к аккаунту.
            </Text>
          </View>
          <View style={modalStyles.buttons}>
            <TouchableOpacity style={modalStyles.buttonSecondary} onPress={onClose} disabled={loading}>
              <Text style={modalStyles.buttonSecondaryText}>Закрыть</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.button} onPress={handleConfirm} disabled={loading}>
              <Text style={modalStyles.buttonText}>
                {loading ? 'Отправка...' : 'Подтвердить'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Модальное окно деактивации аккаунта
function DeactivateModal({
  visible,
  onClose,
  onConfirm,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.box}>
          <View style={modalStyles.header}>
            <MaterialIcons name="warning" size={40} color="#DC2626" />
            <Text style={[modalStyles.title, { color: '#DC2626' }]}>
              Деактивация аккаунта
            </Text>
            <Text style={modalStyles.subtitle}>
              Вы уверены, что хотите деактивировать свой аккаунт?{'\n\n'}
              Ваш аккаунт будет временно отключён. Вы сможете восстановить его,
              повторно авторизовавшись в системе — на вашу почту будет отправлен
              код подтверждения для восстановления.
            </Text>
          </View>
          <View style={modalStyles.buttons}>
            <TouchableOpacity style={modalStyles.buttonSecondary} onPress={onClose}>
              <Text style={modalStyles.buttonSecondaryText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.button, { backgroundColor: '#DC2626' }]}
              onPress={onConfirm}
              disabled={loading}
            >
              <Text style={modalStyles.buttonText}>
                {loading ? 'Деактивация...' : 'Деактивировать'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ProfilePage() {
  const { width } = useWindowDimensions();
  const isPhone = width < 768;
  const { user, logout, refreshUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [emailWarningVisible, setEmailWarningVisible] = useState(false);
  const [emailConfirmVisible, setEmailConfirmVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [deactivateVisible, setDeactivateVisible] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [deactivateHovered, setDeactivateHovered] = useState(false);

  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (user) {
      setLastName(user.lastName ?? user.last_name ?? '');
      setFirstName(user.firstName ?? user.first_name ?? '');
      setMiddleName(user.middleName ?? user.middle_name ?? '');
      setEmail(user.email ?? '');
      setPhone(user.phone ?? '');
    }
  }, [user]);

  const emailVerified =
    user?.emailVerified ?? (user as User & { email_verified?: boolean })?.email_verified ?? false;
  const roleName = user?.role?.name ?? 'Клиент';
  const createdAt = user?.createdAt ?? (user as User & { created_at?: string })?.created_at;

  const fullName = user ? getUserFullName(user) : '';
  const initials = user ? getUserInitials(user) : '?';

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    try {
      await usersApi.updateUser(user.id, {
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        middleName: middleName.trim() || null,
        email: email.trim(),
        phone: phone.trim(),
      });
      await refreshUser();
      setEditMode(false);
    } catch (e) {
      if (isApiError(e)) {
        console.error(e.message);
      } else {
        console.error(e);
      }
    }
  };

  const handleEmailIconPress = () => {
    if (!emailVerified) {
      setEmailWarningVisible(true);
    }
  };

  const handleOpenEmailConfirm = async () => {
    setEmailWarningVisible(false);
    // Запрашиваем код подтверждения почты
    try {
      await authApi.requestEmailVerification(user?.email ?? '');
      setEmailConfirmVisible(true);
    } catch (e) {
      console.error(e);
      // Всё равно открываем модальное окно
      setEmailConfirmVisible(true);
    }
  };

  const handleConfirmEmail = async (code: string) => {
    try {
      await authApi.verifyEmail({ email: user?.email ?? '', code });
      await refreshUser();
    } catch (e) {
      if (isApiError(e)) {
        throw new Error(e.message);
      }
      throw e;
    }
  };

  const handleOpenChangePassword = async () => {
    // Запрашиваем код для смены пароля
    try {
      await authApi.requestPasswordReset(user?.email ?? '');
      setChangePasswordVisible(true);
    } catch (e) {
      console.error(e);
      // Всё равно открываем модальное окно, ошибка отправки будет видна там
      setChangePasswordVisible(true);
    }
  };

  const handleChangePasswordCode = async (_code: string) => {
    // Код проверяется при смене пароля вместе с новым паролем
  };

  const handleChangePasswordSubmit = async (newPassword: string, code: string) => {
    try {
      await authApi.resetPassword({
        email: user?.email ?? '',
        code,
        newPassword,
      });
    } catch (e) {
      if (isApiError(e)) {
        throw new Error(e.message);
      }
      throw e;
    }
  };

  const handleDeactivate = async () => {
    setDeactivateLoading(true);
    try {
      await authApi.deactivateAccount();
      await logout();
    } catch (e) {
      console.error(e);
      setDeactivateLoading(false);
    }
  };

  const deactivateMouseProps = isWeb
    ? {
        onMouseEnter: () => setDeactivateHovered(true),
        onMouseLeave: () => setDeactivateHovered(false),
      }
    : {};

  if (!user) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isPhone && styles.contentPhone]}
      showsVerticalScrollIndicator={false}
    >
      {/* Блок профиля */}
      <View style={[styles.profileBlock, isPhone && styles.profileBlockPhone]}>
        {/* Хедер: аватар, инфо, дата и кнопка на одной линии */}
        <View style={[styles.profileHeader, isPhone && styles.profileHeaderPhone]}>
          <View style={[styles.avatar, isPhone && styles.avatarPhone]}>
            <Text style={[styles.avatarText, isPhone && styles.avatarTextPhone]}>{initials}</Text>
          </View>
          <View style={[styles.profileInfoColumn, isPhone && styles.profileInfoColumnPhone]}>
            <Text style={[styles.profileName, isPhone && styles.profileNamePhone]} numberOfLines={2}>{fullName}</Text>
            <Text style={styles.profileRole}>{roleName}</Text>
          </View>
          <View style={[styles.profileHeaderRight, isPhone && styles.profileHeaderRightPhone]}>
            <View style={[styles.profileDateBlock, isPhone && styles.profileDateBlockPhone]}>
              <MaterialCommunityIcons
                name="calendar"
                size={18}
                color={Colors.light.text}
                style={styles.calendarIcon}
              />
              <Text style={[styles.profileDate, isPhone && styles.profileDatePhone]}>
                Дата регистрации: {formatDate(createdAt)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.editButton, isPhone && styles.editButtonPhone]}
              onPress={() => (editMode ? handleSaveProfile() : setEditMode(true))}
            >
              <MaterialIcons
                name={editMode ? 'check' : 'edit'}
                size={18}
                color={Colors.light.buttonText}
              />
              <Text style={[styles.editButtonText, isPhone && styles.editButtonTextPhone]}>
                {editMode ? 'Сохранить' : 'Редактировать профиль'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Личные данные — поля в строку */}
        <ProfileSection icon="account-outline" title="Личные данные">
          <View style={[profileStyles.fieldsRow, isPhone && profileStyles.fieldsRowPhone]}>
            <EditableField
              label="Фамилия"
              value={editMode ? lastName : (user.lastName ?? user.last_name ?? '')}
              editable={editMode}
              onChangeText={setLastName}
              placeholder="Фамилия"
              icon="person"
            />
            <EditableField
              label="Имя"
              value={editMode ? firstName : (user.firstName ?? user.first_name ?? '')}
              editable={editMode}
              onChangeText={setFirstName}
              placeholder="Имя"
              icon="person"
            />
            <EditableField
              label="Отчество"
              value={editMode ? middleName : (user.middleName ?? user.middle_name ?? '')}
              editable={editMode}
              onChangeText={setMiddleName}
              placeholder="Отчество (необязательно)"
              icon="person"
            />
          </View>
        </ProfileSection>

        {/* Контактные данные — поля в строку */}
        <ProfileSection icon="card-account-details-outline" title="Контактные данные">
          <View style={[profileStyles.fieldsRow, isPhone && profileStyles.fieldsRowPhone]}>
            <View style={profileStyles.fieldInline}>
              <Text style={profileStyles.fieldLabel}>Почта</Text>
              <View style={profileStyles.emailFieldRow}>
                <View style={profileStyles.emailInputWrap}>
                  <InputWithIcon
                    icon="email"
                    value={editMode ? email : (user.email ?? '')}
                    onChangeText={setEmail}
                    placeholder="Почта"
                    readOnly={!editMode}
                  />
                </View>
                {!editMode && (
                  <TouchableOpacity
                    style={profileStyles.emailStatusIcon}
                    onPress={handleEmailIconPress}
                    activeOpacity={0.7}
                  >
                    {emailVerified ? (
                      <MaterialIcons name="verified" size={24} color={Colors.light.button} />
                    ) : (
                      <MaterialIcons name="info-outline" size={24} color="#D97706" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <EditableField
              label="Номер телефона"
              value={editMode ? phone : (user.phone ?? '')}
              editable={editMode}
              onChangeText={setPhone}
              placeholder="+7 (___) ___-__-__"
              icon="phone"
            />
          </View>
        </ProfileSection>

        {/* Безопасность */}
        <ProfileSection icon="shield-account-outline" title="Безопасность">
        <View style={[profileStyles.securityRow, isPhone && profileStyles.securityRowPhone]}>
          <Text style={profileStyles.securityText}>Пароль можно изменить для входа в систему</Text>

          <TouchableOpacity
            style={profileStyles.changePasswordButton}
            onPress={handleOpenChangePassword}
          >
            <Text style={profileStyles.changePasswordButtonText}>
              Изменить пароль
            </Text>
          </TouchableOpacity>
        </View>

          {/* Разделитель */}
          <View style={profileStyles.securityDivider} />

          {/* Ссылка деактивации */}
          <View
            style={[
              profileStyles.deactivateContainer,
              isPhone && profileStyles.deactivateContainerPhone,
            ]}
            {...deactivateMouseProps}
          >
            <Text style={profileStyles.securityLabel}>Приостановка действия учётной записи</Text>
            <View style={deactivateHovered && profileStyles.deactivateContainerHover}>
            <TouchableOpacity
              style={profileStyles.deactivateBtn}
              onPress={() => setDeactivateVisible(true)}
            >
              <MaterialIcons name="person-off" size={20} color="#DC2626" />
              <Text style={profileStyles.deactivateBtnText}>
                Деактивировать аккаунт
              </Text>
            </TouchableOpacity>
            </View>
          </View>
        </ProfileSection>
      </View>

      {/* Модальные окна */}
      <EmailWarningModal
        visible={emailWarningVisible}
        onClose={() => setEmailWarningVisible(false)}
        onConfirm={handleOpenEmailConfirm}
      />

      <EmailConfirmModal
        visible={emailConfirmVisible}
        email={user.email ?? ''}
        variant="email_confirm"
        onClose={() => setEmailConfirmVisible(false)}
        onConfirm={handleConfirmEmail}
      />

      <ChangePasswordModal
        visible={changePasswordVisible}
        email={user.email ?? ''}
        onClose={() => setChangePasswordVisible(false)}
        onCodeSubmit={handleChangePasswordCode}
        onPasswordSubmit={handleChangePasswordSubmit}
      />

      <DeactivateModal
        visible={deactivateVisible}
        onClose={() => setDeactivateVisible(false)}
        onConfirm={handleDeactivate}
        loading={deactivateLoading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  contentPhone: {
    paddingBottom: 20,
  },
  profileBlock: {
    backgroundColor: Colors.light.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 24,
  },
  profileBlockPhone: {
    borderRadius: 14,
    padding: 14,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexWrap: 'wrap',
    gap: 16,
  },
  profileHeaderPhone: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
    paddingBottom: 14,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPhone: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.buttonText,
  },
  avatarTextPhone: {
    fontSize: 22,
  },
  profileInfoColumn: {
    flex: 1,
    minWidth: 150,
  },
  profileInfoColumnPhone: {
    minWidth: 0,
    width: '100%',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  profileNamePhone: {
    fontSize: 20,
  },
  profileRole: {
    fontSize: 14,
    color: Colors.light.link,
  },
  profileHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 300,
    flexWrap: 'wrap',
  },
  profileHeaderRightPhone: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  profileDateBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileDateBlockPhone: {
    flexWrap: 'wrap',
  },
  calendarIcon: {
    marginRight: 8,
  },
  profileDate: {
    fontSize: 16,
    color: Colors.light.text,
  },
  profileDatePhone: {
    fontSize: 14,
    lineHeight: 20,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.button,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  editButtonPhone: {
    width: '100%',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.buttonText,
  },
  editButtonTextPhone: {
    fontSize: 13,
  },
});

const profileStyles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  fieldsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  fieldsRowPhone: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldInline: {
    flex: 1,
    minWidth: 200,
  },
  fieldLabel: {
    fontSize: 16,
    color: Colors.light.link,
    marginBottom: 6,
    marginLeft: 0,
  },
  emailFieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  emailInputWrap: {
    flex: 1,
    minWidth: 0,
  },
  emailStatusIcon: {
    padding: 8,
    marginTop: 4,
  },
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },  
  securityRowPhone: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    marginLeft: 0,
  },
  securityText: {
    fontSize: 16,
    color: Colors.light.link,
  },  
  changePasswordButton: {
    backgroundColor: Colors.light.button,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },  
  changePasswordButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.buttonText,
  },
  securityDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  deactivateContainer: {
    flexDirection: 'row',          
    alignItems: 'center',         
    justifyContent: 'space-between', 
    borderRadius: 12,              
  },
  deactivateContainerPhone: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 0,
  },
  deactivateContainerHover: {
    backgroundColor: 'rgba(220,38,38,0.05)',
    borderRadius: 16,
  },
  securityLabel: {
    fontSize: 16,
    color: Colors.light.link,
    marginLeft: 0,
  },
  deactivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,           
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  deactivateBtnText: {
    fontSize: 15,
    fontWeight: '600', 
    color: '#DC2626',
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.link,
    textAlign: 'center',
    lineHeight: 20,
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