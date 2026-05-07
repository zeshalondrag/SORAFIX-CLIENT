import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useToast } from '@/contexts/toast-context';
import {
  type AdminUser,
  adminUsersApi,
  getUserCreatedAt,
  getUserEmailVerified,
  getUserFirstName,
  getUserIsActive,
  getUserLastName,
  getUserMiddleName,
  getUserRoleId,
  maskEmail,
  maskPhone,
  ROLE_LABELS,
} from '@/lib/admin-api';
import { formatRequestDate } from '@/lib/requests-api';

const isWeb = Platform.OS === 'web';
type UserSortKey = 'name_asc' | 'name_desc' | 'created_desc' | 'created_asc';
type UserSelectKey = 'role' | 'status' | 'sort' | null;

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | number>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<UserSortKey>('name_asc');
  const [openSelect, setOpenSelect] = useState<UserSelectKey>(null);

  // Видимость маскированных полей
  const [visibleEmails, setVisibleEmails] = useState<Set<number>>(new Set());
  const [visiblePhones, setVisiblePhones] = useState<Set<number>>(new Set());

  // Модальное окно смены роли
  const [roleModalUser, setRoleModalUser] = useState<AdminUser | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(0);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [changingRole, setChangingRole] = useState(false);

  // Модальное окно деактивации
  const [deactivateModalUser, setDeactivateModalUser] = useState<AdminUser | null>(null);
  const [togglingActive, setTogglingActive] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminUsersApi.getUsers();
      setUsers(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const toggleEmailVisibility = (userId: number) => {
    setVisibleEmails((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const togglePhoneVisibility = (userId: number) => {
    setVisiblePhones((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const openRoleModal = (u: AdminUser) => {
    if (currentUser?.id === u.id) {
      showError('Нельзя изменить роль самому себе');
      return;
    }
    setRoleModalUser(u);
    setSelectedRoleId(getUserRoleId(u));
    setRoleDropdownOpen(false);
  };

  const handleChangeRole = async () => {
    if (!roleModalUser) return;
    try {
      setChangingRole(true);
      await adminUsersApi.changeRole(roleModalUser.id, selectedRoleId);
      showSuccess('Роль успешно изменена');
      setRoleModalUser(null);
      await loadUsers();
    } catch {
      showError('Ошибка при изменении роли');
    } finally {
      setChangingRole(false);
    }
  };

  const openDeactivateModal = (u: AdminUser) => {
    if (currentUser?.id === u.id) {
      showError('Нельзя деактивировать самого себя');
      return;
    }
    setDeactivateModalUser(u);
  };

  const handleToggleActive = async () => {
    if (!deactivateModalUser) return;
    try {
      setTogglingActive(true);
      const newActive = !getUserIsActive(deactivateModalUser);
      await adminUsersApi.toggleActive(deactivateModalUser.id, newActive);
      showSuccess(newActive ? 'Пользователь активирован' : 'Пользователь деактивирован');
      setDeactivateModalUser(null);
      await loadUsers();
    } catch {
      showError('Ошибка при изменении статуса');
    } finally {
      setTogglingActive(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && getUserRoleId(u) !== roleFilter) return false;
    if (activeFilter === 'active' && !getUserIsActive(u)) return false;
    if (activeFilter === 'inactive' && getUserIsActive(u)) return false;

    if (!search) return true;
    const s = search.toLowerCase();
    const fullName = `${getUserLastName(u)} ${getUserFirstName(u)} ${getUserMiddleName(u)}`.toLowerCase();
    return fullName.includes(s) || u.email.toLowerCase().includes(s) || u.phone.includes(s);
  });
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortBy === 'created_desc') return new Date(getUserCreatedAt(b)).getTime() - new Date(getUserCreatedAt(a)).getTime();
    if (sortBy === 'created_asc') return new Date(getUserCreatedAt(a)).getTime() - new Date(getUserCreatedAt(b)).getTime();
    const aName = `${getUserLastName(a)} ${getUserFirstName(a)} ${getUserMiddleName(a)}`.trim().toLowerCase();
    const bName = `${getUserLastName(b)} ${getUserFirstName(b)} ${getUserMiddleName(b)}`.trim().toLowerCase();
    if (sortBy === 'name_desc') return bName.localeCompare(aName, 'ru');
    return aName.localeCompare(bName, 'ru');
  });
  const sortLabelMap: Record<UserSortKey, string> = {
    name_asc: 'ФИО А-Я',
    name_desc: 'ФИО Я-А',
    created_desc: 'Сначала новые',
    created_asc: 'Сначала старые',
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.button} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.controlsRow}>
          <View style={styles.selectWrap}>
            <Text style={styles.selectLabel}>Роль</Text>
            <TouchableOpacity style={styles.selectInput} onPress={() => setOpenSelect(openSelect === 'role' ? null : 'role')}>
              <Text style={styles.selectInputText}>
                {roleFilter === 'all' ? 'Все' : (ROLE_LABELS[roleFilter] ?? 'Неизвестно')}
              </Text>
              <MaterialCommunityIcons name={openSelect === 'role' ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.light.link} />
            </TouchableOpacity>
            {openSelect === 'role' && (
              <View style={styles.selectMenu}>
                <ScrollView style={{ maxHeight: 220 }}>
                  <TouchableOpacity style={styles.selectOption} onPress={() => { setRoleFilter('all'); setOpenSelect(null); }}>
                    <Text style={styles.selectOptionText}>Все</Text>
                  </TouchableOpacity>
                  {Object.entries(ROLE_LABELS).map(([idStr, label]) => {
                    const id = Number(idStr);
                    return (
                      <TouchableOpacity key={id} style={styles.selectOption} onPress={() => { setRoleFilter(id); setOpenSelect(null); }}>
                        <Text style={styles.selectOptionText}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
          <View style={styles.selectWrap}>
            <Text style={styles.selectLabel}>Статус</Text>
            <TouchableOpacity style={styles.selectInput} onPress={() => setOpenSelect(openSelect === 'status' ? null : 'status')}>
              <Text style={styles.selectInputText}>
                {activeFilter === 'all' ? 'Все' : activeFilter === 'active' ? 'Активные' : 'Неактивные'}
              </Text>
              <MaterialCommunityIcons name={openSelect === 'status' ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.light.link} />
            </TouchableOpacity>
            {openSelect === 'status' && (
              <View style={styles.selectMenu}>
                <TouchableOpacity style={styles.selectOption} onPress={() => { setActiveFilter('all'); setOpenSelect(null); }}>
                  <Text style={styles.selectOptionText}>Все</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.selectOption} onPress={() => { setActiveFilter('active'); setOpenSelect(null); }}>
                  <Text style={styles.selectOptionText}>Активные</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.selectOption} onPress={() => { setActiveFilter('inactive'); setOpenSelect(null); }}>
                  <Text style={styles.selectOptionText}>Неактивные</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.selectWrap}>
            <Text style={styles.selectLabel}>Сортировка</Text>
            <TouchableOpacity style={styles.selectInput} onPress={() => setOpenSelect(openSelect === 'sort' ? null : 'sort')}>
              <Text style={styles.selectInputText}>{sortLabelMap[sortBy]}</Text>
              <MaterialCommunityIcons name={openSelect === 'sort' ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.light.link} />
            </TouchableOpacity>
            {openSelect === 'sort' && (
              <View style={styles.selectMenu}>
                {(Object.keys(sortLabelMap) as UserSortKey[]).map((key) => (
                  <TouchableOpacity key={key} style={styles.selectOption} onPress={() => { setSortBy(key); setOpenSelect(null); }}>
                    <Text style={styles.selectOptionText}>{sortLabelMap[key]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
        <View style={styles.searchArea}>
          <Text style={styles.selectLabel}>Поиск</Text>
          <View
            style={[styles.searchWrapper, { borderColor: searchFocused ? Colors.light.button : '#E5E7EB' }]}
          >
            <MaterialCommunityIcons name="magnify" size={20} color={Colors.light.link} />
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск по имени, email или телефону..."
              placeholderTextColor={Colors.light.placeholder}
              value={search}
              onChangeText={setSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          <Text style={styles.searchInfoText}>Пользователей: {sortedUsers.length}</Text>
          </View>
        </View>
      </View>

      {/* Таблица */}
      <View style={styles.card}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 2 }]}>ФИО</Text>
          <Text style={[styles.th, { flex: 1.2 }]}>Роль</Text>
          <Text style={[styles.th, { flex: 2 }]}>Почта</Text>
          <Text style={[styles.th, { flex: 1.5 }]}>Телефон</Text>
          <Text style={[styles.th, { flex: 0.7, textAlign: 'center' }]}>Активен</Text>
          <Text style={[styles.th, { flex: 1 }]}>Регистрация</Text>
          <Text style={[styles.th, { flex: 0.7, textAlign: 'center' }]}>Почта</Text>
          <Text style={[styles.th, { flex: 1.2, textAlign: 'center' }]}>Действия</Text>
        </View>
        <ScrollView style={styles.tableBody}>
          {sortedUsers.length === 0 ? (
            <View style={styles.emptyRow}>
              <MaterialCommunityIcons name="account-search-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Пользователи не найдены</Text>
              <Text style={styles.emptyHint}>Попробуйте изменить запрос поиска</Text>
            </View>
          ) : (
            sortedUsers.map((u, index) => {
              const roleId = getUserRoleId(u);
              const isActive = getUserIsActive(u);
              const emailVerified = getUserEmailVerified(u);
              const isCurrentUser = currentUser?.id === u.id;
              const isEven = index % 2 === 0;

              return (
                <View key={u.id} style={[styles.tableRow, isEven && styles.tableRowEven]}>
                  {/* ФИО */}
                  <View style={{ flex: 2 }}>
                    <Text style={styles.td} numberOfLines={1}>
                      {getUserLastName(u)} {getUserFirstName(u)}
                    </Text>
                    {getUserMiddleName(u) ? (
                      <Text style={styles.tdSub} numberOfLines={1}>{getUserMiddleName(u)}</Text>
                    ) : null}
                  </View>

                  {/* Роль */}
                  <View style={{ flex: 1.2 }}>
                    <View style={[styles.roleBadge, { backgroundColor: getRoleColor(roleId) + '15', borderColor: getRoleColor(roleId) + '40' }]}>
                      <Text style={[styles.roleBadgeText, { color: getRoleColor(roleId) }]} numberOfLines={1}>
                        {ROLE_LABELS[roleId] ?? 'Неизвестно'}
                      </Text>
                    </View>
                  </View>

                  {/* Почта */}
                  <View style={[styles.maskedField, { flex: 2 }]}>
                    <Text style={styles.td} numberOfLines={1}>
                      {visibleEmails.has(u.id) ? u.email : maskEmail(u.email)}
                    </Text>
                    <TouchableOpacity onPress={() => toggleEmailVisibility(u.id)} style={styles.eyeBtn}>
                      <MaterialCommunityIcons
                        name={visibleEmails.has(u.id) ? 'eye-off-outline' : 'eye-outline'}
                        size={16}
                        color={Colors.light.link}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Телефон */}
                  <View style={[styles.maskedField, { flex: 1.5 }]}>
                    <Text style={styles.td} numberOfLines={1}>
                      {visiblePhones.has(u.id) ? u.phone : maskPhone(u.phone)}
                    </Text>
                    <TouchableOpacity onPress={() => togglePhoneVisibility(u.id)} style={styles.eyeBtn}>
                      <MaterialCommunityIcons
                        name={visiblePhones.has(u.id) ? 'eye-off-outline' : 'eye-outline'}
                        size={16}
                        color={Colors.light.link}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Активен */}
                  <View style={{ flex: 0.7, alignItems: 'center' }}>
                    <View style={[styles.statusBadge, { backgroundColor: isActive ? '#10B981' + '15' : '#EF4444' + '15' }]}>
                      <View style={[styles.statusDot, { backgroundColor: isActive ? '#10B981' : '#EF4444' }]} />
                      <Text style={[styles.statusText, { color: isActive ? '#10B981' : '#EF4444' }]}>
                        {isActive ? 'Да' : 'Нет'}
                      </Text>
                    </View>
                  </View>

                  {/* Дата регистрации */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tdSmall}>{formatRequestDate(getUserCreatedAt(u))}</Text>
                  </View>

                  {/* Подтверждённая почта */}
                  <View style={{ flex: 0.7, alignItems: 'center' }}>
                    <MaterialCommunityIcons
                      name={emailVerified ? 'check-circle' : 'close-circle'}
                      size={20}
                      color={emailVerified ? '#10B981' : '#EF4444'}
                    />
                  </View>

                  {/* Действия */}
                  <View style={[styles.actionsCell, { flex: 1.2 }]}>
                    <TouchableOpacity
                      style={[styles.actionBtn, isCurrentUser && styles.actionBtnDisabled]}
                      onPress={() => openRoleModal(u)}
                      disabled={isCurrentUser}
                    >
                      <MaterialCommunityIcons name="account-convert" size={15} color={isCurrentUser ? '#D1D5DB' : Colors.light.button} />
                      <Text style={[styles.actionBtnText, isCurrentUser && { color: '#D1D5DB' }]}>Роль</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, isActive ? styles.actionBtnDanger : styles.actionBtnSuccess, isCurrentUser && styles.actionBtnDisabled]}
                      onPress={() => openDeactivateModal(u)}
                      disabled={isCurrentUser}
                    >
                      <MaterialCommunityIcons
                        name={isActive ? 'account-off-outline' : 'account-check-outline'}
                        size={15}
                        color={isCurrentUser ? '#D1D5DB' : (isActive ? '#EF4444' : '#10B981')}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Модальное окно: смена роли */}
      <Modal visible={!!roleModalUser} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Изменить роль</Text>
            {roleModalUser && (
              <Text style={styles.modalSubtitle}>
                {getUserLastName(roleModalUser)} {getUserFirstName(roleModalUser)} {getUserMiddleName(roleModalUser)}
              </Text>
            )}
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setRoleDropdownOpen(!roleDropdownOpen)}
              >
                <Text style={styles.dropdownText}>
                  {ROLE_LABELS[selectedRoleId] ?? 'Выберите роль'}
                </Text>
                <MaterialCommunityIcons
                  name={roleDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={Colors.light.link}
                />
              </TouchableOpacity>
              {roleDropdownOpen && (
                <View style={styles.dropdownList}>
                  {Object.entries(ROLE_LABELS).map(([idStr, label]) => {
                    const roleId = Number(idStr);
                    const color = getRoleColor(roleId);
                    return (
                      <TouchableOpacity
                        key={roleId}
                        style={[styles.dropdownItem, selectedRoleId === roleId && styles.dropdownItemActive]}
                        onPress={() => {
                          setSelectedRoleId(roleId);
                          setRoleDropdownOpen(false);
                        }}
                      >
                        <View style={[styles.dropdownDot, { backgroundColor: color }]} />
                        <Text
                          style={[
                            styles.dropdownItemText,
                            selectedRoleId === roleId && { color: Colors.light.button, fontWeight: '600' },
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setRoleModalUser(null)}>
                <Text style={styles.modalButtonSecondaryText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, changingRole && { opacity: 0.6 }]}
                onPress={handleChangeRole}
                disabled={changingRole}
              >
                {changingRole ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Сохранить</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модальное окно: деактивация/активация */}
      <Modal visible={!!deactivateModalUser} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {deactivateModalUser && getUserIsActive(deactivateModalUser)
                ? 'Деактивировать пользователя?'
                : 'Активировать пользователя?'}
            </Text>
            {deactivateModalUser && (
              <Text style={styles.modalSubtitle}>
                {getUserLastName(deactivateModalUser)} {getUserFirstName(deactivateModalUser)} ({deactivateModalUser.email})
              </Text>
            )}
            <Text style={styles.modalDescription}>
              {deactivateModalUser && getUserIsActive(deactivateModalUser)
                ? 'Пользователь не сможет войти в систему после деактивации.'
                : 'Пользователь снова сможет входить в систему.'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setDeactivateModalUser(null)}>
                <Text style={styles.modalButtonSecondaryText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  deactivateModalUser && getUserIsActive(deactivateModalUser) && { backgroundColor: '#EF4444' },
                  deactivateModalUser && !getUserIsActive(deactivateModalUser) && { backgroundColor: '#10B981' },
                  togglingActive && { opacity: 0.6 },
                ]}
                onPress={handleToggleActive}
                disabled={togglingActive}
              >
                {togglingActive ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>
                    {deactivateModalUser && getUserIsActive(deactivateModalUser) ? 'Деактивировать' : 'Активировать'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getRoleColor(roleId: number): string {
  switch (roleId) {
    case 1: return '#EF4444';
    case 2: return '#F59E0B';
    case 3: return '#8B5CF6';
    case 4: return '#3B82F6';
    default: return '#6B7280';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
    zIndex: 200,
    position: 'relative',
  },
  searchArea: {
    flex: 1,
    gap: 6,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    gap: 8,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    paddingVertical: 10,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as Record<string, unknown>) : {}),
  },
  searchInfoText: {
    fontSize: 13,
    color: Colors.light.link,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    flexShrink: 0,
    zIndex: 250,
  },
  selectWrap: {
    gap: 6,
    position: 'relative',
    zIndex: 5,
    width: 180,
  },
  selectLabel: {
    fontSize: 12,
    color: Colors.light.link,
    fontWeight: '600',
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
    top: 66,
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
    fontWeight: '500',
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
      default: { elevation: 1 },
    }),
    zIndex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.link,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#FAFBFC',
  },
  td: {
    fontSize: 13,
    color: Colors.light.text,
  },
  tdSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  tdSmall: {
    fontSize: 12,
    color: Colors.light.link,
  },
  maskedField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyeBtn: {
    padding: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  actionBtnDanger: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  actionBtnSuccess: {
    borderColor: '#D1FAE5',
    backgroundColor: '#ECFDF5',
  },
  actionBtnDisabled: {
    opacity: 0.35,
  },
  actionBtnText: {
    fontSize: 12,
    color: Colors.light.button,
    fontWeight: '500',
  },
  emptyRow: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  emptyHint: {
    fontSize: 13,
    color: Colors.light.link,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 440,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.light.link,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 13,
    color: Colors.light.link,
    marginBottom: 20,
    lineHeight: 18,
  },
  dropdownContainer: {
    marginBottom: 20,
    zIndex: 10,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  dropdownList: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    zIndex: 100,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.12)' },
      default: { elevation: 5 },
    }),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(5,148,103,0.06)',
  },
  dropdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    backgroundColor: Colors.light.button,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    minWidth: 110,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.buttonText,
  },
  modalButtonSecondary: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalButtonSecondaryText: {
    fontSize: 14,
    color: Colors.light.text,
  },
});
