import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useNotifications } from '@/contexts/notification-context';
import {
    formatNotificationDate,
    getCreatedAt,
    getNotificationType,
    getRequestId,
    isRead,
    type Notification,
} from '@/lib/notifications-api';
import { requestsApi, SERVICE_TYPE_LABELS, STATUS_COLORS, STATUS_LABELS, type Request } from '@/lib/requests-api';

const isWeb = Platform.OS === 'web';
type ReadFilter = 'all' | 'unread' | 'read';
type SortOrder = 'newest' | 'oldest';
type OpenSelect = 'read' | 'sort' | null;

type NotificationItemProps = {
  notification: Notification;
  onPress: () => void;
  isPhone: boolean;
};

function getClientNotifDisplay(type: string): {
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor: string;
  title: string;
} {
  switch (type) {
    case 'request_created':
      return { iconName: 'file-document-check-outline', iconColor: Colors.light.button, title: 'Заявка создана' };
    case 'price_assigned':
      return { iconName: 'cash-check', iconColor: Colors.light.button, title: 'Назначена цена' };
    case 'request_cancelled':
      return { iconName: 'close-circle-outline', iconColor: '#EF4444', title: 'Заявка отменена' };
    case 'request_closed':
      return { iconName: 'check-circle-outline', iconColor: '#10B981', title: 'Заявка закрыта' };
    case 'status_changed':
    default:
      return { iconName: 'swap-horizontal-circle-outline', iconColor: '#F59E0B', title: 'Статус заявки изменён' };
  }
}

function NotificationItem({ notification, onPress, isPhone }: NotificationItemProps) {
  const [hovered, setHovered] = useState(false);
  const mouseProps = isWeb
    ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }
    : {};

  const read = isRead(notification);
  const createdAt = formatNotificationDate(getCreatedAt(notification));
  const type = getNotificationType(`${notification.title ?? ''} ${notification.message}`);
  const requestId = getRequestId(notification);

  const { iconName, iconColor, title } = getClientNotifDisplay(type);

  return (
    <View
      style={[
        styles.notifItem,
        !read && styles.notifItemUnread,
        hovered && styles.notifItemHover,
      ]}
      {...mouseProps}
    >
      <TouchableOpacity
        style={[styles.notifItemInner, isPhone && styles.notifItemInnerPhone]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.notifIconWrap,
            isPhone && styles.notifIconWrapPhone,
            { backgroundColor: iconColor + '20' },
          ]}
        >
          <MaterialCommunityIcons name={iconName} size={isPhone ? 20 : 24} color={iconColor} />
        </View>
        <View style={styles.notifInfo}>
          <View style={[styles.notifTitleRow, isPhone && styles.notifTitleRowPhone]}>
            <Text
              style={[
                styles.notifTitle,
                isPhone && styles.notifTitlePhone,
                !read && styles.notifTitleUnread,
              ]}
              numberOfLines={isPhone ? 2 : 1}
            >
              {title}
            </Text>
          </View>
          {isPhone ? (
            <View style={styles.notifMetaColumn}>
              {requestId > 0 && (
                <Text style={[styles.notifMetaText, styles.notifMetaTextPhone]} numberOfLines={1}>
                  Заявка №{requestId}
                </Text>
              )}
              <Text style={[styles.notifMetaText, styles.notifMetaMessagePhone]} numberOfLines={3}>
                {notification.message}
              </Text>
              <Text style={[styles.notifMetaText, styles.notifMetaDatePhone]} numberOfLines={1}>
                {createdAt}
              </Text>
            </View>
          ) : (
            <View style={styles.notifMeta}>
              {requestId > 0 && (
                <>
                  <Text style={styles.notifMetaText}>№{requestId}</Text>
                  <Text style={styles.notifDot}>•</Text>
                </>
              )}
              <Text style={styles.notifMetaText} numberOfLines={1}>
                {notification.message}
              </Text>
              <Text style={styles.notifDot}>•</Text>
              <Text style={styles.notifMetaText}>{createdAt}</Text>
            </View>
          )}
        </View>
        {!read && (
              <View style={[styles.unreadBadge, isPhone && styles.unreadBadgePhone]}>
                <Text style={[styles.unreadBadgeText, isPhone && styles.unreadBadgeTextPhone]}>Новое</Text>
              </View>
            )}
        <MaterialIcons name="chevron-right" size={isPhone ? 24 : 24} color={Colors.light.link} style={styles.notifArrowPhone}/>
      </TouchableOpacity>
    </View>
  );
}

