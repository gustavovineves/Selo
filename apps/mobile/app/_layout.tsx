import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { registerSessionExpiredHandler } from '../src/services/api';

export default function RootLayout() {
  useEffect(() => {
    registerSessionExpiredHandler(() => {
      Alert.alert(
        'Sessão expirada',
        'Sua sessão expirou. Entre novamente para continuar.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
        { cancelable: false },
      );
    });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1E1B4B' },
          headerTintColor: '#ffffff',
          contentStyle: { backgroundColor: '#F2F2F7' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="create-agreement" options={{ headerShown: false }} />
        <Stack.Screen
          name="agreement/[id]"
          options={{
            title: 'Combinado',
            headerStyle: { backgroundColor: '#1E1B4B' },
            headerTintColor: '#ffffff',
          }}
        />
        <Stack.Screen
          name="edit-profile"
          options={{
            title: 'Editar perfil',
            headerStyle: { backgroundColor: '#1E1B4B' },
            headerTintColor: '#ffffff',
          }}
        />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="trust-score" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
