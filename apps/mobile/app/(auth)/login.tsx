import { View, Text, StyleSheet } from 'react-native';

// TODO: Fase 1 — implementar tela de login com email/senha

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selo</Text>
      <Text style={styles.subtitle}>A carteira dos seus combinados.</Text>
      <Text style={styles.placeholder}>Tela de login — em desenvolvimento</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
    marginBottom: 48,
  },
  placeholder: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});
