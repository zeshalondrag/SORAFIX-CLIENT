import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatMessageBubble } from '@/components/chat-message-bubble';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useNotifications } from '@/contexts/notification-context';
import { useToast } from '@/contexts/toast-context';
import type { User } from '@/lib/auth-api';
import {
    chatApi,
    fileNameFromUrl,
    formatDateTime,
    formatPrice,
    formatRequestDate,
    getClientId,
    getCreatedAt,
    getEmployeeId,
    getIsPaid,
    getIsPriceConfirmed,
    getPhotoUrl,
    getPrice,
    getRequestTypeId,
    getStatusId,
    getUserDisplayFromName,
    getUserInitialsFromName,
    isPhotoForRequestSidebar,
    openAttachmentUrl,
    photosApi,
    requestsApi,
    SERVICE_TYPE_LABELS,
    STATUS_COLORS,
    STATUS_DESCRIPTIONS,
    STATUS_LABELS,
    statusHistoryApi,
    usersApi,
    type ChatMessage,
    type ChatUploadFile,
    type Photo,
    type Request,
    type StatusHistoryItem,
    type UserInfo,
} from '@/lib/requests-api';

const isWeb = Platform.OS === 'web';

// Аватар пользователя
function UserAvatar({ initials, size = 40 }: { initials: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
}

// Модальное окно редактирования сообщения
function EditMessageModal({
  visible,
  message,
  onClose,
  onSave,
}: {
  visible: boolean;
  message: ChatMessage | null;
  onClose: () => void;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (message) setText(message.text);
  }, [message]);

  const handleSave = async () => {
    if (!text.trim()) return;
    setLoading(true);
    await onSave(text.trim());
    setLoading(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.box}>
          <Text style={modalStyles.title}>Редактировать сообщение</Text>
          <TextInput
            style={[modalStyles.input, isWeb && ({ outlineStyle: 'none' } as Record<string, unknown>)]}
            value={text}
            onChangeText={setText}
            multiline
            placeholder="Введите текст сообщения"
            placeholderTextColor={Colors.light.placeholder}
          />
          <View style={modalStyles.buttons}>
            <TouchableOpacity style={modalStyles.buttonSecondary} onPress={onClose}>
              <Text style={modalStyles.buttonSecondaryText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.button, loading && modalStyles.buttonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={modalStyles.buttonText}>{loading ? 'Сохранение...' : 'Сохранить'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Модальное окно галереи фото
function PhotoGalleryModal({
  visible,
  photos,
  initialIndex,
  onClose,
}: {
  visible: boolean;
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const imageSize = Math.min(screenWidth * 0.85, screenHeight * 0.7);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, visible]);

  if (photos.length === 0) return null;

  const photo = photos[currentIndex];
  const url = getPhotoUrl(photo);

  const goNext = () => {
    if (currentIndex < photos.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={galleryStyles.overlay}>
        {/* Кнопка закрыть */}
        <TouchableOpacity style={galleryStyles.closeButton} onPress={onClose}>
          <MaterialIcons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Счётчик */}
        <View style={galleryStyles.counter}>
          <Text style={galleryStyles.counterText}>
            {currentIndex + 1} / {photos.length}
          </Text>
        </View>

        <View style={galleryStyles.content}>
          {/* Кнопка влево */}
          {currentIndex > 0 && (
            <TouchableOpacity style={galleryStyles.arrowButton} onPress={goPrev}>
              <MaterialIcons name="chevron-left" size={40} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          {currentIndex === 0 && <View style={galleryStyles.arrowSpacer} />}

          {/* Изображение */}
          <View style={[galleryStyles.imageContainer, { width: imageSize, height: imageSize }]}>
            <Image
              source={{ uri: url }}
              style={galleryStyles.image}
              resizeMode="contain"
            />
          </View>

          {/* Кнопка вправо */}
          {currentIndex < photos.length - 1 && (
            <TouchableOpacity style={galleryStyles.arrowButton} onPress={goNext}>
              <MaterialIcons name="chevron-right" size={40} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          {currentIndex === photos.length - 1 && <View style={galleryStyles.arrowSpacer} />}
        </View>
      </View>
    </Modal>
  );
}

export default function RequestDetailPage() {
  const { width: windowWidth } = useWindowDimensions();
  const isPhone = windowWidth < 768;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const { refresh: refreshNotifications } = useNotifications();
  const scrollViewRef = useRef<ScrollView>(null);

  const [request, setRequest] = useState<Request | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [clientInfo, setClientInfo] = useState<UserInfo | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<UserInfo | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [editMessage, setEditMessage] = useState<ChatMessage | null>(null);
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 });
  const [backHovered, setBackHovered] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Price editing
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [newPrice, setNewPrice] = useState('');

  // Employee assignment
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [technicians, setTechnicians] = useState<UserInfo[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  const [loadingTechs, setLoadingTechs] = useState(false);

  // Cancel / Close request
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [generatingContract, setGeneratingContract] = useState(false);
  const [deletingContract, setDeletingContract] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<
    | { source: 'file'; file: File; name: string }
    | { source: 'native'; upload: ChatUploadFile; name: string }
    | null
  >(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const drawerTranslate = useRef(new Animated.Value(0)).current;

  const requestId = parseInt(id || '0', 10);
  const currentUserId = user?.id;

  const emailVerified = user?.emailVerified ?? (user as User & { email_verified?: boolean })?.email_verified ?? false;

  const loadData = useCallback(async () => {
    if (!requestId) return;
    try {
      const [reqData, chatData, historyData, photosData] = await Promise.all([
        requestsApi.getRequest(requestId),
        chatApi.getMessages(requestId).catch(() => []),
        statusHistoryApi.getHistory(requestId).catch(() => []),
        photosApi.getPhotos(requestId).catch(() => []),
      ]);
      setRequest(reqData);
      setMessages(chatData);
      setPhotos(photosData);
      setStatusHistory(historyData.sort((a, b) =>
        new Date(a.changedAt || a.changed_at || '').getTime() -
        new Date(b.changedAt || b.changed_at || '').getTime()
      ));

      // Загружаем данные клиента
      const clientId = getClientId(reqData);
      if (clientId) {
        const client = await usersApi.getUser(clientId).catch(() => null);
        setClientInfo(client);
      }

      // Загружаем данные исполнителя
      const employeeId = getEmployeeId(reqData);
      if (employeeId) {
        const employee = await usersApi.getUser(employeeId).catch(() => null);
        setEmployeeInfo(employee);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadData();
    }, 1000);
    return () => clearInterval(intervalId);
  }, [loadData]);

  useEffect(() => {
    // Автопрокрутка к последнему сообщению
    if (messages.length > 0) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const requestGalleryPhotos = useMemo(
    () => photos.filter(isPhotoForRequestSidebar),
    [photos]
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSendMessage = async () => {
    if (sending || !requestId) return;
    const hasText = messageText.trim().length > 0;
    const hasFile = pendingAttachment != null;
    if (!hasText && !hasFile) return;
    if (!emailVerified) {
      showError('Для отправки сообщений необходимо подтвердить почту');
      return;
    }
    setSending(true);
    try {
      if (hasFile) {
        const { messageId } =
          pendingAttachment.source === 'file'
            ? await chatApi.uploadMessageFile(requestId, pendingAttachment.file)
            : await chatApi.uploadMessageFile(requestId, pendingAttachment.upload);
        const caption = messageText.trim();
        if (caption) {
          await chatApi.updateMessage(messageId, { text: caption });
        }
        setPendingAttachment(null);
        setMessageText('');
        await loadData();
      } else {
        const text = messageText.trim();
        const newMessage = await chatApi.sendMessage({
          requestId,
          text,
        });
        setMessages((prev) => [
          ...prev,
          {
            ...newMessage,
            text: newMessage.text || text,
            firstName: newMessage.firstName || user?.firstName || user?.first_name || '',
            lastName: newMessage.lastName || user?.lastName || user?.last_name || '',
          },
        ]);
        setMessageText('');
      }
    } catch {
      showError('Ошибка отправки сообщения');
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (text: string) => {
    if (!editMessage) return;
    try {
      await chatApi.updateMessage(editMessage.id, { text });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === editMessage.id ? { ...m, text, isEdited: true, updatedAt: new Date().toISOString() } : m
        )
      );
      setEditMessage(null);
      showSuccess('Сообщение обновлено');
    } catch {
      showError('Ошибка обновления сообщения');
    }
  };

  const handleUpdatePrice = async () => {
    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      showError('Введите корректную сумму');
      return;
    }
    try {
      await requestsApi.updateRequestPrice(requestId, priceNum);
      showSuccess('Цена обновлена');
      setPriceModalVisible(false);
      setNewPrice('');
      refreshNotifications();
      loadData();
    } catch {
      showError('Ошибка обновления цены');
    }
  };

  const handleOpenAssign = async () => {
    setAssignModalVisible(true);
    setLoadingTechs(true);
    try {
      const techs = await usersApi.getTechnicians();
      setTechnicians(techs);
    } catch {
      showError('Ошибка загрузки списка специалистов');
    } finally {
      setLoadingTechs(false);
    }
  };

  const handleAssignEmployee = async () => {
    if (!selectedTechId) return;
    try {
      await requestsApi.assignEmployee(requestId, selectedTechId);
      showSuccess('Исполнитель назначен');
      setAssignModalVisible(false);
      setSelectedTechId(null);
      refreshNotifications();
      loadData();
    } catch {
      showError('Ошибка назначения исполнителя');
    }
  };

  const handleCancelRequest = async () => {
    setCancelling(true);
    try {
      await requestsApi.cancelRequest(requestId);
      showSuccess('Заявка отменена');
      setCancelModalVisible(false);
      refreshNotifications();
      loadData();
    } catch {
      showError('Ошибка отмены заявки');
    } finally {
      setCancelling(false);
    }
  };

  const handleCloseRequest = async () => {
    setClosing(true);
    try {
      await requestsApi.closeRequest(requestId);
      showSuccess('Заявка закрыта');
      setCloseModalVisible(false);
      refreshNotifications();
      loadData();
    } catch {
      showError('Ошибка закрытия заявки');
    } finally {
      setClosing(false);
    }
  };

  const handleVerifyRequest = async (isApproved: boolean) => {
    setVerifying(true);
    try {
      await requestsApi.verifyRequest(requestId, isApproved);
      setVerifyModalVisible(false);
      showSuccess(isApproved ? 'Выполнение подтверждено' : 'Выполнение отклонено');
      refreshNotifications();
      loadData();
    } catch {
      showError('Ошибка проверки выполнения');
    } finally {
      setVerifying(false);
    }
  };

  const handleGenerateContract = async () => {
    if (!request) return;
    const hasConfirmedPrice = getPrice(request) > 0 && getIsPriceConfirmed(request);
    if (!hasConfirmedPrice) {
      showError('Сначала нужна подтвержденная клиентом цена');
      return;
    }
    if (!getEmployeeId(request)) {
      showError('Сначала назначьте технического специалиста');
      return;
    }
    setGeneratingContract(true);
    try {
      await requestsApi.generateContract(requestId);
      showSuccess('Договор сформирован');
      refreshNotifications();
      loadData();
    } catch {
      showError('Ошибка формирования договора');
    } finally {
      setGeneratingContract(false);
    }
  };

  const handleDeleteContract = async (attachmentId: number) => {
    setDeletingContract(true);
    try {
      await photosApi.deletePhoto(attachmentId);
      showSuccess('Договор удален');
      await loadData();
    } catch (e) {
      const message =
        (e as { message?: string })?.message || 'Ошибка удаления договора';
      showError(message);
    } finally {
      setDeletingContract(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleDeleteMessage = async () => {
    if (!actionMessage) return;
    try {
      await chatApi.deleteMessage(actionMessage.id);
      setMessages((prev) => prev.filter((m) => m.id !== actionMessage.id));
      setActionMessage(null);
      showSuccess('Сообщение удалено');
    } catch {
      showError('Ошибка удаления сообщения');
    }
  };

  const handlePickAttachment = async () => {
    if (!requestId || sending) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'application/pdf'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      if ((file.size ?? 0) > 15 * 1024 * 1024) {
        showError('Файл больше 15 МБ');
        return;
      }
      const webAsset = file as typeof file & { file?: File };
      if (isWeb && webAsset.file instanceof File) {
        setPendingAttachment({ source: 'file', file: webAsset.file, name: file.name || 'Файл' });
      } else {
        setPendingAttachment({
          source: 'native',
          upload: {
            uri: file.uri,
            name: file.name,
            type: file.mimeType || 'application/octet-stream',
          },
          name: file.name || 'Файл',
        });
      }
    } catch {
      showError('Ошибка выбора файла');
    }
  };

  const openRequestDrawer = useCallback(() => {
    drawerTranslate.setValue(-windowWidth);
    setDrawerVisible(true);
  }, [drawerTranslate, windowWidth]);

  const closeRequestDrawer = useCallback(() => {
    Animated.timing(drawerTranslate, {
      toValue: -windowWidth,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setDrawerVisible(false);
    });
  }, [drawerTranslate, windowWidth]);

  useEffect(() => {
    if (!drawerVisible) return;
    Animated.timing(drawerTranslate, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [drawerVisible, drawerTranslate, windowWidth]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Заявка не найдена</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>Вернуться назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusId = getStatusId(request);
  const statusColor = STATUS_COLORS[statusId] || '#6B7280';
  const statusLabel = STATUS_LABELS[statusId] || 'Неизвестно';
  const serviceTypeId = getRequestTypeId(request);
  const serviceLabel = SERVICE_TYPE_LABELS[serviceTypeId] || 'Услуга';
  const createdAt = formatRequestDate(getCreatedAt(request));
  const isPaid = getIsPaid(request);
  const hasPrice = getPrice(request) > 0;
  const isPriceConfirmed = getIsPriceConfirmed(request);
  const isWaitingPriceConfirmation = hasPrice && !isPriceConfirmed;
  const price = isPriceConfirmed
    ? formatPrice(getPrice(request))
    : isWaitingPriceConfirmation
      ? 'Ожидает подтверждение'
      : 'Назначить';
  const canSendMessage = (!!messageText.trim() || pendingAttachment != null) && !sending;
  const contractAttachment =
    photos.find((item) => {
      const attachmentType = (item.attachmentType ?? item.attachment_type ?? '').toLowerCase();
      const fileType = (item.fileType ?? item.file_type ?? '').toLowerCase();
      const originalName = (item.originalName ?? item.original_name ?? '').toLowerCase();
      const url = getPhotoUrl(item).toLowerCase();
      return (
        attachmentType.includes('contract') ||
        originalName.includes('договор') ||
        originalName.includes('contract') ||
        (fileType === 'application/pdf' && (url.includes('/contract') || url.includes('/contracts/')))
      );
    }) ?? null;
  const contractUrl = contractAttachment ? getPhotoUrl(contractAttachment) : '';
  const contractFileName = contractAttachment
    ? (contractAttachment.originalName ?? fileNameFromUrl(contractUrl, 'Договор.pdf'))
    : '';

  // Chat header: показываем клиента и специалиста
  const clientName = clientInfo
    ? getUserDisplayFromName(clientInfo.firstName, clientInfo.lastName)
    : 'Клиент';
  const clientInitials = clientInfo
    ? getUserInitialsFromName(clientInfo.firstName, clientInfo.lastName)
    : 'К';
  const specialistName = employeeInfo
    ? getUserDisplayFromName(employeeInfo.firstName, employeeInfo.lastName)
    : null;
  const specialistInitials = employeeInfo
    ? getUserInitialsFromName(employeeInfo.firstName, employeeInfo.lastName)
    : 'С';

  const managerSidebarProps = {
    request,
    clientInfo,
    employeeInfo,
    statusHistory,
    requestGalleryPhotos,
    contractAttachment,
    contractUrl,
    contractFileName,
    statusId,
    statusColor,
    statusLabel,
    serviceLabel,
    createdAt,
    isPaid,
    price,
    isPriceConfirmed,
    isWaitingPriceConfirmation,
    generatingContract,
    deletingContract,
    onGenerateContract: handleGenerateContract,
    onDeleteContract: handleDeleteContract,
    onOpenAssign: handleOpenAssign,
    onPhotoPress: (idx: number) => {
      setGalleryIndex(idx);
      setGalleryVisible(true);
    },
    onEditPrice: () => {
      setNewPrice(String(getPrice(request)));
      setPriceModalVisible(true);
    },
    onVerifyPress: () => setVerifyModalVisible(true),
    onClosePress: () => setCloseModalVisible(true),
    onCancelPress: () => setCancelModalVisible(true),
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isPhone && styles.containerPhone]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {!isPhone ? (
        <Pressable
          style={[styles.backLink, backHovered && styles.backLinkHovered]}
          onPress={handleGoBack}
          onHoverIn={() => setBackHovered(true)}
          onHoverOut={() => setBackHovered(false)}
        >
          <MaterialIcons name="arrow-back" size={20} color="#1F2937" />
          <Text style={styles.backLinkText}>Вернуться назад</Text>
        </Pressable>
      ) : (
        <View style={[styles.phoneToolbar, { paddingTop: Math.max(insets.top, 8) }]}>
          <Pressable
            style={styles.phoneBackRow}
            onPress={handleGoBack}
            accessibilityRole="button"
            accessibilityLabel="Вернуться назад"
          >
            <MaterialIcons name="arrow-back" size={20} color="#1F2937" />
            <Text style={styles.phoneBackText} numberOfLines={1}>
              Вернуться назад
            </Text>
          </Pressable>
          <TouchableOpacity
            onPress={openRequestDrawer}
            style={styles.phoneAboutRow}
            accessibilityRole="button"
            accessibilityLabel="Информация о заявке"
          >
            <Text style={styles.phoneAboutText}>Информация о заявке</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#1F2937" />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.mainContent, isPhone && styles.mainContentPhone]}>
        <View style={[styles.chatSection, isPhone && styles.chatSectionPhone]}>
          <View style={[styles.chatHeader, isPhone && styles.chatHeaderPhone]}>
            <UserAvatar initials={clientInitials} size={isPhone ? 30 : 36} />
            <View style={styles.chatHeaderInfo}>
              <Text style={[styles.chatHeaderName, isPhone && styles.chatHeaderNamePhone]}>{clientName}</Text>
              <Text style={[styles.chatHeaderRole, isPhone && styles.chatHeaderRolePhone]}>Клиент</Text>
            </View>
            {specialistName && (
              <>
                <View style={[styles.chatHeaderDivider, isPhone && styles.chatHeaderDividerPhone]} />
                <UserAvatar initials={specialistInitials} size={isPhone ? 30 : 36} />
                <View style={styles.chatHeaderInfo}>
                  <Text style={[styles.chatHeaderName, isPhone && styles.chatHeaderNamePhone]}>{specialistName}</Text>
                  <Text style={[styles.chatHeaderRole, isPhone && styles.chatHeaderRolePhone]}>Специалист</Text>
                </View>
              </>
            )}
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={[
              styles.messagesContent,
              isPhone && styles.messagesContentPhone,
              messages.length === 0 && styles.messagesContentEmpty,
            ]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.light.button]} />
            }
          >
            {messages.length === 0 ? (
              <View style={[styles.emptyMessages, isPhone && styles.emptyMessagesPhone]}>
                <MaterialCommunityIcons name="chat-outline" size={isPhone ? 52 : 64} color="#D1D5DB" />
                <Text style={[styles.emptyMessagesText, isPhone && styles.emptyMessagesTextPhone]}>
                  Сообщений пока нет
                </Text>
                <Text style={[styles.emptyMessagesHint, isPhone && styles.emptyMessagesHintPhone]}>
                  Напишите первым, чтобы начать общение
                </Text>
              </View>
            ) : (
              messages.map((msg) => (
                <ChatMessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.userId === currentUserId}
                  compact={isPhone}
                  onLongPress={
                    msg.userId === currentUserId
                      ? (x, y) => {
                          setActionMenuPosition({ x, y });
                          setActionMessage(msg);
                        }
                      : undefined
                  }
                />
              ))
            )}
          </ScrollView>

          {statusId === 6 || statusId === 7 ? (
            <View style={[styles.chatClosedBar, isPhone && styles.chatClosedBarPhone]}>
              <MaterialIcons name="lock" size={isPhone ? 16 : 18} color={Colors.light.link} />
              <Text style={[styles.chatClosedText, isPhone && styles.chatClosedTextPhone]}>
                Заявка закрыта. Отправка сообщений недоступна.
              </Text>
            </View>
          ) : (
            <View style={[styles.inputContainer, isPhone && styles.inputContainerPhone]}>
              {pendingAttachment && (
                <View style={[styles.pendingAttachmentBar, isPhone && styles.pendingAttachmentBarPhone]}>
                  <MaterialIcons name="insert-drive-file" size={isPhone ? 16 : 18} color={Colors.light.button} />
                  <Text
                    numberOfLines={1}
                    style={[styles.pendingAttachmentName, isPhone && styles.pendingAttachmentNamePhone]}
                  >
                    {pendingAttachment.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setPendingAttachment(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="close" size={isPhone ? 18 : 20} color={Colors.light.link} />
                  </TouchableOpacity>
                </View>
              )}
              <View style={[styles.inputRow, isPhone && styles.inputRowPhone]}>
                <TouchableOpacity
                  style={[styles.attachButton, isPhone && styles.attachButtonPhone]}
                  onPress={handlePickAttachment}
                  disabled={sending}
                >
                  <MaterialIcons name="attach-file" size={isPhone ? 20 : 22} color={Colors.light.button} />
                </TouchableOpacity>
                <View
                  style={[
                    styles.messageInputWrapper,
                    isPhone && styles.messageInputWrapperPhone,
                    { borderColor: inputFocused ? Colors.light.button : '#E5E7EB' },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.messageInput,
                      isPhone && styles.messageInputPhone,
                      isWeb && ({ outlineStyle: 'none', outlineWidth: 0 } as Record<string, unknown>),
                    ]}
                    value={messageText}
                    onChangeText={setMessageText}
                    placeholder={
                      pendingAttachment ? 'Подпись к файлу (по желанию)...' : 'Введите сообщение...'
                    }
                    placeholderTextColor={Colors.light.placeholder}
                    multiline
                    maxLength={1000}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    isPhone && styles.sendButtonPhone,
                    !canSendMessage && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSendMessage}
                  disabled={!canSendMessage}
                >
                  <MaterialIcons name="send" size={isPhone ? 18 : 20} color={Colors.light.button} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {!isPhone && (
          <View style={styles.infoSection}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <ManagerRequestSidebarBody {...managerSidebarProps} />
            </ScrollView>
          </View>
        )}
      </View>

      <Modal
        visible={drawerVisible}
        transparent
        animationType="none"
        onRequestClose={closeRequestDrawer}
      >
        <View style={styles.drawerRoot}>
          <Animated.View
            style={[
              styles.drawerPanel,
              {
                width: windowWidth,
                transform: [{ translateX: drawerTranslate }],
              },
            ]}
          >
            <View style={[styles.drawerHeader, { paddingTop: Math.max(insets.top, 12) }]}>
              <Text style={styles.drawerHeaderTitle}>Информация о заявке</Text>
              <TouchableOpacity
                onPress={closeRequestDrawer}
                style={styles.drawerCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Закрыть"
              >
                <MaterialIcons name="close" size={26} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.drawerScroll}
              contentContainerStyle={styles.drawerScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <ManagerRequestSidebarBody {...managerSidebarProps} />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Модальное окно редактирования сообщения */}
      <EditMessageModal
        visible={!!editMessage}
        message={editMessage}
        onClose={() => setEditMessage(null)}
        onSave={handleEditMessage}
      />

      {actionMessage && (
        <View style={styles.actionMenuOverlay} pointerEvents="box-none">
          <Pressable style={styles.actionMenuBackdrop} onPress={() => setActionMessage(null)} />
          <View
            style={[
              styles.actionMenu,
              {
                left: Math.max(12, actionMenuPosition.x - 72),
                top: Math.max(12, actionMenuPosition.y - 82),
              },
            ]}
          >
            <TouchableOpacity
              style={styles.actionMenuButton}
              onPress={() => {
                setEditMessage(actionMessage);
                setActionMessage(null);
              }}
            >
              <Text style={styles.actionMenuButtonText}>Изменить</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionMenuButton} onPress={handleDeleteMessage}>
              <Text style={styles.actionMenuDeleteText}>Удалить</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Галерея фото */}
      <PhotoGalleryModal
        visible={galleryVisible}
        photos={requestGalleryPhotos}
        initialIndex={galleryIndex}
        onClose={() => setGalleryVisible(false)}
      />

      {/* Модальное окно редактирования цены */}
      <Modal visible={priceModalVisible} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.box}>
            <Text style={modalStyles.title}>Установить цену</Text>
            <TextInput
              style={[modalStyles.input, { minHeight: 48, textAlignVertical: 'center' }, isWeb && ({ outlineStyle: 'none' } as any)]}
              value={newPrice}
              onChangeText={setNewPrice}
              placeholder="Введите сумму"
              placeholderTextColor={Colors.light.placeholder}
              keyboardType="numeric"
            />
            <View style={modalStyles.buttons}>
              <TouchableOpacity style={modalStyles.buttonSecondary} onPress={() => setPriceModalVisible(false)}>
                <Text style={modalStyles.buttonSecondaryText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.button} onPress={handleUpdatePrice}>
                <Text style={modalStyles.buttonText}>Подтвердить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модальное окно назначения исполнителя */}
      <Modal visible={assignModalVisible} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.box, { maxWidth: 480 }]}>
            <Text style={modalStyles.title}>Назначить специалиста</Text>
            {loadingTechs ? (
              <Text style={{ textAlign: 'center', color: Colors.light.link, padding: 20 }}>Загрузка...</Text>
            ) : technicians.length === 0 ? (
              <Text style={{ textAlign: 'center', color: Colors.light.link, padding: 20 }}>Специалисты не найдены</Text>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {technicians.map((tech) => (
                  <TouchableOpacity
                    key={tech.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      padding: 12, borderRadius: 12, marginBottom: 8,
                      backgroundColor: selectedTechId === tech.id ? 'rgba(5,148,103,0.1)' : '#F9FAFB',
                      borderWidth: selectedTechId === tech.id ? 2 : 1,
                      borderColor: selectedTechId === tech.id ? Colors.light.button : '#E5E7EB',
                    }}
                    onPress={() => setSelectedTechId(tech.id)}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.light.button, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '600' }}>
                        {(tech.firstName?.[0] ?? '') + (tech.lastName?.[0] ?? '')}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '500', color: Colors.light.text }}>{tech.firstName} {tech.lastName}</Text>
                      <Text style={{ fontSize: 13, color: Colors.light.link }}>{tech.email}</Text>
                    </View>
                    {selectedTechId === tech.id && (
                      <MaterialIcons name="check-circle" size={24} color={Colors.light.button} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <View style={[modalStyles.buttons, { marginTop: 16 }]}>
              <TouchableOpacity style={modalStyles.buttonSecondary} onPress={() => { setAssignModalVisible(false); setSelectedTechId(null); }}>
                <Text style={modalStyles.buttonSecondaryText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[modalStyles.button, !selectedTechId && { opacity: 0.5 }]} onPress={handleAssignEmployee} disabled={!selectedTechId}>
                <Text style={modalStyles.buttonText}>Подтвердить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модальное окно подтверждения отмены заявки */}
      <Modal visible={cancelModalVisible} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.box}>
            <Text style={modalStyles.title}>Отмена заявки</Text>
            <Text style={styles.confirmText}>
              Вы уверены, что хотите отменить заявку «{request.title}»? Это действие нельзя будет отменить.
            </Text>
            <View style={modalStyles.buttons}>
              <TouchableOpacity style={modalStyles.buttonSecondary} onPress={() => setCancelModalVisible(false)}>
                <Text style={modalStyles.buttonSecondaryText}>Назад</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelConfirmButton, cancelling && modalStyles.buttonDisabled]}
                onPress={handleCancelRequest}
                disabled={cancelling}
              >
                <Text style={styles.cancelConfirmButtonText}>
                  {cancelling ? 'Отмена...' : 'Отменить заявку'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модальное окно подтверждения закрытия заявки */}
      <Modal visible={closeModalVisible} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.box}>
            <Text style={modalStyles.title}>Закрытие заявки</Text>
            <Text style={styles.confirmText}>
              Вы уверены, что хотите закрыть заявку «{request.title}»? Статус будет изменён на «Закрыта».
            </Text>
            <View style={modalStyles.buttons}>
              <TouchableOpacity style={modalStyles.buttonSecondary} onPress={() => setCloseModalVisible(false)}>
                <Text style={modalStyles.buttonSecondaryText}>Назад</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.button, closing && modalStyles.buttonDisabled]}
                onPress={handleCloseRequest}
                disabled={closing}
              >
                <Text style={modalStyles.buttonText}>
                  {closing ? 'Закрытие...' : 'Закрыть заявку'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модальное окно проверки выполнения */}
      <Modal visible={verifyModalVisible} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.box}>
            <Text style={modalStyles.title}>Проверка выполнения</Text>
            <Text style={styles.confirmText}>
              Подтвердить, что специалист корректно выполнил заявку «{request.title}»?
            </Text>
            <View style={modalStyles.buttons}>
              <TouchableOpacity
                style={[styles.verifyRejectButton, verifying && modalStyles.buttonDisabled]}
                onPress={() => handleVerifyRequest(false)}
                disabled={verifying}
              >
                <Text style={styles.verifyRejectButtonText}>Отклонить</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.verifyApproveButton, verifying && modalStyles.buttonDisabled]}
                onPress={() => handleVerifyRequest(true)}
                disabled={verifying}
              >
                <Text style={styles.verifyApproveButtonText}>
                  {verifying ? 'Сохранение...' : 'Подтвердить'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.link,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  backLinkHovered: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  backLinkText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: Colors.light.button,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 15,
    color: Colors.light.buttonText,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 24,
  },
  // Чат
  chatSection: {
    flex: 2,
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  chatHeaderRole: {
    fontSize: 13,
    color: Colors.light.link,
  },
  chatHeaderDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  chatHeaderNamePhone: {
    fontSize: 14,
  },
  chatHeaderRolePhone: {
    fontSize: 11,
  },
  chatHeaderDividerPhone: {
    height: 26,
    marginHorizontal: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  messagesContentPhone: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 9,
  },
  messagesContentEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMessages: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyMessagesText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6B7280',
  },
  emptyMessagesHint: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  emptyMessagesPhone: {
    paddingVertical: 40,
    gap: 10,
  },
  emptyMessagesTextPhone: {
    fontSize: 15,
  },
  emptyMessagesHintPhone: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  chatClosedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  chatClosedText: {
    fontSize: 14,
    color: Colors.light.link,
  },
  chatClosedBarPhone: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  chatClosedTextPhone: {
    fontSize: 12,
    flex: 1,
    flexShrink: 1,
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  inputContainerPhone: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputRowPhone: {
    gap: 8,
  },
  pendingAttachmentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pendingAttachmentName: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
  },
  pendingAttachmentBarPhone: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  pendingAttachmentNamePhone: {
    fontSize: 13,
  },
  messageInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  messageInputWrapperPhone: {
    borderRadius: 16,
    paddingHorizontal: 10,
    minHeight: 42,
    borderWidth: 1.5,
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    paddingVertical: 12,
    maxHeight: 50,
  },
  messageInputPhone: {
    fontSize: 14,
    paddingVertical: 9,
    maxHeight: 44,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(5, 148, 103, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 148, 103, 0.1)',
  },
  sendButtonPhone: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  attachButtonPhone: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  actionMenuOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 60,
  },
  actionMenuBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  actionMenu: {
    position: 'absolute',
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 144,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 7,
    overflow: 'hidden',
  },
  actionMenuButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionMenuButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  actionMenuDeleteText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EF4444',
  },
  // Информация
  infoSection: {
    flex: 1,
    minWidth: 320,
  },
  infoCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    marginBottom: 16,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  requestTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
  },
  requestDescription: {
    fontSize: 15,
    color: Colors.light.link,
    lineHeight: 22,
    marginBottom: 12,
  },
  serviceTypeLabel: {
    fontSize: 13,
    color: Colors.light.link,
    marginBottom: 6,
  },
  requestTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  requestTypeText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.text,
  },
  infoFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoFieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoFieldLabel: {
    fontSize: 14,
    color: Colors.light.link,
  },
  infoFieldValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  infoFieldValueMuted: {
    fontSize: 14,
    color: Colors.light.link,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  dividerLarge: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  userInlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userInlineName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  contactText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
  },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  historyContent: {
    flex: 1,
  },
  historyStatus: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 2,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  historyDate: {
    fontSize: 13,
    color: Colors.light.text,
  },
  historyDivider: {
    fontSize: 13,
    color: Colors.light.link,
  },
  historyDesc: {
    fontSize: 13,
    color: Colors.light.link,
  },
  avatar: {
    backgroundColor: Colors.light.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.light.buttonText,
    fontWeight: '600',
  },
  photosRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  actionButtonsRow: {
    gap: 10,
    marginBottom: 16,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  closeRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.button,
  },
  closeRequestButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.button,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmText: {
    fontSize: 15,
    color: Colors.light.link,
    lineHeight: 22,
    marginBottom: 20,
  },
  contractRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  contractGenerateButton: {
    backgroundColor: Colors.light.button,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  contractGenerateButtonText: {
    color: Colors.light.buttonText,
    fontWeight: '600',
    fontSize: 13,
  },
  contractFileBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  contractFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  contractFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flex: 1,
  },
  contractFileName: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  contractActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  contractActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(5, 148, 103, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  contractActionText: {
    color: Colors.light.button,
    fontWeight: '600',
    fontSize: 13,
  },
  contractDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  contractDeleteText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 13,
  },
  contractButtonDisabled: {
    opacity: 0.6,
  },
  verifyRejectButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyRejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  verifyApproveButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: Colors.light.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyApproveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelConfirmButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelConfirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  containerPhone: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 0,
    alignSelf: 'stretch',
    width: '100%',
  },
  phoneToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: Colors.light.background,
  },
  phoneBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
    paddingVertical: 6,
    paddingRight: 8,
  },
  phoneBackText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  phoneAboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    paddingVertical: 6,
    paddingLeft: 8,
  },
  phoneAboutText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  mainContentPhone: {
    flexDirection: 'column',
    gap: 0,
    flex: 1,
    minHeight: 0,
  },
  chatSectionPhone: {
    flex: 1,
    minHeight: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  chatHeaderPhone: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 6,
    flexWrap: 'wrap',
  },
  drawerRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  drawerPanel: {
    flex: 1,
    backgroundColor: Colors.light.background,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  drawerHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  drawerCloseBtn: {
    padding: 4,
  },
  drawerScroll: {
    flex: 1,
  },
  drawerScrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
});

