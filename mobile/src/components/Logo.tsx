import React from 'react';
import { Image, StyleSheet } from 'react-native';

export function Logo({ width = 132 }: { width?: number }) {
  return (
    <Image
      source={require('../assets/logo.png')}
      style={[styles.mark, { width, height: Math.round(width * 0.6) }]}
      resizeMode="contain"
      accessibilityLabel="LABAS"
    />
  );
}

const styles = StyleSheet.create({
  mark: { alignSelf: 'flex-start' },
});
