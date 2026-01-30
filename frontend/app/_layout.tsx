import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';

// Polyfill Buffer for web
if (Platform.OS === 'web') {
  global.Buffer = require('buffer').Buffer;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/welcome" />
          <Stack.Screen name="auth/register" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="map/index" />
          <Stack.Screen name="incidents/report" />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}