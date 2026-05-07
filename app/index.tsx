import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import {
  ADMIN_ROLE_ID,
  CLIENT_ROLE_ID,
  MANAGER_ROLE_ID,
  SPECIALIST_ROLE_ID,
  useAuth,
} from '@/contexts/auth-context';
import { getUserRoleId } from '@/lib/user-utils';

type SectionKey = 'hero' | 'social' | 'benefits' | 'reviews' | 'faq' | 'cta' | 'contacts';
const isWeb = Platform.OS === 'web';

const FAQ_ITEMS = [
  {
    q: 'Как быстро можно запустить работу в системе?',
    a: 'После регистрации вы сразу можете создавать заявки, назначать исполнителей и вести коммуникацию в чате.',
  },
  {
    q: 'Можно ли прикладывать фото и документы к заявке?',
    a: 'Да. Поддерживаются вложения изображений и PDF-документов для удобной фиксации информации.',
  },
  {
    q: 'Есть ли контроль этапов выполнения заявки?',
    a: 'Да. Статусы, история изменений и проверка результатов менеджером помогают держать процесс под контролем.',
  },
  {
    q: 'Подходит ли SORAFIX для команд с разными ролями?',
    a: 'Платформа изначально построена под роли клиента, менеджера, специалиста и администратора.',
  },
];

