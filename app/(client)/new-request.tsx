import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useNotifications } from '@/contexts/notification-context';
import { useToast } from '@/contexts/toast-context';
import { isApiError, type User } from '@/lib/auth-api';
import { photosApi, requestsApi } from '@/lib/requests-api';

const isWeb = Platform.OS === 'web';

const SERVICE_OPTIONS = [
  { id: 1, label: 'Диагностика' },
  { id: 2, label: 'Сборка ПК' },
  { id: 3, label: 'Апгрейд' },
  { id: 4, label: 'Обслуживание' },
  { id: 5, label: 'Софт' },
];

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE_MB = 10;

// Модальное окно для неподтверждённой почты
function EmailNotVerifiedModal({
  visible,
  onClose,
  onGoToProfile,
}: {
  visible: boolean;
  onClose: () => void;
  onGoToProfile: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.box}>
          <View style={modalStyles.header}>
            <MaterialIcons name="warning" size={48} color="#D97706" />
            <Text style={modalStyles.title}>Почта не подтверждена</Text>
            <Text style={modalStyles.subtitle}>
              Для создания заявки необходимо подтвердить адрес электронной почты.
              Перейдите в профиль и подтвердите почту, чтобы продолжить.
            </Text>
          </View>
          <View style={modalStyles.buttons}>
            <TouchableOpacity style={modalStyles.buttonSecondary} onPress={onClose}>
              <Text style={modalStyles.buttonSecondaryText}>Закрыть</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.button} onPress={onGoToProfile}>
              <Text style={modalStyles.buttonText}>Перейти в профиль</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function NewRequestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const { refresh: refreshNotifications } = useNotifications();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requestTypeId, setRequestTypeId] = useState(0);
  const [images, setImages] = useState<{ uri: string; base64?: string }[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailModalVisible, setEmailModalVisible] = useState(false);

  const [titleError, setTitleError] = useState('');
  const [serviceError, setServiceError] = useState('');
  const [apiError, setApiError] = useState('');

  const [titleFocused, setTitleFocused] = useState(false);
  const [descFocused, setDescFocused] = useState(false);

  const emailVerified =
    user?.emailVerified ?? (user as User & { email_verified?: boolean })?.email_verified ?? false;

  const selectedServiceLabel = SERVICE_OPTIONS.find((o) => o.id === requestTypeId)?.label || 'Выберите тип услуги';

  const handlePickImages = async () => {
    if (images.length >= MAX_IMAGES) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: MAX_IMAGES - images.length,
        base64: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets
          .slice(0, MAX_IMAGES - images.length)
          .map((asset) => ({
            uri: asset.uri,
            base64: asset.base64 ?? undefined,
          }));
        setImages([...images, ...newImages]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSelectService = (id: number) => {
    setRequestTypeId(id);
    setServiceError('');
    setDropdownOpen(false);
  };

  const handleCancel = () => {
    router.push('/(client)/requests');
  };

  const handleGoToProfile = () => {
    setEmailModalVisible(false);
    router.push('/(client)/profile');
  };

  const handleSubmit = async () => {
    // Проверка на подтверждённую почту
    if (!emailVerified) {
      setEmailModalVisible(true);
      return;
    }

    let ok = true;
    setApiError('');

    if (!title.trim()) {
      setTitleError('Введите заголовок заявки');
      ok = false;
    } else {
      setTitleError('');
    }

    if (requestTypeId === 0) {
      setServiceError('Выберите тип услуги');
      ok = false;
    } else {
      setServiceError('');
    }

    if (!ok) return;

    setLoading(true);
    try {
      const createdRequest = await requestsApi.createRequest({
        title: title.trim(),
        description: description.trim() || undefined,
        requestTypeId,
      });

      // Загружаем фотографии если есть
      if (images.length > 0 && createdRequest.id) {
        for (let i = 0; i < images.length; i++) {
          try {
            await photosApi.uploadFromUri(createdRequest.id, images[i].uri, i);
          } catch (photoErr) {
            console.error('Ошибка загрузки фото:', photoErr);
          }
        }
      }

      showSuccess('Заявка успешно создана');
      refreshNotifications();
      router.push('/(client)/requests');
    } catch (e) {
      if (isApiError(e)) {
        setApiError(e.message || 'Ошибка создания заявки');
      } else {
        setApiError('Ошибка соединения');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.formBlock}>
        <Text style={styles.formTitle}>Создание заявки</Text>
        <Text style={styles.formSubtitle}>
          Заполните форму для создания новой заявки на обслуживание. Мы свяжемся с вами в ближайшее время.
        </Text>

        {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

        {/* Заголовок */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Заголовок заявки *</Text>
          <View
            style={[
              styles.inputWrapper,
              titleFocused && styles.inputWrapperFocused,
              titleError && styles.inputWrapperError,
            ]}
          >
            <TextInput
              style={[styles.input, isWeb && ({ outlineStyle: 'none' } as Record<string, unknown>)]}
              placeholder="Например: Диагностика ноутбука"
              placeholderTextColor={Colors.light.placeholder}
              value={title}
              onChangeText={(v) => { setTitle(v); setTitleError(''); setApiError(''); }}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTitleFocused(false)}
              editable={!loading}
            />
          </View>
          {titleError ? <Text style={styles.errorText}>{titleError}</Text> : null}
        </View>

        {/* Тип услуги */}
        <View style={[styles.field, { zIndex: 10 }]}>
          <Text style={styles.fieldLabel}>Тип услуги *</Text>
          <TouchableOpacity
            style={[styles.dropdown, serviceError && styles.dropdownError]}
            onPress={() => setDropdownOpen(!dropdownOpen)}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Text style={[styles.dropdownText, requestTypeId === 0 && styles.dropdownPlaceholder]}>
              {selectedServiceLabel}
            </Text>
            <MaterialIcons
              name={dropdownOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={24}
              color={Colors.light.link}
            />
          </TouchableOpacity>
          {dropdownOpen && (
            <View style={styles.dropdownMenu}>
              {SERVICE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.dropdownItem,
                    requestTypeId === option.id && styles.dropdownItemActive,
                  ]}
                  onPress={() => handleSelectService(option.id)}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      requestTypeId === option.id && styles.dropdownItemTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {serviceError ? <Text style={styles.errorText}>{serviceError}</Text> : null}
        </View>

        {/* Описание */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Описание</Text>
          <View
            style={[
              styles.inputWrapper,
              styles.textareaWrapper,
              descFocused && styles.inputWrapperFocused,
            ]}
          >
            <TextInput
              style={[
                styles.input,
                styles.textarea,
                isWeb && ({ outlineStyle: 'none' } as Record<string, unknown>),
              ]}
              placeholder="Опишите проблему или задачу подробнее..."
              placeholderTextColor={Colors.light.placeholder}
              value={description}
              onChangeText={setDescription}
              onFocus={() => setDescFocused(true)}
              onBlur={() => setDescFocused(false)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>
        </View>

        {/* Загрузка изображений */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Фотографии (до 3 шт.)</Text>
          <TouchableOpacity
            style={styles.uploadArea}
            onPress={handlePickImages}
            activeOpacity={0.7}
            disabled={loading || images.length >= MAX_IMAGES}
          >
            <MaterialCommunityIcons name="cloud-upload-outline" size={40} color={Colors.light.link} />
            <Text style={styles.uploadText}>
              Перетащите файлы сюда или нажмите для выбора
            </Text>
            <Text style={styles.uploadHint}>PNG, JPG до {MAX_IMAGE_SIZE_MB}MB</Text>
          </TouchableOpacity>

          {images.length > 0 && (
            <View style={styles.imagesRow}>
              {images.map((img, index) => (
                <View key={index} style={styles.imagePreview}>
                  <Image source={{ uri: img.uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => handleRemoveImage(index)}
                  >
                    <MaterialIcons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Кнопки */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Отменить</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.7}
            disabled={loading}
          >
            <MaterialIcons name="send" size={20} color={Colors.light.buttonText} />
            <Text style={styles.submitButtonText}>
              {loading ? 'Отправка...' : 'Отправить заявку'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <EmailNotVerifiedModal
        visible={emailModalVisible}
        onClose={() => setEmailModalVisible(false)}
        onGoToProfile={handleGoToProfile}
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
  formBlock: {
    backgroundColor: Colors.light.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 24,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 15,
    color: Colors.light.link,
    lineHeight: 22,
    marginBottom: 24,
  },
  apiError: {
    fontSize: 14,
    color: '#DC2626',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  field: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 8,
  },
  inputWrapper: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: Colors.light.background,
  },
  inputWrapperFocused: {
    borderColor: Colors.light.button,
  },
  inputWrapperError: {
    borderColor: '#DC2626',
  },
  textareaWrapper: {
    minHeight: 120,
  },
  input: {
    fontSize: 16,
    color: Colors.light.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
    marginLeft: 4,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  dropdownError: {
    borderColor: '#DC2626',
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  dropdownPlaceholder: {
    color: Colors.light.placeholder,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
    zIndex: 1000,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(5, 148, 103, 0.1)',
  },
  dropdownItemText: {
    fontSize: 15,
    color: Colors.light.text,
  },
  dropdownItemTextActive: {
    color: Colors.light.button,
    fontWeight: '500',
  },
  uploadArea: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    gap: 8,
  },
  uploadText: {
    fontSize: 15,
    color: Colors.light.text,
    textAlign: 'center',
  },
  uploadHint: {
    fontSize: 13,
    color: Colors.light.link,
  },
  imagesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  imagePreview: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 15,
    color: Colors.light.text,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.button,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.buttonText,
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
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 420,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.link,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    backgroundColor: Colors.light.button,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.buttonText,
  },
  buttonSecondary: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  buttonSecondaryText: {
    fontSize: 15,
    color: Colors.light.text,
  },
});
