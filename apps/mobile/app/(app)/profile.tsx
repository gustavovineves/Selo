import { View, Text, StyleSheet } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.placeholder}>Perfil e score de confiança — em desenvolvimento</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 16 },
  placeholder: { color: '#666', fontStyle: 'italic' },
});
