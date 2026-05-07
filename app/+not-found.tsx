import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Colors } from '@/constants/theme';

export default function NotFoundScreen() {
  const { width } = useWindowDimensions();
  const isPhone = width < 768;

  return (
    <View style={[styles.container, isPhone && styles.containerPhone]}>
      <View style={[styles.content, isPhone && styles.contentPhone]}>
        <View style={[styles.left, isPhone && styles.leftPhone]}>
          <Text style={[styles.code, isPhone && styles.codePhone]}>404</Text>
        </View>

        <View style={[styles.right, isPhone && styles.rightPhone]}>
          <Text style={[styles.title, isPhone && styles.titlePhone]}>Увы, страница не найдена</Text>
          <Text style={[styles.description, isPhone && styles.descriptionPhone]}>
            К сожалению, вы зашли на несуществующую страницу. Возможно, вы перешли по старой ссылке
            или ввели неправильный адрес.
          </Text>
          <Text style={[styles.description, isPhone && styles.descriptionPhone]}>
            Проверьте ссылку или вернитесь на главную страницу.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  containerPhone: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 1120,
    flexDirection: Platform.select({ web: 'row', default: 'column' }),
    alignItems: 'center',
    justifyContent: 'center',
    gap: 26,
  },
  contentPhone: {
    maxWidth: 420,
    gap: 12,
    flexDirection: 'column',
  },
  left: {
    width: Platform.select({ web: 500 }),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  },
  leftPhone: {
    width: '100%',
    minHeight: 150,
  },
  right: {
    width: Platform.select({ web: 460 }),
    justifyContent: 'center',
    gap: 14,
  },
  rightPhone: {
    width: '100%',
    gap: 10,
  },
  code: {
    fontSize: Platform.select({ web: 250, default: 170 }),
    lineHeight: Platform.select({ web: 250, default: 170 }),
    fontWeight: '900',
    color: Colors.light.button,
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(5,148,103,0.15)',
    textShadowOffset: { width: 0, height: 8 },
    textShadowRadius: 18,
  },
  codePhone: {
    fontSize: 112,
    lineHeight: 112,
    letterSpacing: 1,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  title: {
    fontSize: 54,
    fontWeight: '700',
    color: Colors.light.text,
    lineHeight: 62,
  },
  titlePhone: {
    fontSize: 30,
    lineHeight: 36,
    textAlign: 'center',
  },
  description: {
    fontSize: 20,
    lineHeight: 31,
    color: Colors.light.link,
    maxWidth: 560,
  },
  descriptionPhone: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: '100%',
  },
});