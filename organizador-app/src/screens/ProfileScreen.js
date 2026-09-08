// src/screens/ProfileScreen.js
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }) {
  
  // Função que simula a "desativação da busca" e retorna para a home
  const irParaHome = () => {
    console.log("Busca de PCs desativada temporariamente.");
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <Ionicons name="person-circle-outline" size={80} color="#005b9f" />
      <Text style={styles.titulo}>Perfil do Professor</Text>
      <Text style={styles.texto}>Gerenciamento do Sistema de Laboratórios.</Text>
      
      {/* Botão para desativar busca e ir para a Home */}
      <TouchableOpacity style={styles.botao} onPress={irParaHome}>
        <Ionicons name="home-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.textoBotao}>Voltar para o Painel (Home)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  titulo: { fontSize: 24, fontWeight: 'bold', marginTop: 15, marginBottom: 10, color: '#333' },
  texto: { fontSize: 16, color: '#666', marginBottom: 30, textAlign: 'center' },
  botao: {
    flexDirection: 'row',
    backgroundColor: '#005b9f',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  textoBotao: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});