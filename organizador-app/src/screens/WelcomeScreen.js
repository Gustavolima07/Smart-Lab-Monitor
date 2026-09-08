// src/screens/WelcomeScreen.js
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

import { Ionicons } from '@expo/vector-icons';



export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Ícone ou Logo do Sistema */}
      <View style={styles.iconContainer}>
        <Ionicons name="hardware-chip-outline" size={80} color="#005b9f" />
      </View>

      <Text style={styles.titulo}>Smart Lab Monitor</Text>
      <Text style={styles.subtitulo}>
        Gerenciamento inteligente de hardware para laboratórios e salas maker.
      </Text>

      {/* Botão de Entrar (Login) */}
      <TouchableOpacity 
        style={styles.botaoPrimario} 
        onPress={() => navigation.navigate('Login')}
      >
        <Ionicons name="log-in-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.textoBotaoPrimario}>Entrar</Text>
      </TouchableOpacity>

      {/* Botão de Cadastro (Sign In / Registrar) */}
      <TouchableOpacity 
        style={styles.botaoSecundario} 
        onPress={() => navigation.navigate('Register')}
      >
        <Ionicons name="person-add-outline" size={20} color="#005b9f" style={{ marginRight: 8 }} />
        <Text style={styles.textoBotaoSecundario}>Criar Conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 20,
    backgroundColor: '#e3f2fd',
    padding: 20,
    borderRadius: 50,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  botaoPrimario: {
    flexDirection: 'row',
    backgroundColor: '#005b9f',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    elevation: 2,
  },
  textoBotaoPrimario: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botaoSecundario: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#005b9f',
  },
  textoBotaoSecundario: {
    color: '#005b9f',
    fontSize: 16,
    fontWeight: 'bold',
  },
});