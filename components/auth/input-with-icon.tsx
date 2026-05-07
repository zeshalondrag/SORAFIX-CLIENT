import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    type TextInputProps,
} from 'react-native';

import { Colors } from '@/constants/theme';

const FOCUS_BORDER_COLOR = '#059467';
const ERROR_BORDER_COLOR = '#DC2626';

type InputWithIconProps = TextInputProps & {
  icon: keyof typeof MaterialIcons.glyphMap;
  error?: string;
  readOnly?: boolean;
};

export function InputWithIcon({ icon, error, readOnly, style, onFocus, onBlur, ...props }: InputWithIconProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? ERROR_BORDER_COLOR
    : focused && !readOnly
      ? FOCUS_BORDER_COLOR
      : '#E5E7EB';

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.inputRow,
          { borderColor },
          focused && !error && !readOnly && styles.inputRowFocused,
          readOnly && styles.inputRowReadOnly,
        ]}
      >
        <MaterialIcons
          name={icon}
          size={22}
          color={readOnly ? '#9CA3AF' : Colors.light.iconMuted}
          style={styles.icon}
        />
        <TextInput
          style={[
            styles.input,
            readOnly && styles.inputReadOnly,
            Platform.OS === 'web' && ({
              outlineStyle: 'none',
              outlineWidth: 0,
              outlineColor: 'transparent',
              boxShadow: 'none',
            } as Record<string, unknown>),
            style,
          ]}
          placeholderTextColor={Colors.light.placeholder}
          editable={!readOnly}
          onFocus={(e) => {
            if (!readOnly) setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

type PasswordInputProps = Omit<InputWithIconProps, 'icon' | 'secureTextEntry'>;

export function PasswordInput({ error, onFocus, onBlur, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? ERROR_BORDER_COLOR
    : focused
      ? FOCUS_BORDER_COLOR
      : '#E5E7EB';

  return (
    <View style={styles.wrapper}>
      <View style={[styles.inputRow, { borderColor }, focused && !error && styles.inputRowFocused]}>
        <MaterialIcons name="lock" size={22} color={Colors.light.iconMuted} style={styles.icon} />
        <TextInput
          style={[
            styles.input,
            Platform.OS === 'web' && ({
              outlineStyle: 'none',
              outlineWidth: 0,
              outlineColor: 'transparent',
              boxShadow: 'none',
            } as Record<string, unknown>),
          ]}
          placeholderTextColor={Colors.light.placeholder}
          secureTextEntry={!visible}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        <TouchableOpacity
          onPress={() => setVisible((v) => !v)}
          style={styles.eyeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons
            name={visible ? 'visibility-off' : 'visibility'}
            size={22}
            color={Colors.light.iconMuted}
          />
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  inputRowFocused: {
    borderColor: FOCUS_BORDER_COLOR,
  },
  inputRowReadOnly: {
    backgroundColor: '#F3F4F6',
  },
  inputReadOnly: {
    color: '#6B7280',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
    marginLeft: 4,
  },
  eyeButton: {
    padding: 4,
  },
});
