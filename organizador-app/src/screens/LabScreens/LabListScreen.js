// src/screens/LabScreens/LabListScreen.js (ou o nome equivalente do seu arquivo)
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ref, onValue } from 'firebase/database';
import { db } from '../../config/firebaseConfig';

export default function LabListScreen({ route, navigation }) {
  const { ambienteData } = route.params || {};
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Escuta o ambiente em tempo real no Firebase
  useEffect(() => {
    if (!ambienteData?.id) {
      setLoading(false);
      return;
    }

    // Aponta direto para o nó do ambiente no banco
    const ambienteRef = ref(db, `ambientes/${ambienteData.id}`);

    const unsubscribe = onValue(ambienteRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        let listaLabs = [];

        // Varre todas as chaves do ambiente
        Object.keys(data).forEach((key) => {
          // IGNORA OS METADADOS DO AMBIENTE (nome, criadoPor, dataCriacao)
          if (key === 'nome' || key === 'criadoPor' || key === 'dataCriacao') {
            return; 
          }

          // Se a chave for "escola" (como na estrutura que você mostrou), entra nela
          if (key === 'escola' && typeof data[key] === 'object') {
            const escolaObj = data[key];
            Object.keys(escolaObj).forEach((salaKey) => {
              listaLabs.push({
                id: salaKey,
                nome: salaKey.charAt(0).toUpperCase() + salaKey.slice(1),
                pcs: escolaObj[salaKey]
              });
            });
          } else {
            // Caso o ESP32 jogue a sala diretamente na raiz do ambiente
            listaLabs.push({
              id: key,
              nome: key.charAt(0).toUpperCase() + key.slice(1),
              pcs: data[key]
            });
          }
        });

        setLabs(listaLabs);
      } else {
        setLabs([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [ambienteData]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#005b9f" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{ambienteData?.nome || "Ambiente"}</Text>
      </View>

      <Text style={styles.sectionTitle}>Salas e Laboratórios Disponíveis</Text>

      <FlatList
        data={labs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          // Conta quantos PCs existem na sala
          const totalPcs = item.pcs ? Object.keys(item.pcs).length : 0;

          return (
            <TouchableOpacity 
              style={styles.labCard} 
              onPress={() => navigation.navigate('LabDetail', { labId: item.id, ambienteId: ambienteData.id, labNome: item.nome })}
            >
              <View style={styles.cardIconContainer}>
                <MaterialCommunityIcons name="desktop-tower" size={26} color="#005b9f" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.labName}>{item.nome}</Text>
                <Text style={styles.labHint}>{totalPcs} PC(s) cadastrado(s)</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#ccc" />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhuma sala ou laboratório cadastrado neste ambiente ainda.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  customHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  backButton: { padding: 4, marginRight: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#555', margin: 16, marginBottom: 8 },
  listContainer: { padding: 16, paddingTop: 0 },
  labCard: { backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  cardIconContainer: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#e3f2fd', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardContent: { flex: 1 },
  labName: { fontSize: 17, fontWeight: 'bold', color: '#005b9f' },
  labHint: { fontSize: 13, color: '#666', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 40, fontSize: 15 }
});