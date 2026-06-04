import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Início</Text>
      <Text style={styles.placeholder}>Dashboard de combinados — em desenvolvimento</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 16 },
  placeholder: { color: '#666', fontStyle: 'italic' },
});
