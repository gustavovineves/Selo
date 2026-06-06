import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
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
        <Stack.Screen name="create-agreement" options={{ headerShown: false }} />
        <Stack.Screen
          name="agreement/[id]"
          options={{
            title: 'Combinado',
            headerStyle: { backgroundColor: '#1E1B4B' },
            headerTintColor: '#ffffff',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
