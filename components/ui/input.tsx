/**
 * Fishmart Design System - Input Component
 * 
 * Custom text input with Fishmart styling.
 */

import React, { useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { TextInput, HelperText, useTheme } from 'react-native-paper';
import type { FishmartTheme } from '@/constants/design-system';

type InputSize = 'sm' | 'md' | 'lg';

interface FMInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  size?: InputSize;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'email' | 'password' | 'name' | 'tel' | 'off';
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  style?: ViewStyle;
}

export function FMInput({
  label,
  value,
  onChangeText,
  placeholder,
  size = 'md',
  error,
  helperText,
  disabled = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoComplete = 'off',
  leftIcon,
  rightIcon,
  onRightIconPress,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  style,
}: FMInputProps) {
  const theme = useTheme<FishmartTheme>();
  const [isFocused, setIsFocused] = useState(false);
  
  const sizeConfig = theme.custom.componentSizes.input[size];
  
  return (
    <View style={[styles.container, style]}>
      <TextInput
        mode="outlined"
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        disabled={disabled}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        multiline={multiline}
        numberOfLines={numberOfLines}
        maxLength={maxLength}
        error={!!error}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        left={leftIcon ? <TextInput.Icon icon={leftIcon} /> : undefined}
        right={rightIcon ? (
          <TextInput.Icon icon={rightIcon} onPress={onRightIconPress} />
        ) : undefined}
        style={[
          styles.input,
          { 
            fontSize: sizeConfig.fontSize,
          },
          multiline && { height: 'auto', minHeight: sizeConfig.height * numberOfLines },
        ]}
        contentStyle={[
          !multiline && { height: sizeConfig.height },
        ]}
        outlineStyle={{
          borderRadius: theme.custom.borderRadius.lg,
          borderWidth: isFocused ? 2 : 1,
        }}
        activeOutlineColor={theme.colors.primary}
        outlineColor={theme.colors.outline}
      />
      {(error || helperText) && (
        <HelperText type={error ? 'error' : 'info'} visible={!!(error || helperText)}>
          {error || helperText}
        </HelperText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'transparent',
  },
});
