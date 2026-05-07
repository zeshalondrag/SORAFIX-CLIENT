import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const isWeb = Platform.OS === 'web';

import { Colors } from '@/constants/theme';
import { ADMIN_ROLE_ID, CLIENT_ROLE_ID, MANAGER_ROLE_ID, SPECIALIST_ROLE_ID, useAuth } from '@/contexts/auth-context';
import { useNotifications } from '@/contexts/notification-context';
import { getUserDisplayName, getUserInitials, getUserRoleId, isValidUser } from '@/lib/user-utils';

const SIDEBAR_WIDTH = 280;
const SIDEBAR_COLLAPSED = 80;
const FAVICON = require('@/assets/images/favicon.png');

type NavItem = {
  href: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  badgeText?: string;
  useTelegramBrandIcon?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/(client)', icon: 'view-dashboard-outline', label: 'Личный кабинет' },
  { href: '/(client)/requests', icon: 'clipboard-text-outline', label: 'Мои заявки' },
  { href: '/(client)/new-request', icon: 'plus-circle-outline', label: 'Новая заявка' },
  { href: '/(client)/profile', icon: 'account-outline', label: 'Профиль' },
  { href: '/(client)/notifications', icon: 'bell-outline', label: 'Уведомления' },
  {
    href: '/(client)/telegram',
    icon: 'message-text-outline',
    label: 'Telegram Бот',
    badgeText: 'Новое',
    useTelegramBrandIcon: true,
  },
];

function NavLink({
  item,
  isActive,
  sidebarCollapsed,
  onPress,
  badge,
}: {
  item: NavItem;
  isActive: boolean;
  sidebarCollapsed: boolean;
  onPress: () => void;
  badge?: number | string;
}) {
  const [hovered, setHovered] = useState(false);
  const showHover = isWeb && hovered && !isActive;
  const mouseProps = isWeb
    ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }
    : {};
  return (
    <View
      style={[styles.navItemWrapper, showHover && styles.navItemHover]}
      {...mouseProps}
    >
    <TouchableOpacity
      style={[
        styles.navItem,
        isActive && styles.navItemActive,
      ]}
      onPress={onPress}
    >
      <View>
        {item.useTelegramBrandIcon ? (
          <FontAwesome
            name="telegram"
            size={22}
            color={isActive ? Colors.light.button : Colors.light.text}
          />
        ) : (
          <MaterialCommunityIcons
            name={item.icon}
            size={22}
            color={isActive ? Colors.light.button : Colors.light.text}
          />
        )}
        {badge != null && ((typeof badge === 'number' && badge > 0) || typeof badge === 'string') && sidebarCollapsed && (
          <View style={styles.badgeDot}>
            <Text style={styles.badgeDotText}>
              {typeof badge === 'number' ? (badge > 9 ? '9+' : badge) : badge}
            </Text>
          </View>
        )}
      </View>
      {!sidebarCollapsed && (
        <Text
          style={[
            styles.navLabel,
            isActive && styles.navLabelActive,
          ]}
        >
          {item.label}
        </Text>
      )}
      {badge != null && ((typeof badge === 'number' && badge > 0) || typeof badge === 'string') && !sidebarCollapsed && (
        <View style={styles.navBadge}>
          <Text style={styles.navBadgeText}>
            {typeof badge === 'number' ? (badge > 99 ? '99+' : badge) : badge}
          </Text>
        </View>
      )}
    </TouchableOpacity>
    </View>
  );
}

function FooterNavLink({
  icon,
  label,
  sidebarCollapsed,
  isNarrow,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  sidebarCollapsed: boolean;
  isNarrow: boolean;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const showHover = isWeb && hovered;
  const mouseProps = isWeb
    ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }
    : {};
  return (
    <View
      style={[styles.navItemWrapper, showHover && styles.navItemHover]}
      {...mouseProps}
    >
      <TouchableOpacity style={styles.navItem} onPress={onPress}>
        <MaterialCommunityIcons name={icon} size={22} color={Colors.light.text} />
        {!sidebarCollapsed && label ? <Text style={styles.navLabel}>{label}</Text> : null}
      </TouchableOpacity>
    </View>
  );
}

