import React from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';

export default function ChatSrcreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Tela de Chat</Text>
      <Text style={styles.texto}>Chats.</Text>
      <Button title="Voltar" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  titulo: { fontSize: 24, fontWeight: 'bold' },
  texto: { fontSize: 16, marginVertical: 20 }
});