import { View, Text, StyleSheet } from 'react-native';

export default function AgreementsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meus Combinados</Text>
      <Text style={styles.placeholder}>Lista de acordos — em desenvolvimento</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 16 },
  placeholder: { color: '#666', fontStyle: 'italic' },
});