export default function ClientLayout() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const { unreadCount } = useNotifications();

  const isNarrow = width < 768;
  /** Карточка заявки с чатом: без отступов контента — чат на всю ширину под телефон */
  const isClientRequestDetail =
    isNarrow && typeof pathname === 'string' && /\/request\/[^/]+/.test(pathname);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (isLoading || !user) return;
    const roleId = getUserRoleId(user);
    if (roleId === CLIENT_ROLE_ID) return;
    if (roleId === ADMIN_ROLE_ID) router.replace('/(admin)' as '/');
    else if (roleId === MANAGER_ROLE_ID) router.replace('/(manager)' as '/');
    else if (roleId === SPECIALIST_ROLE_ID) router.replace('/(specialist)' as '/');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (isNarrow) return;
    Animated.timing(sidebarAnim, {
      toValue: sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [sidebarCollapsed, isNarrow, sidebarAnim]);

  // Показываем загрузку пока идёт проверка авторизации
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  // Не рендерим контент если пользователь не авторизован или данные неполные
  if (!isValidUser(user)) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Загрузка данных...</Text>
      </View>
    );
  }

  // Вычисляем данные пользователя ТОЛЬКО после проверки что user существует и полный
  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user);
  const roleName = user.role?.name ?? 'Клиент';

  const getCurrentTab = () => {
    const p = (pathname ?? '').toLowerCase();
    if (p.includes('requests')) return 'Мои заявки';
    if (p.includes('new-request')) return 'Новая заявка';
    if (p.includes('profile')) return 'Профиль';
    if (p.includes('notifications')) return 'Уведомления';
    if (p.includes('telegram')) return 'Telegram Бот';
    return 'Личный кабинет';
  };
  const currentTab = getCurrentTab();
  const TAB_DESCRIPTIONS: Record<string, string> = {
    'Личный кабинет': 'Обзор и сводка',
    'Мои заявки': 'История и статусы заявок',
    'Новая заявка': 'Создание новой заявки',
    'Профиль': 'Настройки аккаунта',
    'Уведомления': 'Сообщения и оповещения',
    'Telegram Бот': 'Подключение уведомлений в Telegram',
  };

  const handleNav = (item: NavItem) => {
    if (isNarrow) setMobileMenuOpen(false);
    router.push(item.href as '/');
  };

  const handleLogout = async () => {
    setLogoutModalVisible(false);
    await new Promise((r) => setTimeout(r, 150));
    await logout();
  };

  return (
    <View style={styles.root}>
      {/* Sidebar - on narrow: overlay when mobileMenuOpen */}
      {isNarrow && mobileMenuOpen && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() => setMobileMenuOpen(false)}
          activeOpacity={1}
        />
      )}
      <Animated.View
        style={[
          styles.sidebar,
          { paddingTop: isWeb ? 16 : insets.top + 8 },
          {
            width: isNarrow
              ? mobileMenuOpen ? SIDEBAR_WIDTH : 0
              : sidebarAnim,
          },
          isNarrow && mobileMenuOpen && styles.sidebarOverlay,
          isNarrow && !mobileMenuOpen && styles.sidebarHiddenMobile,
        ]}
      >
        {(isNarrow && mobileMenuOpen) || !isNarrow ? (
          <>
            <View style={styles.sidebarHeader}>
              <View style={[styles.brandRow, sidebarCollapsed && styles.brandRowCollapsed]}>
                <Image source={FAVICON} style={styles.favicon} />
                {!sidebarCollapsed && (
                  <Text style={styles.brand}>SORAFIX</Text>
                )}
              </View>
            </View>
            <View style={styles.sidebarDivider} />
            <View style={styles.navItems}>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={currentTab === item.label}
                  sidebarCollapsed={sidebarCollapsed}
                  onPress={() => handleNav(item)}
                  badge={
                    item.label === 'Уведомления'
                      ? unreadCount
                      : item.badgeText
                  }
                />
              ))}
            </View>
            <View style={styles.sidebarDivider} />
            <View style={styles.sidebarFooter}>
              <FooterNavLink
                icon="logout"
                label="Выйти"
                sidebarCollapsed={sidebarCollapsed}
                isNarrow={isNarrow}
                onPress={() => { setLogoutModalVisible(true); if (isNarrow) setMobileMenuOpen(false); }}
              />
              <FooterNavLink
                icon={isNarrow ? 'close' : (sidebarCollapsed ? 'chevron-right' : 'chevron-left')}
                label={isNarrow ? 'Закрыть' : (sidebarCollapsed ? '' : 'Свернуть')}
                sidebarCollapsed={sidebarCollapsed}
                isNarrow={isNarrow}
                onPress={() => {
                  if (isNarrow) setMobileMenuOpen(false);
                  else setSidebarCollapsed((v) => !v);
                }}
              />
            </View>
          </>
        ) : null}
      </Animated.View>

      {/* Main content */}
      <View style={styles.main}>
        <View style={styles.header}>
          {isNarrow && (
            <TouchableOpacity
              onPress={() => setMobileMenuOpen(true)}
              style={[styles.menuButton, { marginTop: isWeb ? 0 : insets.top }]}
            >
              <MaterialIcons name="menu" size={28} color={Colors.light.text} />
            </TouchableOpacity>
          )}
          {!isNarrow && (
            <>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>{currentTab}</Text>
              <Text style={styles.headerSubtitle}>{TAB_DESCRIPTIONS[currentTab] ?? ''}</Text>
            </View>
            <View style={styles.headerCenter}>
              <View
                style={[
                  styles.searchWrapper,
                  { borderColor: searchFocused ? Colors.light.button : '#E5E7EB' },
                ]}
              >
                <TextInput
                  style={styles.searchInput}
                  placeholder="Поиск..."
                  placeholderTextColor={Colors.light.placeholder}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
              </View>
            </View>
            <View style={styles.headerRight}>
            <TouchableOpacity
                  style={styles.bellButton}
                  onPress={() => {
                    const item = NAV_ITEMS.find((i) => i.label === 'Уведомления');
                    if (item) handleNav(item);
                  }}
                >
                  <MaterialCommunityIcons name="bell-outline" size={22} color={Colors.light.text} />
                  {unreadCount > 0 && (
                    <View style={styles.bellBadge}>
                      <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {(user?.firstName ?? user?.first_name ?? '')}{' '}
                  {(user?.lastName ?? user?.last_name)?.[0] ?? ''}.
                </Text>
                <Text style={styles.userRole}>{roleName}</Text>
              </View>
            </View>
          </>
          )}
          {isNarrow && (
            <>
              <View style={[styles.headerLeft, styles.headerLeftNarrow, { marginTop: isWeb ? 0 : insets.top }]}>
                <Text style={[styles.headerTitle, styles.headerTitleNarrow]} numberOfLines={1}>
                  {currentTab}
                </Text>
                <Text style={[styles.headerSubtitle, styles.headerSubtitleNarrow]} numberOfLines={1}>
                  {TAB_DESCRIPTIONS[currentTab] ?? ''}
                </Text>
              </View>
              <View style={[styles.headerRight, styles.headerRightNarrow, { marginTop: isWeb ? 0 : insets.top }]}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={[styles.userInfo, styles.userInfoNarrow]}>
                  <Text style={styles.userName}>
                    {(user?.firstName ?? user?.first_name ?? '')}{' '}
                    {(user?.lastName ?? user?.last_name)?.[0] ?? ''}.
                  </Text>
                  <Text style={[styles.userRole, styles.userRoleNarrow]}>{roleName}</Text>
                </View>
              </View>
            </>
          )}
        </View>
        <View
          style={[
            styles.content,
            isNarrow && styles.contentNarrow,
            isClientRequestDetail && styles.contentFullBleedChat,
          ]}
        >
          <View style={styles.stackFill}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="requests" />
              <Stack.Screen name="new-request" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="telegram" />
              <Stack.Screen name="request/[id]" />
            </Stack>
          </View>
        </View>
      </View>

      {/* Logout confirmation Modal */}
      <Modal visible={logoutModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Выйти из аккаунта?</Text>
            <Text style={styles.modalSubtitle}>
              Вы уверены, что хотите выйти из системы?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={handleLogout}>
                <Text style={styles.modalButtonText}>Выйти</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
  },
  sidebar: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    overflow: 'hidden',
  },
  sidebarOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 100,
    backgroundColor: '#F9FAFB',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  sidebarHiddenMobile: {
    width: 0,
    padding: 0,
    borderRightWidth: 0,
    backgroundColor: 'transparent',
  },
  menuButton: {
    padding: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  sidebarHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  brandRowCollapsed: {
    justifyContent: 'center',
  },
  favicon: {
    width: 35,
    height: 35,
  },
  brand: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: 1,
    fontFamily: 'Arial'
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
    marginHorizontal: 16,
  },
  navItems: {
    flex: 1,
    gap: 4,
  },
  navItemWrapper: {
    borderRadius: 20,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderRadius: 20,
  },
  navItemActive: {
    backgroundColor: 'rgba(5, 148, 103, 0.12)',
  },
  navItemHover: {
    backgroundColor: '#E5E7EB',
  },
  navLabel: {
    fontSize: 15,
    color: Colors.light.text,
  },
  navLabelActive: {
    color: Colors.light.button,
    fontWeight: '600',
  },
  navBadge: {
    marginLeft: 'auto',
    backgroundColor: '#EF4444',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  navBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badgeDot: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeDotText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sidebarFooter: {
    paddingBottom: 8,
    gap: 4,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: Colors.light.background,
  },
  headerLeftNarrow: {
    flex: 1,
    minWidth: 0,
  },
  headerLeft: {
    minWidth: 180,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  headerTitleNarrow: {
    fontSize: 18,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.light.link,
    marginTop: 2,
  },
  headerSubtitleNarrow: {
    fontSize: 12,
    marginTop: 1,
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    paddingVertical: 12,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as Record<string, unknown>) : {}),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerRightNarrow: {
    gap: 10,
    marginLeft: 'auto',
  },
  bellButton: {
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  bellBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.buttonText,
  },
  userInfo: {
    alignItems: 'flex-start',
  },
  userInfoNarrow: {
    maxWidth: 120,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  userRole: {
    fontSize: 12,
    color: Colors.light.link,
  },
  userRoleNarrow: {
    fontSize: 11,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  contentNarrow: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  contentFullBleedChat: {
    flex: 1,
    minHeight: 0,
    padding: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  stackFill: {
    flex: 1,
    minHeight: 0,
    alignSelf: 'stretch',
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.light.link,
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.light.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    backgroundColor: Colors.light.button,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.buttonText,
  },
  modalButtonSecondary: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalButtonSecondaryText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.link,
  },
});