export default function LandingScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isPhone = width < 768;
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [supportName, setSupportName] = useState('');
  const [supportContact, setSupportContact] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [sectionY, setSectionY] = useState<Record<SectionKey, number>>({
    hero: 0,
    social: 0,
    benefits: 0,
    reviews: 0,
    faq: 0,
    cta: 0,
    contacts: 0,
  });

  useEffect(() => {
    if (!isLoading && user) {
      const roleId = getUserRoleId(user);
      if (roleId === ADMIN_ROLE_ID) router.replace('/(admin)' as '/');
      else if (roleId === CLIENT_ROLE_ID) router.replace('/(client)' as '/');
      else if (roleId === MANAGER_ROLE_ID) router.replace('/(manager)' as '/');
      else if (roleId === SPECIALIST_ROLE_ID) router.replace('/(specialist)' as '/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.button} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={styles.bgCircleA} />
      <View pointerEvents="none" style={styles.bgCircleB} />
      <View pointerEvents="none" style={styles.bgCircleC} />
      <View pointerEvents="none" style={styles.bgGrid} />

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.headerFull, { paddingTop: isWeb ? 0 : insets.top }]}>
          <View style={[styles.headerInner, isPhone && styles.headerInnerPhone]}>
            <Text style={[styles.logo, isPhone && styles.logoPhone]}>SORAFIX</Text>
            {!isPhone && <View style={styles.nav}>
              {[
                ['hero', 'Главная'],
                ['benefits', 'Возможности'],
                ['reviews', 'Отзывы'],
                ['faq', 'FAQ'],
                ['contacts', 'Контакты'],
              ].map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => scrollRef.current?.scrollTo({ y: sectionY[key as SectionKey], animated: true })}
                >
                  <Text style={styles.navLink}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>}
            {isPhone ? (
              <View style={styles.headerPhoneActions}>
                <TouchableOpacity
                  onPress={() => setMobileMenuOpen((v) => !v)}
                  style={styles.burgerBtn}
                  accessibilityLabel="Открыть меню"
                >
                  <MaterialIcons name={mobileMenuOpen ? 'close' : 'menu'} size={24} color="#334155" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/auth' as '/')} style={[styles.loginBtn, styles.loginBtnPhone]}>
                  <Text style={styles.loginBtnText}>Войти</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => router.push('/auth' as '/')} style={styles.loginBtn}>
                <Text style={styles.loginBtnText}>Войти</Text>
              </TouchableOpacity>
            )}
          </View>
          {isPhone && mobileMenuOpen && (
            <View style={styles.mobileMenu}>
              {[
                ['hero', 'Главная'],
                ['benefits', 'Возможности'],
                ['reviews', 'Отзывы'],
                ['faq', 'FAQ'],
                ['contacts', 'Контакты'],
              ].map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={styles.mobileMenuLink}
                  onPress={() => {
                    setMobileMenuOpen(false);
                    scrollRef.current?.scrollTo({ y: sectionY[key as SectionKey], animated: true });
                  }}
                >
                  <Text style={styles.mobileMenuLinkText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.container, isPhone && styles.containerPhone]}>

          <View style={[styles.hero, isPhone && styles.heroPhone]} onLayout={(e) => setSectionY((p) => ({ ...p, hero: e.nativeEvent.layout.y }))}>
            <Text style={[styles.heroBadge, isPhone && styles.heroBadgePhone]}>Единая платформа сервисного обслуживания</Text>
            <Text style={[styles.heroTitle, isPhone && styles.heroTitlePhone]}>
              Контролируйте заявки
              <Text style={styles.heroAccent}> от обращения до закрытия</Text>
            </Text>
            <Text style={[styles.heroSubtitle, isPhone && styles.heroSubtitlePhone]}>
              Создавайте заявки, управляйте процессом, общайтесь в чате, прикладывайте документы и
              отслеживайте выполнение в реальном времени.
            </Text>
            <View style={[styles.heroButtons, isPhone && styles.heroButtonsPhone]}>
              <TouchableOpacity style={[styles.primaryBtn, isPhone && styles.heroBtnPhone]} onPress={() => router.push('/auth' as '/')}>
                <Text style={styles.primaryBtnText}>Начать работу</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, isPhone && styles.heroBtnPhone]}
                onPress={() => scrollRef.current?.scrollTo({ y: sectionY.benefits, animated: true })}
              >
                <Text style={styles.secondaryBtnText}>Подробнее о возможностях</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section} onLayout={(e) => setSectionY((p) => ({ ...p, social: e.nativeEvent.layout.y }))}>
            <Text style={[styles.sectionTitle, styles.sectionTitleCenter, isPhone && styles.sectionTitlePhone]}>Нам доверяют команды и сервисные отделы</Text>
            <View style={styles.logoRow}>
              {['TechLine', 'DevicePro', 'ServiceHub', 'RepairCity', 'IT Support'].map((name) => (
                <View key={name} style={styles.logoChip}>
                  <Text style={styles.logoChipText}>{name}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section} onLayout={(e) => setSectionY((p) => ({ ...p, benefits: e.nativeEvent.layout.y }))}>
            <Text style={[styles.sectionLabel, isPhone && styles.sectionLabelPhone]}>Возможности</Text>
            <Text style={[styles.sectionTitle, isPhone && styles.sectionTitlePhone]}>Все, что нужно для эффективной работы</Text>
            <View style={styles.features}>
              {[
                {
                  title: 'Управление заявками',
                  text: 'Гибкие статусы и контроль исполнения без потери контекста.',
                  points: ['Маршрут этапов заявки', 'История изменений', 'Контроль сроков'],
                  effect: '−35% времени на обработку',
                },
                {
                  title: 'Чат и вложения',
                  text: 'Единая коммуникация внутри карточки заявки.',
                  points: ['Чат для всех участников', 'Фото и PDF-вложения', 'Просмотр и скачивание'],
                  effect: '100% информации в одном месте',
                },
                {
                  title: 'Согласование цены и договора',
                  text: 'Финансовые этапы прозрачны для клиента и менеджера.',
                  points: ['Подтверждение/отклонение цены', 'Генерация договора', 'Проверка выполнения'],
                  effect: 'Меньше спорных ситуаций',
                },
                {
                  title: 'Роли и безопасность',
                  text: 'Гибкое разграничение доступа по ролям команды.',
                  points: ['4 пользовательские роли', 'Аудит действий', 'Уведомления и Telegram'],
                  effect: 'Полный контроль процессов',
                },
              ].map((item) => (
                <View key={item.title} style={styles.featureItem}>
                  <Text style={styles.featureTitle}>{item.title}</Text>
                  <Text style={styles.featureText}>{item.text}</Text>
                  <View style={styles.featureList}>
                    {item.points.map((point) => (
                      <View key={point} style={styles.featurePointRow}>
                        <View style={styles.featurePointDot} />
                        <Text style={styles.featurePointText}>{point}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.featureBottom}>
                    <Text style={styles.featureEffect}>{item.effect}</Text>
                    <TouchableOpacity style={styles.inlineBtn} onPress={() => router.push('/auth' as '/')}>
                      <Text style={styles.inlineBtnText}>Открыть в системе</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section} onLayout={(e) => setSectionY((p) => ({ ...p, reviews: e.nativeEvent.layout.y }))}>
            <Text style={[styles.sectionLabel, isPhone && styles.sectionLabelPhone]}>Отзывы</Text>
            <Text style={[styles.sectionTitle, isPhone && styles.sectionTitlePhone]}>Что говорят пользователи SORAFIX</Text>
            <View style={[styles.reviewRow, isPhone && styles.reviewRowPhone]}>
              {[
                {
                  name: 'Алексей Воронов',
                  role: 'Менеджер сервиса',
                  score: '5.0',
                  text: 'Стало намного проще контролировать загрузку специалистов и сроки выполнения заявок.',
                  result: 'Скорость обработки +42%',
                },
                {
                  name: 'Мария Климова',
                  role: 'Клиент',
                  score: '4.9',
                  text: 'Удобно видеть цену, статусы и всю переписку в одном месте без лишних звонков.',
                  result: 'Полная прозрачность этапов',
                },
                {
                  name: 'Игорь Соколов',
                  role: 'Тех. специалист',
                  score: '5.0',
                  text: 'Чат и документы внутри заявки экономят время и ускоряют выполнение работ.',
                  result: 'Меньше рутины в работе',
                },
              ].map((item) => (
                <View key={item.name} style={[styles.reviewCard, isPhone && styles.reviewCardPhone]}>
                  <View style={styles.reviewHead}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewAvatarText}>{item.name[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewAuthor}>{item.name}</Text>
                      <Text style={styles.reviewRole}>{item.role}</Text>
                    </View>
                    <Text style={styles.reviewScore}>★ {item.score}</Text>
                  </View>
                  <Text style={styles.reviewText}>“{item.text}”</Text>
                  <Text style={styles.reviewResult}>{item.result}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section} onLayout={(e) => setSectionY((p) => ({ ...p, faq: e.nativeEvent.layout.y }))}>
            <Text style={[styles.sectionLabel, isPhone && styles.sectionLabelPhone]}>FAQ</Text>
            <Text style={[styles.sectionTitle, isPhone && styles.sectionTitlePhone]}>Частые вопросы</Text>
            <View style={styles.faqList}>
              {FAQ_ITEMS.map((item, idx) => {
                const opened = openFaq === idx;
                return (
                  <View key={item.q} style={styles.faqItem}>
                    <TouchableOpacity
                      style={styles.faqHeader}
                      onPress={() => setOpenFaq((prev) => (prev === idx ? null : idx))}
                    >
                      <Text style={styles.faqQ}>{item.q}</Text>
                      <Text style={styles.faqSign}>{opened ? '−' : '+'}</Text>
                    </TouchableOpacity>
                    {opened && <Text style={styles.faqA}>{item.a}</Text>}
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.finalCta} onLayout={(e) => setSectionY((p) => ({ ...p, cta: e.nativeEvent.layout.y }))}>
            <View style={[styles.supportLayout, isPhone && styles.supportLayoutPhone]}>
              <View style={styles.supportInfo}>
                <Text style={[styles.supportHeading, isPhone && styles.supportHeadingPhone]}>Свяжитесь с техподдержкой</Text>
                <Text style={styles.supportInfoLabel}>Email:</Text>
                <Text style={styles.supportInfoValue}>support@sorafix.ru</Text>

                <Text style={styles.supportInfoLabel}>Телефон:</Text>
                <Text style={styles.supportInfoValue}>+7 (800) 555-35-35</Text>

                <Text style={styles.supportInfoLabel}>Адрес:</Text>
                <Text style={styles.supportInfoValue}>
                  г. Москва, ул. Техническая, 12{"\n"}
                  Центр обслуживания SORAFIX
                </Text>
              </View>

              <View style={[styles.supportForm, isPhone && styles.supportFormPhone]}>
                <View style={[styles.supportRow, isPhone && styles.supportRowPhone]}>
                  <View style={styles.supportField}>
                    <Text style={styles.supportFieldLabel}>Ваше имя</Text>
                    <TextInput
                      value={supportName}
                      onChangeText={setSupportName}
                      placeholder="Введите ваше имя"
                      placeholderTextColor="#94A3B8"
                      style={styles.supportInput}
                    />
                  </View>
                  <View style={styles.supportField}>
                    <Text style={styles.supportFieldLabel}>Email или телефон</Text>
                    <TextInput
                      value={supportContact}
                      onChangeText={setSupportContact}
                      placeholder="Введите контакт"
                      placeholderTextColor="#94A3B8"
                      style={styles.supportInput}
                    />
                  </View>
                </View>

                <View style={styles.supportField}>
                  <Text style={styles.supportFieldLabel}>Сообщение</Text>
                  <TextInput
                    value={supportMessage}
                    onChangeText={setSupportMessage}
                    placeholder="Опишите ваш вопрос..."
                    placeholderTextColor="#94A3B8"
                    style={[styles.supportInput, styles.supportTextarea]}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity style={[styles.supportSubmit, isPhone && styles.heroBtnPhone]} onPress={() => router.push('/auth' as '/')}>
                  <Text style={styles.primaryBtnText}>Отправить обращение</Text>
                </TouchableOpacity>
                <Text style={styles.supportHint}>Для отправки обращения потребуется авторизация.</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer} onLayout={(e) => setSectionY((p) => ({ ...p, contacts: e.nativeEvent.layout.y }))}>
          <View style={[styles.container, isPhone && styles.containerPhone]}>
            <View style={[styles.footerTop, isPhone && styles.footerTopPhone]}>
              <View style={{ flex: 1.4 }}>
                <Text style={styles.footerLogo}>SORAFIX</Text>
                <Text style={styles.footerText}>
                  Платформа для прозрачного и удобного управления сервисным обслуживанием.
                </Text>
                <Text style={[styles.footerText, { marginTop: 10 }]}>
                  Режим поддержки: Пн–Вс, 08:00–22:00 (МСК)
                </Text>
              </View>
              <View style={styles.footerCol}>
                <Text style={styles.footerTitle}>Документы</Text>
                <Text style={styles.footerLink}>Пользовательское соглашение</Text>
                <Text style={styles.footerLink}>Политика конфиденциальности</Text>
                <Text style={styles.footerLink}>Условия обслуживания</Text>
              </View>
              <View style={styles.footerCol}>
                <Text style={styles.footerTitle}>Контакты</Text>
                <Text style={styles.footerLink}>support@sorafix.com</Text>
                <Text style={styles.footerLink}>+7 (900) 000-00-00</Text>
                <Text style={styles.footerLink}>Telegram: @sorafix_support</Text>
              </View>
              <View style={styles.footerCol}>
                <Text style={styles.footerTitle}>Разделы</Text>
                <Text style={styles.footerLink}>Возможности платформы</Text>
                <Text style={styles.footerLink}>Отзывы клиентов</Text>
                <Text style={styles.footerLink}>FAQ и поддержка</Text>
              </View>
            </View>
            <View style={styles.footerBottom}>
              <Text style={styles.footerText}>© 2026 SORAFIX. Все права защищены.</Text>
              <Text style={styles.footerText}>ООО «СОРАФИКС», ИНН 9704007257</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingBottom: 0,
  },
  container: {
    width: '100%',
    maxWidth: 1220,
    alignSelf: 'center',
    paddingHorizontal: 22,
  },
  headerFull: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  headerInner: {
    width: '100%',
    maxWidth: 1220,
    alignSelf: 'center',
    paddingHorizontal: 22,
    minHeight: 98,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerPhoneActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  burgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileMenu: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    backgroundColor: '#FFFFFF',
  },
  mobileMenuLink: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  mobileMenuLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  bgCircleA: {
    position: 'absolute',
    top: -120,
    right: -120,
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: 'rgba(16,185,129,0.12)',
    zIndex: 0,
  },
  bgCircleB: {
    position: 'absolute',
    top: 580,
    left: -180,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(5,148,103,0.09)',
    zIndex: 0,
  },
  bgCircleC: {
    position: 'absolute',
    bottom: 160,
    right: -140,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(16,185,129,0.10)',
    zIndex: 0,
  },
  bgGrid: {
    ...Platform.select({
      web: {
        position: 'absolute',
        inset: 0,
        backgroundSize: '36px 36px',
        backgroundImage:
          'linear-gradient(to right, rgba(15,23,42,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.03) 1px, transparent 1px)',
      },
      default: {},
    }),
  },
  header: {
    minHeight: 98,
  },
  logo: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.light.button,
  },
  nav: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 18,
  },
  navLink: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  loginBtn: {
    backgroundColor: Colors.light.button,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  loginBtnText: {
    color: Colors.light.buttonText,
    fontWeight: '700',
    fontSize: 15,
  },
  hero: {
    paddingTop: 42,
    paddingBottom: 34,
    alignItems: 'center',
  },
  heroBadge: {
    alignSelf: 'center',
    fontSize: 13,
    color: '#047857',
    fontWeight: '700',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 66,
    lineHeight: 76,
    fontWeight: '800',
    color: '#0F172A',
    maxWidth: 960,
    marginBottom: 14,
    textAlign: 'center',
  },
  heroAccent: {
    color: Colors.light.button,
  },
  heroSubtitle: {
    fontSize: 22,
    lineHeight: 34,
    color: '#475569',
    maxWidth: 880,
    textAlign: 'center',
  },
  heroButtons: {
    marginTop: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: Colors.light.button,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: Colors.light.buttonText,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    color: '#047857',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingVertical: 36,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: Colors.light.button,
    marginBottom: 8,
  },
  sectionLabelPhone: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: Colors.light.button,
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 50,
    lineHeight: 60,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  sectionTitleCenter: {
    textAlign: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  logoChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logoChipText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 14,
  },
  features: {
    gap: 14,
  },
  featureItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 18,
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  featureText: {
    fontSize: 17,
    lineHeight: 28,
    color: '#64748B',
    marginBottom: 12,
  },
  featureList: {
    gap: 8,
    marginBottom: 14,
  },
  featurePointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featurePointDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.button,
  },
  featurePointText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  featureBottom: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  featureEffect: {
    fontSize: 13,
    color: '#047857',
    fontWeight: '700',
  },
  inlineBtn: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  inlineBtnText: {
    color: '#047857',
    fontWeight: '600',
    fontSize: 14,
  },
  reviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reviewRowPhone: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    gap: 12,
  },
  reviewCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 16,
  },
  reviewCardPhone: {
    width: '100%',
    minWidth: 0,
  },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    color: '#047857',
    fontWeight: '700',
    fontSize: 14,
  },
  reviewRole: {
    fontSize: 12,
    color: '#64748B',
  },
  reviewScore: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  reviewText: {
    fontSize: 16,
    lineHeight: 27,
    color: '#334155',
    marginBottom: 10,
  },
  reviewAuthor: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.button,
  },
  reviewResult: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  faqList: {
    gap: 10,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  faqQ: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
  },
  faqSign: {
    fontSize: 24,
    color: Colors.light.button,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  faqA: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 24,
    color: '#64748B',
  },
  finalCta: {
    paddingVertical: 40,
    alignItems: 'stretch',
  },
  supportLayout: {
    flexDirection: 'column',
    gap: 18,
    paddingVertical: 4,
  },
  supportInfo: {
    width: '100%',
    gap: 4,
  },
  supportHeading: {
    fontSize: 44,
    lineHeight: 52,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  supportInfoLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 10,
  },
  supportInfoValue: {
    fontSize: 16,
    lineHeight: 24,
    color: '#0F172A',
    fontWeight: '400',
  },
  supportForm: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    padding: 0,
    gap: 12,
  },
  supportRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  supportField: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  supportFieldLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  supportInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as Record<string, unknown>) : {}),
  },
  supportTextarea: {
    minHeight: 170,
    paddingTop: 10,
  },
  supportSubmit: {
    backgroundColor: Colors.light.button,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  supportActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  supportHint: {
    fontSize: 12,
    color: '#64748B',
  },
  footer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingTop: 28,
    paddingBottom: 22,
  },
  footerTop: {
    flexDirection: 'row',
    gap: 18,
    flexWrap: 'wrap',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  footerCol: {
    minWidth: 220,
    flex: 1,
  },
  footerLogo: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.light.button,
    marginBottom: 8,
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  footerLink: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 6,
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
  footerBottom: {
    paddingTop: 12,
  },
  headerInnerPhone: {
    minHeight: 72,
    paddingHorizontal: 14,
  },
  logoPhone: {
    fontSize: 26,
  },
  loginBtnPhone: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  containerPhone: {
    paddingHorizontal: 14,
  },
  heroPhone: {
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'flex-start',
  },
  heroBadgePhone: {
    alignSelf: 'flex-start',
    fontSize: 12,
    marginBottom: 12,
  },
  heroTitlePhone: {
    fontSize: 34,
    lineHeight: 42,
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSubtitlePhone: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  heroButtonsPhone: {
    width: '100%',
    marginTop: 16,
  },
  heroBtnPhone: {
    width: '100%',
    alignItems: 'center',
  },
  sectionTitlePhone: {
    fontSize: 30,
    lineHeight: 38,
    marginBottom: 12,
    textAlign: 'center',
  },
  supportLayoutPhone: {
    gap: 16,
    paddingVertical: 0,
  },
  supportHeadingPhone: {
    fontSize: 30,
    lineHeight: 38,
    marginBottom: 10,
    textAlign: 'center',
  },
  supportFormPhone: {
    minWidth: 0,
    flex: 1,
  },
  supportRowPhone: {
    flexDirection: 'row',
    gap: 12,
  },
  footerTopPhone: {
    flexDirection: 'column',
    gap: 14,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
