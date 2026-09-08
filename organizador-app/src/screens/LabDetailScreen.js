// src/screens/LabDetailScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { db } from '../config/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function LabDetailScreen({ route }) {
  // Pega os parâmetros enviados ao clicar no card (ex: 'lab6' e o nome formatado)
  const { labId, nomeAmbiente } = route.params;
  const [statusPC, setStatusPC] = useState(null);

  useEffect(() => {
    // Caminho dinâmico no Realtime Database: escola/lab6/pc1 (ou sala_maker/pc1)
    const pcRef = ref(db, `escola/${labId}/pc1`);
    
    const unsubscribe = onValue(pcRef, (snapshot) => {
      setStatusPC(snapshot.val());
    });
    
    return () => unsubscribe();
  }, [labId]);

  if (!statusPC) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#005b9f" />
        <Text style={{ marginTop: 10, color: '#666' }}>Carregando dados de {nomeAmbiente}...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Painel de Controle</Text>
      
      <View style={styles.card}>
        <View style={styles.cabecalhoCard}>
          <Ionicons name="desktop" size={24} color="#005b9f" />
          <Text style={styles.nomePc}>PC 1 - {nomeAmbiente}</Text>
        </View>

        <View style={styles.linhaItem}>
          <Ionicons name="flash-outline" size={20} color={statusPC.ligado ? '#2e7d32' : '#c62828'} />
          <Text style={styles.texto}> Energia: <Text style={{fontWeight: 'bold', color: statusPC.ligado ? '#2e7d32' : '#c62828'}}>{statusPC.ligado ? 'LIGADO' : 'DESLIGADO'}</Text></Text>
        </View>
        
        <View style={styles.linhaItem}>
          <Ionicons name="globe-outline" size={20} color={statusPC.rede_ativa ? '#2e7d32' : '#c62828'} />
          <Text style={styles.texto}> Rede: <Text style={{fontWeight: 'bold', color: statusPC.rede_ativa ? '#2e7d32' : '#c62828'}}>{statusPC.rede_ativa ? 'CONECTADA' : 'SEM INTERNET'}</Text></Text>
        </View>

        <View style={styles.divisor} />
        
        <View style={styles.linhaItem}>
          <Ionicons name="keypad-outline" size={20} color={statusPC.teclado ? '#333' : '#e65100'} />
          <Text style={styles.texto}> Teclado: {statusPC.teclado ? 'OK' : 'FALTA/DESCONECTADO'}</Text>
        </View>
        
        <View style={styles.linhaItem}>
          <Ionicons name="hardware-chip-outline" size={20} color={statusPC.mouse ? '#333' : '#e65100'} />
          <Text style={styles.texto}> Mouse: {statusPC.mouse ? 'OK' : 'FALTA/DESCONECTADO'}</Text>
        </View>
        
        <View style={styles.linhaItem}>
          <Ionicons name="tv-outline" size={20} color={statusPC.video ? '#333' : '#e65100'} />
          <Text style={styles.texto}> Monitor: {statusPC.video ? 'OK' : 'FALTA/DESCONECTADO'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', padding: 20 },
  titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '100%', elevation: 3 },
  cabecalhoCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
  nomePc: { fontSize: 18, fontWeight: 'bold', marginLeft: 10, color: '#333' },
  linhaItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  texto: { fontSize: 16, marginLeft: 10, color: '#444' },
  divisor: { height: 1, backgroundColor: '#eee', marginVertical: 12 }
});