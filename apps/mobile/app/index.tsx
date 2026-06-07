import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../src/theme';

export default function Index() {
  const [ready, setReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [seenWelcome, setSeenWelcome] = useState(false);

  useEffect(() => {
    Promise.all([
      SecureStore.getItemAsync('accessToken'),
      SecureStore.getItemAsync('welcome_seen'),
    ])
      .then(([token, seen]) => {
        setHasToken(!!token);
        setSeenWelcome(!!seen);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgDark }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (hasToken) return <Redirect href="/(app)/home" />;
  if (seenWelcome) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(onboarding)/welcome" />;
}
