// src/screens/LabListScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { View as MotiView } from 'moti';
import { MotiPressable } from 'moti/interactions';
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

    const ambienteRef = ref(db, `ambientes/${ambienteData.id}`);

    const unsubscribe = onValue(ambienteRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        let listaLabs = [];

        Object.keys(data).forEach((key) => {
          if (key === 'nome' || key === 'criadoPor' || key === 'dataCriacao') {
            return; 
          }

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

  const handleCopiarId = async (id, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    try {
      if (Platform.OS === 'web' && navigator?.clipboard) {
        await navigator.clipboard.writeText(id);
      } else {
        await Clipboard.setStringAsync(id);
      }
      if (Platform.OS === 'web') {
        window.alert(`ID copiado: ${id}`);
      } else {
        Alert.alert('Copiado!', `ID (${id}) copiado para a área de transferência.`);
      }
    } catch (error) {
      console.error("Erro ao copiar ID:", error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#005b9f" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. CABEÇALHO ANIMADO */}
      <MotiView
        from={{ opacity: 0, translateY: -15 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400 }}
        style={styles.customHeader}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{ambienteData?.nome || "Ambiente"}</Text>
          {ambienteData?.id && (
            <TouchableOpacity 
              style={styles.headerIdContainer} 
              onPress={(e) => handleCopiarId(ambienteData.id, e)}
              activeOpacity={0.7}
            >
              <Text style={styles.headerIdText}>ID: {ambienteData.id}</Text>
              <Ionicons name="copy-outline" size={12} color="#005b9f" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          )}
        </View>
      </MotiView>

      {/* 2. TÍTULO DA SEÇÃO */}
      <MotiView
        from={{ opacity: 0, translateX: -15 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 100 }}
      >
        <Text style={styles.sectionTitle}>Salas e Laboratórios Disponíveis</Text>
      </MotiView>

      {/* 3. LISTA COM ROLAGEM DESTRAVADA */}
      <FlatList
        data={labs}
        keyExtractor={(item) => item.id}
        style={styles.flatList}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={true}
        renderItem={({ item, index }) => {
          const totalPcs = item.pcs ? Object.keys(item.pcs).length : 0;

          return (
            <MotiPressable
              onPress={() => navigation.navigate('LabDetail', { labId: item.id, ambienteId: ambienteData.id, labNome: item.nome })}
              from={{ opacity: 0, translateY: 15 }}
              animate={({ hovered, pressed }) => {
                'worklet';
                return {
                  opacity: 1,
                  translateY: 0,
                  scale: pressed ? 0.98 : hovered ? 1.015 : 1,
                  backgroundColor: hovered ? '#f8fafd' : '#ffffff',
                };
              }}
              transition={({ hovered, pressed }) => {
                'worklet';
                if (hovered || pressed) {
                  return { type: 'timing', duration: 150 };
                }
                return { type: 'timing', duration: 300, delay: index * 50 };
              }}
              style={styles.labCard}
            >
              <View style={styles.cardIconContainer}>
                <MaterialCommunityIcons name="desktop-tower" size={26} color="#005b9f" />
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.labName}>{item.nome}</Text>

                {/* ID do Laboratório / Sala com ação de cópia */}
                <TouchableOpacity 
                  style={styles.idContainer} 
                  onPress={(e) => handleCopiarId(item.id, e)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.labIdText}>ID: {item.id}</Text>
                  <Ionicons name="copy-outline" size={14} color="#005b9f" style={{ marginLeft: 4 }} />
                </TouchableOpacity>

                <Text style={styles.labHint}>{totalPcs} PC(s) cadastrado(s)</Text>
              </View>

              <Ionicons name="chevron-forward" size={22} color="#ccc" />
            </MotiPressable>
          );
        }}
        ListEmptyComponent={
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 400, delay: 200 }}
          >
            <Text style={styles.emptyText}>Nenhuma sala ou laboratório cadastrado neste ambiente ainda.</Text>
          </MotiView>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, height: '100%', backgroundColor: '#f4f6f9' },
  customHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderColor: '#eee' 
  },
  backButton: { padding: 4, marginRight: 10 },
  headerTitleContainer: { flexDirection: 'column' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef6fc',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
    alignSelf: 'flex-start'
  },
  headerIdText: { fontSize: 11, color: '#005b9f', fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#555', margin: 16, marginBottom: 12 },
  
  flatList: { flex: 1 },
  listContainer: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 80, flexGrow: 1 },
  
  labCard: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1,
    borderColor: '#eaedf1',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 6,
    elevation: 2 
  },
  cardIconContainer: { 
    width: 44, 
    height: 44, 
    borderRadius: 8, 
    backgroundColor: '#e3f2fd', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },
  cardContent: { flex: 1 },
  labName: { fontSize: 17, fontWeight: 'bold', color: '#005b9f' },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#eef6fc',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    marginBottom: 2
  },
  labIdText: { fontSize: 12, color: '#005b9f', fontWeight: '600' },
  labHint: { fontSize: 13, color: '#666', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 40, fontSize: 15 }
});