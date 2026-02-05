import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';

export default function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
  isLoading = false,
  fullWidth = false 
}) {
  const isOutline = variant === 'outline';
  
  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={isLoading}
      style={[
        styles.base,
        fullWidth && styles.fullWidth,
        isOutline ? styles.outline : styles.primary,
        variant === 'primary' && SHADOWS.medium, // Green shadow for primary
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={isOutline ? COLORS.primary : '#FFF'} />
      ) : (
        <Text style={[
          styles.text, 
          isOutline ? styles.textOutline : styles.textPrimary
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12, // rounded-xl
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textOutline: {
    color: COLORS.secondary,
  }
});