/**
 * Цветовая схема SORAPC
 * Кнопки: #059467, текст на кнопках: белый, текст: чёрный, иконки: чёрный, фон: белый
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#FFFFFF',
    button: '#059467',
    buttonText: '#FFFFFF',
    icon: '#000000',
    iconMuted: '#6B7280',
    placeholder: 'rgba(0, 0, 0, 0.5)',
    link: '#6B7280',
  },
  dark: {
    text: '#000000',
    background: '#FFFFFF',
    button: '#059467',
    buttonText: '#FFFFFF',
    icon: '#000000',
    iconMuted: '#6B7280',
    placeholder: 'rgba(0, 0, 0, 0.5)',
    link: '#6B7280',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
