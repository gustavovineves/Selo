import { Tabs } from 'expo-router';

// TODO: Fase 1 — adicionar ícones (expo-vector-icons ou @expo/vector-icons)

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#1a1a2e', borderTopColor: '#2a2a4e' },
        tabBarActiveTintColor: '#6c63ff',
        tabBarInactiveTintColor: '#666',
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#ffffff',
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Início' }} />
      <Tabs.Screen name="agreements" options={{ title: 'Combinados' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