function EmptyNotifications({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.emptyContainer, compact && styles.emptyContainerPhone]}>
      <MaterialCommunityIcons name="bell-off-outline" size={64} color={Colors.light.link} />
      <Text style={styles.emptyText}>Уведомлений нет</Text>
      <Text style={styles.emptyHint}>
        Здесь будут отображаться уведомления о ваших заявках
      </Text>
    </View>
  );
}

type NotificationModalProps = {
  visible: boolean;
  notification: Notification | null;
  requestData: Request | null;
  onClose: () => void;
  onGoToRequest: () => void;
  isPhone: boolean;
};

function NotificationModal({
  visible,
  notification,
  requestData,
  onClose,
  onGoToRequest,
  isPhone,
}: NotificationModalProps) {
  if (!notification) return null;

  const createdAt = formatNotificationDate(getCreatedAt(notification));
  const requestId = getRequestId(notification);

  const statusId = requestData?.statusId ?? (requestData as Record<string, unknown>)?.status_id as number ?? 0;
  const requestTypeId = requestData?.requestTypeId ?? (requestData as Record<string, unknown>)?.request_type_id as number ?? 0;
  const statusColor = STATUS_COLORS[statusId] || '#6B7280';
  const statusLabel = STATUS_LABELS[statusId] || 'Неизвестно';
  const serviceLabel = SERVICE_TYPE_LABELS[requestTypeId] || 'Услуга';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[modalStyles.overlay, isPhone && modalStyles.overlayPhone]}>
        <View style={[modalStyles.box, isPhone && modalStyles.boxPhone]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, isPhone && modalStyles.titlePhone]} numberOfLines={2}>
              Уведомление
            </Text>
            <TouchableOpacity style={modalStyles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color={Colors.light.link} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={isPhone ? modalStyles.modalScroll : undefined}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[modalStyles.message, isPhone && modalStyles.messagePhone]}>{notification.message}</Text>

            {requestData && (
              <View style={[modalStyles.requestInfo, isPhone && modalStyles.requestInfoPhone]}>
                <Text style={[modalStyles.requestLabel, isPhone && modalStyles.requestLabelPhone]}>
                  Информация о заявке
                </Text>
                <View style={[modalStyles.requestRow, isPhone && modalStyles.requestRowPhone]}>
                  <Text style={modalStyles.requestField}>Номер</Text>
                  <Text style={modalStyles.requestValue}>#{requestId}</Text>
                </View>
                <View style={[modalStyles.requestRow, isPhone && modalStyles.requestRowPhone]}>
                  <Text style={modalStyles.requestField}>Название</Text>
                  <Text style={modalStyles.requestValue}>{requestData.title}</Text>
                </View>
                <View style={[modalStyles.requestRow, isPhone && modalStyles.requestRowPhone]}>
                  <Text style={modalStyles.requestField}>Тип</Text>
                  <Text style={modalStyles.requestValue}>{serviceLabel}</Text>
                </View>
                <View style={[modalStyles.requestRow, isPhone && modalStyles.requestRowPhone]}>
                  <Text style={modalStyles.requestField}>Статус</Text>
                  <View style={[modalStyles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[modalStyles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                </View>
              </View>
            )}

            <Text style={[modalStyles.date, isPhone && modalStyles.datePhone]}>{createdAt}</Text>
          </ScrollView>

          <View style={[modalStyles.buttons, isPhone && modalStyles.buttonsPhone]}>
            {requestId > 0 && (
              <TouchableOpacity
                style={[modalStyles.buttonSecondary, isPhone && modalStyles.modalBtnFull]}
                onPress={onGoToRequest}
              >
                <Text style={modalStyles.buttonSecondaryText}>Перейти к заявке</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[modalStyles.button, isPhone && modalStyles.modalBtnFull]} onPress={onClose}>
              <Text style={modalStyles.buttonText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function NotificationsPage() {
  const { width } = useWindowDimensions();
  const isPhone = width < 768;
  const router = useRouter();
  const {
    notifications,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
    unreadCount,
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [openSelect, setOpenSelect] = useState<OpenSelect>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleOpenNotification = async (notification: Notification) => {
    try {
      setSelectedNotification(notification);
      setModalVisible(true);

      const reqId = getRequestId(notification);
      if (reqId > 0) {
        const req = await requestsApi.getRequest(reqId).catch(() => null);
        setSelectedRequest(req);
      }

      if (!isRead(notification)) {
        await markAsRead(notification.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedNotification(null);
    setSelectedRequest(null);
  };

  const handleGoToRequest = () => {
    const reqId = selectedNotification ? getRequestId(selectedNotification) : 0;
    handleCloseModal();
    if (reqId > 0) {
      router.push(`/(client)/request/${reqId}`);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const hasUnread = unreadCount > 0;
  const visibleNotifications = notifications
    .filter((notification) => {
      const text = `${notification.title ?? ''} ${notification.message ?? ''}`.toLowerCase();
      const matchesSearch = !search.trim() || text.includes(search.toLowerCase());
      const read = isRead(notification);
      const matchesRead =
        readFilter === 'all' || (readFilter === 'read' && read) || (readFilter === 'unread' && !read);
      return matchesSearch && matchesRead;
    })
    .sort((a, b) => {
      const aTime = new Date(getCreatedAt(a)).getTime();
      const bTime = new Date(getCreatedAt(b)).getTime();
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
    });

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, isPhone && styles.topBarPhone]}>
        <View style={[styles.filtersRow, isPhone && styles.filtersRowPhone]}>
          <View
            style={[
              styles.searchWrapper,
              isPhone && styles.searchWrapperPhone,
              { borderColor: searchFocused ? Colors.light.button : '#E5E7EB' },
            ]}
          >
            <MaterialIcons name="search" size={20} color={Colors.light.link} />
            <TextInput
              style={[
                styles.searchInput,
                isWeb && ({ outlineStyle: 'none' } as Record<string, unknown>),
              ]}
              placeholder="Поиск уведомлений..."
              placeholderTextColor={Colors.light.placeholder}
              value={search}
              onChangeText={setSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </View>
          <View style={[styles.selectWrap, isPhone && styles.selectWrapPhone]}>
            <TouchableOpacity style={styles.selectInput} onPress={() => setOpenSelect(openSelect === 'read' ? null : 'read')}>
              <Text style={styles.selectInputText}>
                {readFilter === 'all' ? 'Все' : readFilter === 'unread' ? 'Непрочитанные' : 'Прочитанные'}
              </Text>
              <MaterialIcons name={openSelect === 'read' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={20} color={Colors.light.link} />
            </TouchableOpacity>
            {openSelect === 'read' && (
              <View style={styles.selectMenu}>
                <TouchableOpacity style={styles.selectOption} onPress={() => { setReadFilter('all'); setOpenSelect(null); }}>
                  <Text style={styles.selectOptionText}>Все</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.selectOption} onPress={() => { setReadFilter('unread'); setOpenSelect(null); }}>
                  <Text style={styles.selectOptionText}>Непрочитанные</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.selectOption} onPress={() => { setReadFilter('read'); setOpenSelect(null); }}>
                  <Text style={styles.selectOptionText}>Прочитанные</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={[styles.selectWrap, isPhone && styles.selectWrapPhone]}>
            <TouchableOpacity style={styles.selectInput} onPress={() => setOpenSelect(openSelect === 'sort' ? null : 'sort')}>
              <Text style={styles.selectInputText}>{sortOrder === 'newest' ? 'Сначала новые' : 'Сначала старые'}</Text>
              <MaterialIcons name={openSelect === 'sort' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={20} color={Colors.light.link} />
            </TouchableOpacity>
            {openSelect === 'sort' && (
              <View style={styles.selectMenu}>
                <TouchableOpacity style={styles.selectOption} onPress={() => { setSortOrder('newest'); setOpenSelect(null); }}>
                  <Text style={styles.selectOptionText}>Сначала новые</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.selectOption} onPress={() => { setSortOrder('oldest'); setOpenSelect(null); }}>
                  <Text style={styles.selectOptionText}>Сначала старые</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        {hasUnread && (
          <TouchableOpacity style={[styles.markAllButton, isPhone && styles.markAllButtonPhone]} onPress={handleMarkAllRead}>
            <MaterialIcons name="done-all" size={18} color={Colors.light.button} />
            <Text style={styles.markAllText}>Прочитать все</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={[styles.listContent, isPhone && styles.listContentPhone]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.light.button]} />
        }
      >
        <View style={[styles.notifList, isPhone && styles.notifListPhone]}>
          {loading ? (
            <Text style={styles.loadingText}>Загрузка...</Text>
          ) : visibleNotifications.length === 0 ? (
            <EmptyNotifications compact={isPhone} />
          ) : (
            visibleNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                isPhone={isPhone}
                onPress={() => handleOpenNotification(notification)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <NotificationModal
        visible={modalVisible}
        notification={selectedNotification}
        requestData={selectedRequest}
        onClose={handleCloseModal}
        onGoToRequest={handleGoToRequest}
        isPhone={isPhone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    gap: 10,
    paddingBottom: 12,
    zIndex: 20,
  },
  topBarPhone: {
    gap: 8,
    paddingBottom: 8,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  filtersRowPhone: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    minHeight: 40,
    gap: 8,
  },
  searchWrapperPhone: {
    flexBasis: '100%',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    paddingVertical: 8,
  },
  selectWrap: {
    position: 'relative',
    width: 180,
  },
  selectWrapPhone: {
    flex: 1,
    minWidth: 0,
    width: '48%',
  },
  selectInput: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectInputText: {
    fontSize: 13,
    color: Colors.light.text,
    fontWeight: '500',
  },
  selectMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 30,
    ...Platform.select({
      web: { boxShadow: '0 8px 20px rgba(0,0,0,0.12)' },
      default: { elevation: 6 },
    }),
  },
  selectOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectOptionText: {
    fontSize: 13,
    color: Colors.light.text,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.light.button + '10',
  },
  markAllButtonPhone: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.button,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  listContentPhone: {
    paddingBottom: 20,
  },
  notifList: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  notifListPhone: {
    borderRadius: 12,
  },
  notifItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  notifItemUnread: {
    backgroundColor: 'rgba(5, 148, 103, 0.03)',
  },
  notifItemHover: {
    backgroundColor: '#F9FAFB',
  },
  notifItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  notifArrowPhone: {
    alignSelf: 'center',
  },
  notifItemInnerPhone: {
    alignItems: 'flex-start',
    padding: 12,
    gap: 10,
  },
  notifIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIconWrapPhone: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  notifInfo: {
    flex: 1,
    minWidth: 0,
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  notifTitleRowPhone: {
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.light.text,
    flex: 1,
    minWidth: 0,
  },
  notifTitlePhone: {
    fontSize: 14,
    flexBasis: '100%',
  },
  notifTitleUnread: {
    fontWeight: '600',
  },
  notifMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notifMetaColumn: {
    gap: 4,
    alignSelf: 'stretch',
  },
  notifMetaText: {
    fontSize: 13,
    color: Colors.light.link,
    flexShrink: 1,
  },
  notifMetaTextPhone: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  notifMetaMessagePhone: {
    fontSize: 13,
    lineHeight: 18,
  },
  notifMetaDatePhone: {
    fontSize: 12,
    opacity: 0.9,
  },
  notifDot: {
    fontSize: 13,
    color: Colors.light.link,
  },
  unreadBadge: {
    backgroundColor: Colors.light.button,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  unreadBadgePhone: {
    alignSelf: 'center',
    marginTop: -2,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.buttonText,
  },
  unreadBadgeTextPhone: {
    fontSize: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 60,
    gap: 12,
  },
  emptyContainerPhone: {
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  emptyHint: {
    fontSize: 14,
    color: Colors.light.link,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: Colors.light.link,
    textAlign: 'center',
    padding: 40,
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
  overlayPhone: {
    padding: 14,
  },
  box: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 480,
  },
  boxPhone: {
    padding: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxWidth: '100%',
    maxHeight: '92%',
  },
  modalScroll: {
    maxHeight: 280,
    flexGrow: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
    marginRight: 12,
  },
  titlePhone: {
    fontSize: 17,
  },
  closeButton: {
    padding: 4,
  },
  message: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
    marginBottom: 20,
  },
  messagePhone: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  requestInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  requestInfoPhone: {
    padding: 12,
    marginBottom: 12,
  },
  requestLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  requestLabelPhone: {
    fontSize: 13,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestRowPhone: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  requestField: {
    fontSize: 14,
    color: Colors.light.link,
    minWidth: 80,
  },
  requestValue: {
    fontSize: 14,
    color: Colors.light.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  date: {
    fontSize: 13,
    color: Colors.light.link,
    marginBottom: 20,
  },
  datePhone: {
    marginBottom: 12,
    marginTop: 4,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  buttonsPhone: {
    flexDirection: 'column-reverse',
    alignItems: 'stretch',
    gap: 10,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalBtnFull: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    backgroundColor: Colors.light.button,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
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
    alignItems: 'center',
  },
  buttonSecondaryText: {
    fontSize: 15,
    color: Colors.light.text,
  },
});