type ManagerRequestSidebarProps = {
  request: Request;
  clientInfo: UserInfo | null;
  employeeInfo: UserInfo | null;
  statusHistory: StatusHistoryItem[];
  requestGalleryPhotos: Photo[];
  contractAttachment: Photo | null;
  contractUrl: string;
  contractFileName: string;
  statusId: number;
  statusColor: string;
  statusLabel: string;
  serviceLabel: string;
  createdAt: string;
  isPaid: boolean;
  price: string;
  isPriceConfirmed: boolean;
  isWaitingPriceConfirmation: boolean;
  generatingContract: boolean;
  deletingContract: boolean;
  onGenerateContract: () => void;
  onDeleteContract: (id: number) => void;
  onOpenAssign: () => void;
  onPhotoPress: (index: number) => void;
  onEditPrice: () => void;
  onVerifyPress: () => void;
  onClosePress: () => void;
  onCancelPress: () => void;
};

function ManagerRequestSidebarBody({
  request,
  clientInfo,
  employeeInfo,
  statusHistory,
  requestGalleryPhotos,
  contractAttachment,
  contractUrl,
  contractFileName,
  statusId,
  statusColor,
  statusLabel,
  serviceLabel,
  createdAt,
  isPaid,
  price,
  isPriceConfirmed,
  isWaitingPriceConfirmation,
  generatingContract,
  deletingContract,
  onGenerateContract,
  onDeleteContract,
  onOpenAssign,
  onPhotoPress,
  onEditPrice,
  onVerifyPress,
  onClosePress,
  onCancelPress,
}: ManagerRequestSidebarProps) {
  return (
    <>
            {/* Блок 1: Информация о заявке */}
            <View style={styles.infoCard}>
              {/* Заголовок заявки */}
              <Text style={styles.requestTitle}>{request.title}</Text>
              {request.description && (
                <Text style={styles.requestDescription}>{request.description}</Text>
              )}
              <View style={styles.divider} />
              <View style={styles.infoFieldRow}>
                <View style={styles.infoFieldLabelRow}>
                  <MaterialIcons name="build" size={16} color={Colors.light.link} />
                  <Text style={styles.infoFieldLabel}>Тип услуги</Text>
                </View>

                <View style={styles.requestTypeBadge}>
                  <Text style={styles.requestTypeText}>{serviceLabel}</Text>
                </View>
              </View>

              {/* Дата создания */}
              <View style={styles.infoFieldRow}>
                <View style={styles.infoFieldLabelRow}>
                  <MaterialIcons name="calendar-today" size={16} color={Colors.light.link} />
                  <Text style={styles.infoFieldLabel}>Дата создания</Text>
                </View>
                <Text style={styles.infoFieldValue}>{createdAt}</Text>
              </View>

              {/* Текущий статус */}
              <View style={styles.infoFieldRow}>
                <View style={styles.infoFieldLabelRow}>
                  <MaterialIcons name="flag" size={16} color={Colors.light.link} />
                  <Text style={styles.infoFieldLabel}>Текущий статус</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>

              {/* Стоимость - с редактированием */}
              <View style={styles.infoFieldRow}>
                <View style={styles.infoFieldLabelRow}>
                  <MaterialIcons name="payments" size={16} color={Colors.light.link} />
                  <Text style={styles.infoFieldLabel}>Стоимость</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.infoFieldValue}>{price}</Text>
                  {!isPriceConfirmed && !isWaitingPriceConfirmation && (
                    <TouchableOpacity onPress={onEditPrice}>
                      <MaterialIcons name="edit" size={18} color={Colors.light.button} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.infoFieldRow}>
                <View style={styles.infoFieldLabelRow}>
                  <MaterialIcons name="credit-card" size={16} color={Colors.light.link} />
                  <Text style={styles.infoFieldLabel}>Оплата</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: (isPaid ? '#10B981' : '#F59E0B') + '20' }]}>
                  <View style={[styles.statusDot, { backgroundColor: isPaid ? '#10B981' : '#F59E0B' }]} />
                  <Text style={[styles.statusText, { color: isPaid ? '#10B981' : '#F59E0B' }]}>
                    {isPaid ? 'Оплачено' : 'Не оплачено'}
                  </Text>
                </View>
              </View>

              <View style={styles.dividerLarge} />

              {/* Исполнитель - с кнопкой назначить */}
              <View style={styles.infoFieldRow}>
                <View style={styles.infoFieldLabelRow}>
                  <MaterialIcons name="person" size={16} color={Colors.light.link} />
                  <Text style={styles.infoFieldLabel}>Исполнитель</Text>
                </View>
                {employeeInfo ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <UserAvatar initials={getUserInitialsFromName(employeeInfo.firstName, employeeInfo.lastName)} size={32} />
                    <Text style={styles.userInlineName}>{employeeInfo.firstName} {employeeInfo.lastName}</Text>
                    <TouchableOpacity onPress={onOpenAssign}>
                      <MaterialIcons name="edit" size={18} color={Colors.light.button} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={onOpenAssign} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14 }}>Назначить</Text>
                    <MaterialIcons name="edit" size={18} color={Colors.light.button} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.dividerLarge} />

              {/* Фотографии */}
              <View style={styles.infoFieldRow}>
                <View style={styles.infoFieldLabelRow}>
                  <MaterialIcons name="photo-library" size={16} color={Colors.light.link} />
                  <Text style={styles.infoFieldLabel}>Фото</Text>
                </View>
              </View>
              {requestGalleryPhotos.length === 0 ? (
                <Text style={styles.infoFieldValueMuted}>Нет фото</Text>
              ) : (
                <View style={styles.photosRow}>
                  {requestGalleryPhotos.map((photo, idx) => (
                    <TouchableOpacity
                      key={photo.id}
                      style={styles.photoThumb}
                      onPress={() => onPhotoPress(idx)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: getPhotoUrl(photo) }}
                        style={styles.photoImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Блок 2: Договор заявки */}
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Договор заявки</Text>
              <View style={styles.dividerLarge} />
              {!contractAttachment ? (
                <View style={styles.contractRow}>
                  <Text style={styles.infoFieldValueMuted}>Нет договора</Text>
                  <TouchableOpacity
                    style={[styles.contractGenerateButton, generatingContract && styles.contractButtonDisabled]}
                    onPress={onGenerateContract}
                    disabled={generatingContract}
                  >
                    <Text style={styles.contractGenerateButtonText}>
                      {generatingContract ? 'Формирование...' : 'Сформировать'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.contractFileBox}>
                  <View style={styles.contractFileRow}>
                    <View style={styles.contractFileInfo}>
                      <MaterialIcons name="file-present" size={20} color={Colors.light.button} />
                      <Text style={styles.contractFileName} numberOfLines={1}>
                        {contractFileName}
                      </Text>
                    </View>
                    <View style={styles.contractActionsRow}>
                    <TouchableOpacity
                      style={styles.contractActionButton}
                      onPress={() => void openAttachmentUrl(contractUrl, contractFileName)}
                    >
                      <MaterialIcons name="file-download" size={16} color={Colors.light.button} />
                      <Text style={styles.contractActionText}>Скачать</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.contractDeleteButton, deletingContract && styles.contractButtonDisabled]}
                      onPress={() => onDeleteContract(contractAttachment.id)}
                      disabled={deletingContract}
                    >
                      <MaterialIcons name="delete-outline" size={16} color="#EF4444" />
                      <Text style={styles.contractDeleteText}>
                        {deletingContract ? 'Удаление...' : 'Удалить'}
                      </Text>
                    </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Блок 3: Клиент */}
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Информация о клиенте</Text>

              {clientInfo ? (
                <>
                  {/* Аватар + Имя */}
                  <View style={styles.clientHeader}>
                    <UserAvatar
                      initials={getUserInitialsFromName(clientInfo.firstName, clientInfo.lastName)}
                      size={48}
                    />
                    <Text style={styles.clientName}>
                      {clientInfo.firstName} {clientInfo.lastName}
                    </Text>
                  </View>
                  <View style={styles.dividerLarge} />

                  {/* Телефон с иконкой */}
                  <View style={styles.contactRow}>
                    <MaterialIcons name="phone" size={18} color={Colors.light.link} />
                    <Text style={styles.contactText}>{clientInfo.phone || 'Не указан'}</Text>
                  </View>

                  {/* Почта с иконкой */}
                  <View style={styles.contactRow}>
                    <MaterialIcons name="email" size={18} color={Colors.light.link} />
                    <Text style={styles.contactText}>{clientInfo.email}</Text>
                  </View>
                </>
              ) : (
                <Text style={styles.infoFieldValueMuted}>Загрузка...</Text>
              )}
            </View>

            {/* Блок 4: История статусов */}
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>История статусов</Text>
              <View style={styles.dividerLarge} />
              {statusHistory.length === 0 ? (
                /* Если нет истории, показываем текущий статус */
                <View style={styles.historyItem}>
                  <View style={[
                    styles.historyDot,
                    { backgroundColor: statusColor }
                  ]} />
                  <View style={styles.historyContent}>
                    <Text style={[styles.historyStatus, { color: statusColor }]}>
                      {statusLabel}
                    </Text>
                    <View style={styles.historyMeta}>
                      <Text style={styles.historyDate}>{createdAt}</Text>
                      {STATUS_DESCRIPTIONS[statusId] && (
                        <>
                          <Text style={styles.historyDivider}>•</Text>
                          <Text style={styles.historyDesc}>{STATUS_DESCRIPTIONS[statusId]}</Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              ) : (
                statusHistory.map((item, index) => {
                  const itemStatusId = item.statusId ?? item.status_id ?? 0;
                  const isActive = itemStatusId === statusId && index === statusHistory.length - 1;
                  const itemStatusColor = STATUS_COLORS[itemStatusId] || '#6B7280';
                  const itemStatusLabel = STATUS_LABELS[itemStatusId] || 'Неизвестно';
                  const itemStatusDesc = STATUS_DESCRIPTIONS[itemStatusId] || '';
                  const changedAt = formatDateTime(item.changedAt ?? item.changed_at ?? '');

                  return (
                    <View key={item.id} style={styles.historyItem}>
                      <View style={[
                        styles.historyDot,
                        { backgroundColor: isActive ? itemStatusColor : '#D1D5DB' }
                      ]} />
                      <View style={styles.historyContent}>
                        <Text style={[
                          styles.historyStatus,
                          isActive && { color: itemStatusColor }
                        ]}>
                          {itemStatusLabel}
                        </Text>
                        <View style={styles.historyMeta}>
                          {itemStatusDesc && (
                            <>
                              <Text style={styles.historyDesc}>{itemStatusDesc}</Text>
                              <Text style={styles.historyDivider}>•</Text>
                            </>
                          )}
                          <Text style={styles.historyDate}>{changedAt}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Кнопки управления заявкой */}
            <View style={styles.actionButtonsRow}>
              {/* Проверка выполнения (статус "Проверка" = 4) */}
              {statusId === 4 && (
                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={onVerifyPress}
                >
                  <MaterialIcons name="fact-check" size={18} color="#FFFFFF" />
                  <Text style={styles.verifyButtonText}>Подтвердить выполнение</Text>
                </TouchableOpacity>
              )}

              {/* Закрыть заявку (только при статусе "Готова" = 5) */}
              {statusId === 5 && (
                <TouchableOpacity
                  style={styles.closeRequestButton}
                  onPress={onClosePress}
                >
                  <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.closeRequestButtonText}>Закрыть заявку</Text>
                </TouchableOpacity>
              )}

              {/* Отменить заявку (при любом статусе кроме "Готова", "Закрыта" и "Отменена") */}
              {statusId !== 5 && statusId !== 6 && statusId !== 7 && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onCancelPress}
                >
                  <MaterialIcons name="cancel" size={18} color="#EF4444" />
                  <Text style={styles.cancelButtonText}>Отменить заявку</Text>
                </TouchableOpacity>
              )}
            </View>

    </>
  );
}



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
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.light.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  buttonsColumn: {
    gap: 12,
  },
  button: {
    backgroundColor: Colors.light.button,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
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

const galleryStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 24 : 48,
    right: 24,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 32 : 56,
    alignSelf: 'center',
    zIndex: 10,
  },
  counterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 16,
  },
  arrowButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowSpacer: {
    width: 52,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
