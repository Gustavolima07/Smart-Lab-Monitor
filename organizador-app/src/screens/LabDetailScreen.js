// src/screens/LabDetailScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ref, onValue } from 'firebase/database';
import { db } from '../config/firebaseConfig';

export default function LabDetailScreen({ route }) {
  const labId = route.params?.labId || 'lab6';
  
  const [computadores, setComputadores] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para controlar quais PCs estão expandidos
  const [expandedPcs, setExpandedPcs] = useState({});

  const nomeFormatado = typeof labId === 'string' ? labId.replace('lab', 'Laboratório ') : 'Laboratório';
  const tituloLab = nomeFormatado.charAt(0).toUpperCase() + nomeFormatado.slice(1);

  useEffect(() => {
    const labRef = ref(db, `escola/${labId}`);

    const unsubscribe = onValue(labRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        const listaPcs = Object.keys(data).map((pcKey) => {
          const pc = data[pcKey];
          const temErro = !pc.ligado || !pc.rede_ativa || !pc.teclado || !pc.mouse || !pc.video;
          
          return {
            id: pcKey,
            ...pc,
            temErro,
          };
        });

        setComputadores(listaPcs);
      } else {
        setComputadores([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Erro ao escutar dados do Firebase:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [labId]);

  const toggleExpand = (id) => {
    setExpandedPcs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#005b9f" />
      </View>
    );
  }

  const pcsComProblema = computadores.filter(pc => pc.temErro);
  const pcsNormais = computadores.filter(pc => !pc.temErro);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.tituloSecao}>Monitoramento - {tituloLab}</Text>

        {computadores.length === 0 ? (
          <Text style={styles.semPcs}>Nenhum computador cadastrado neste laboratório.</Text>
        ) : (
          <>
            {/* Seção de PCs com Erro */}
            {pcsComProblema.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="warning-outline" size={20} color="#c62828" style={{ marginRight: 6 }} />
                  <Text style={styles.sectionTitleError}>Computadores com Alerta ({pcsComProblema.length})</Text>
                </View>

                {pcsComProblema.map((pc) => {
                  const isOpen = expandedPcs[pc.id] ?? true; 

                  return (
                    <View key={pc.id} style={[styles.pcCard, styles.cardError]}>
                      <TouchableOpacity style={styles.pcHeader} onPress={() => toggleExpand(pc.id)}>
                        <View style={styles.headerLeft}>
                          <Ionicons name="desktop" size={22} color="#c62828" />
                          <Text style={styles.pcTitleError}>{pc.id.toUpperCase()} - {tituloLab}</Text>
                          <Ionicons name="alert-circle" size={20} color="#c62828" style={{ marginLeft: 6 }} />
                        </View>
                        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                      </TouchableOpacity>

                      {isOpen && (
                        <>
                          <View style={styles.divider} />
                          <View style={styles.statusRow}>
                            <Ionicons name="flash-outline" size={18} color={pc.ligado ? "#2e7d32" : "#c62828"} />
                            <Text style={styles.statusText}>
                              Energia: <Text style={pc.ligado ? styles.ligado : styles.desligado}>
                                {pc.ligado ? "LIGADO" : "DESLIGADO"}
                              </Text>
                            </Text>
                          </View>

                          <View style={styles.statusRow}>
                            <Ionicons name="globe-outline" size={18} color={pc.rede_ativa ? "#2e7d32" : "#c62828"} />
                            <Text style={styles.statusText}>
                              Rede: <Text style={pc.rede_ativa ? styles.ligado : styles.semInternet}>
                                {pc.rede_ativa ? "CONECTADO" : "SEM INTERNET"}
                              </Text>
                            </Text>
                          </View>

                          <View style={styles.divider} />

                          <View style={styles.perifericosRow}>
                            <View style={styles.perifericoItem}>
                              <Ionicons name="keypad-outline" size={16} color="#666" style={{ marginRight: 4 }} />
                              <Text style={styles.perifericoText}>Teclado: {pc.teclado ? "OK" : "FALHA"}</Text>
                            </View>
                            <View style={styles.perifericoItem}>
                              <Ionicons name="hardware-chip-outline" size={16} color="#666" style={{ marginRight: 4 }} />
                              <Text style={styles.perifericoText}>Mouse: {pc.mouse ? "OK" : "FALHA"}</Text>
                            </View>
                            <View style={styles.perifericoItem}>
                              <Ionicons name="tv-outline" size={16} color="#666" style={{ marginRight: 4 }} />
                              <Text style={styles.perifericoText}>Vídeo: {pc.video ? "OK" : "FALHA"}</Text>
                            </View>
                          </View>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Seção de PCs Normais */}
            {pcsNormais.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#2e7d32" style={{ marginRight: 6 }} />
                  <Text style={styles.sectionTitleNormal}>Computadores Operacionais ({pcsNormais.length})</Text>
                </View>

                {pcsNormais.map((pc) => {
                  const isOpen = expandedPcs[pc.id] || false; 

                  return (
                    <View key={pc.id} style={styles.pcCard}>
                      <TouchableOpacity style={styles.pcHeader} onPress={() => toggleExpand(pc.id)}>
                        <View style={styles.headerLeft}>
                          <Ionicons name="desktop" size={22} color="#005b9f" />
                          <Text style={styles.pcTitle}>{pc.id.toUpperCase()} - {tituloLab}</Text>
                        </View>
                        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                      </TouchableOpacity>

                      {isOpen && (
                        <>
                          <View style={styles.divider} />
                          <View style={styles.statusRow}>
                            <Ionicons name="flash-outline" size={18} color="#2e7d32" />
                            <Text style={styles.statusText}>
                              Energia: <Text style={styles.ligado}>LIGADO</Text>
                            </Text>
                          </View>

                          <View style={styles.statusRow}>
                            <Ionicons name="globe-outline" size={18} color="#2e7d32" />
                            <Text style={styles.statusText}>
                              Rede: <Text style={styles.ligado}>CONECTADO</Text>
                            </Text>
                          </View>

                          <View style={styles.divider} />

                          <View style={styles.perifericosRow}>
                            <View style={styles.perifericoItem}>
                              <Ionicons name="keypad-outline" size={16} color="#666" style={{ marginRight: 4 }} />
                              <Text style={styles.perifericoText}>Teclado: OK</Text>
                            </View>
                            <View style={styles.perifericoItem}>
                              <Ionicons name="hardware-chip-outline" size={16} color="#666" style={{ marginRight: 4 }} />
                              <Text style={styles.perifericoText}>Mouse: OK</Text>
                            </View>
                            <View style={styles.perifericoItem}>
                              <Ionicons name="tv-outline" size={16} color="#666" style={{ marginRight: 4 }} />
                              <Text style={styles.perifericoText}>Vídeo: OK</Text>
                            </View>
                          </View>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContainer: { padding: 16 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  tituloSecao: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 16, textAlign: 'center' },
  semPcs: { textAlign: 'center', color: '#666', marginTop: 40, fontSize: 16 },
  sectionContainer: { marginBottom: 20 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionTitleError: { fontSize: 16, fontWeight: 'bold', color: '#c62828' },
  sectionTitleNormal: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32' },
  pcCard: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e0e0e0', elevation: 2 },
  cardError: { borderColor: '#ef9a9a', backgroundColor: '#ffebee' },
  pcHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  pcTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginLeft: 8 },
  pcTitleError: { fontSize: 16, fontWeight: 'bold', color: '#c62828', marginLeft: 8 },
  divider: { height: 1, backgroundColor: '#ddd', marginVertical: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statusText: { fontSize: 14, color: '#555', marginLeft: 6 },
  ligado: { color: '#2e7d32', fontWeight: 'bold' },
  desligado: { color: '#c62828', fontWeight: 'bold' },
  semInternet: { color: '#c62828', fontWeight: 'bold' },
  perifericosRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  perifericoItem: { flexDirection: 'row', alignItems: 'center' },
  perifericoText: { fontSize: 13, color: '#666' },
});