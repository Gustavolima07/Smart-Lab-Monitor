// src/screens/LabDetailScreen.js
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ref, onValue } from "firebase/database";
import { db } from "../../config/firebaseConfig";

export default function LabDetailScreen({ navigation, route }) {
  const { labId, labData, ambienteId } = route.params || {};

  const [computadores, setComputadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPcs, setExpandedPcs] = useState({});

  const nomeLab = labData?.nome || labId?.toUpperCase() || "Laboratório";

  useEffect(() => {
    // Busca primeiro o ambiente completo para checar a estrutura
    const ambienteRef = ref(db, `ambientes/${ambienteId}`);

    const unsubscribe = onValue(
      ambienteRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const ambienteData = snapshot.val();

          // Verifica se os laboratórios estão dentro de 'escola' ou direto no ambiente
          const dadosLab = ambienteData.escola?.[labId] || ambienteData[labId];

          if (dadosLab) {
            const listaPcs = Object.keys(dadosLab)
              .filter((key) => key !== "nome")
              .map((pcKey) => {
                const pc = dadosLab[pcKey];
                const ligado = pc.ligado ?? false;
                const rede_ativa = pc.rede_ativa ?? false;
                const teclado = pc.teclado ?? false;
                const mouse = pc.mouse ?? false;
                const video = pc.video ?? false;

                const temErro =
                  !ligado || !rede_ativa || !teclado || !mouse || !video;

                return {
                  id: pcKey,
                  ...pc,
                  ligado,
                  rede_ativa,
                  teclado,
                  mouse,
                  video,
                  temErro,
                };
              });

            setComputadores(listaPcs);
          } else {
            setComputadores([]);
          }
        } else {
          setComputadores([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao buscar dados do Firebase:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [labId, ambienteId]);

  const toggleExpand = (id) => {
    setExpandedPcs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#005b9f" />
      </View>
    );
  }

  const pcsComProblema = computadores.filter((pc) => pc.temErro);
  const pcsNormais = computadores.filter((pc) => !pc.temErro);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.customHeader}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Monitoramento - LAB</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.tituloSecao}>Monitoramento - {nomeLab}</Text>

        {computadores.length === 0 ? (
          <Text style={styles.semPcs}>
            Nenhum computador cadastrado neste laboratório.
          </Text>
        ) : (
          <>
            {pcsComProblema.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons
                    name="warning-outline"
                    size={20}
                    color="#c62828"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.sectionTitleError}>
                    Computadores com Alerta ({pcsComProblema.length})
                  </Text>
                </View>

                {pcsComProblema.map((pc) => {
                  const isOpen = expandedPcs[pc.id] ?? true;

                  return (
                    <View key={pc.id} style={[styles.pcCard, styles.cardError]}>
                      <TouchableOpacity
                        style={styles.pcHeader}
                        onPress={() => toggleExpand(pc.id)}
                      >
                        <View style={styles.headerLeft}>
                          <Ionicons name="desktop" size={22} color="#c62828" />
                          <Text style={styles.pcTitleError}>
                            {pc.id.toUpperCase()}
                          </Text>
                          <Ionicons
                            name="alert-circle"
                            size={20}
                            color="#c62828"
                            style={{ marginLeft: 6 }}
                          />
                        </View>
                        <Ionicons
                          name={isOpen ? "chevron-up" : "chevron-down"}
                          size={20}
                          color="#666"
                        />
                      </TouchableOpacity>

                      {isOpen && (
                        <>
                          <View style={styles.divider} />
                          <View style={styles.statusRow}>
                            <Ionicons
                              name="flash-outline"
                              size={18}
                              color={pc.ligado ? "#2e7d32" : "#c62828"}
                            />
                            <Text style={styles.statusText}>
                              Energia:{" "}
                              <Text
                                style={
                                  pc.ligado ? styles.ligado : styles.desligado
                                }
                              >
                                {pc.ligado ? "LIGADO" : "DESLIGADO"}
                              </Text>
                            </Text>
                          </View>

                          <View style={styles.statusRow}>
                            <Ionicons
                              name="globe-outline"
                              size={18}
                              color={pc.rede_ativa ? "#2e7d32" : "#c62828"}
                            />
                            <Text style={styles.statusText}>
                              Rede:{" "}
                              <Text
                                style={
                                  pc.rede_ativa
                                    ? styles.ligado
                                    : styles.semInternet
                                }
                              >
                                {pc.rede_ativa ? "CONECTADO" : "SEM INTERNET"}
                              </Text>
                            </Text>
                          </View>

                          <View style={styles.divider} />

                          <View style={styles.perifericosRow}>
                            <View style={styles.perifericoItem}>
                              <Text style={styles.perifericoText}>
                                Teclado: {pc.teclado ? "OK" : "FALHA"}
                              </Text>
                            </View>
                            <View style={styles.perifericoItem}>
                              <Text style={styles.perifericoText}>
                                Mouse: {pc.mouse ? "OK" : "FALHA"}
                              </Text>
                            </View>
                            <View style={styles.perifericoItem}>
                              <Text style={styles.perifericoText}>
                                Vídeo: {pc.video ? "OK" : "FALHA"}
                              </Text>
                            </View>
                          </View>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {pcsNormais.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#2e7d32"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.sectionTitleNormal}>
                    Computadores Operacionais ({pcsNormais.length})
                  </Text>
                </View>

                {pcsNormais.map((pc) => {
                  const isOpen = expandedPcs[pc.id] || false;

                  return (
                    <View key={pc.id} style={styles.pcCard}>
                      <TouchableOpacity
                        style={styles.pcHeader}
                        onPress={() => toggleExpand(pc.id)}
                      >
                        <View style={styles.headerLeft}>
                          <Ionicons name="desktop" size={22} color="#005b9f" />
                          <Text style={styles.pcTitle}>
                            {pc.id.toUpperCase()}
                          </Text>
                        </View>
                        <Ionicons
                          name={isOpen ? "chevron-up" : "chevron-down"}
                          size={20}
                          color="#666"
                        />
                      </TouchableOpacity>

                      {isOpen && (
                        <>
                          <View style={styles.divider} />
                          <View style={styles.statusRow}>
                            <Ionicons
                              name="flash-outline"
                              size={18}
                              color="#2e7d32"
                            />
                            <Text style={styles.statusText}>
                              Energia: <Text style={styles.ligado}>LIGADO</Text>
                            </Text>
                          </View>

                          <View style={styles.statusRow}>
                            <Ionicons
                              name="globe-outline"
                              size={18}
                              color="#2e7d32"
                            />
                            <Text style={styles.statusText}>
                              Rede: <Text style={styles.ligado}>CONECTADO</Text>
                            </Text>
                          </View>

                          <View style={styles.divider} />

                          <View style={styles.perifericosRow}>
                            <View style={styles.perifericoItem}>
                              <Text style={styles.perifericoText}>
                                Teclado: OK
                              </Text>
                            </View>
                            <View style={styles.perifericoItem}>
                              <Text style={styles.perifericoText}>
                                Mouse: OK
                              </Text>
                            </View>
                            <View style={styles.perifericoItem}>
                              <Text style={styles.perifericoText}>
                                Vídeo: OK
                              </Text>
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
  ccontainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  backButton: {
    padding: 4,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContainer: { padding: 16 },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  tituloSecao: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  backButton: { marginRight: 15, paddingVertical: 5 },
  backButtonText: { fontSize: 16, color: "#005b9f", fontWeight: "bold" },
  semPcs: { textAlign: "center", color: "#666", marginTop: 40, fontSize: 16 },
  sectionContainer: { marginBottom: 20 },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitleError: { fontSize: 16, fontWeight: "bold", color: "#c62828" },
  sectionTitleNormal: { fontSize: 16, fontWeight: "bold", color: "#2e7d32" },
  pcCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    elevation: 2,
  },
  cardError: { borderColor: "#ef9a9a", backgroundColor: "#ffebee" },
  pcHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  pcTitle: { fontSize: 16, fontWeight: "bold", color: "#333", marginLeft: 8 },
  pcTitleError: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#c62828",
    marginLeft: 8,
  },
  divider: { height: 1, backgroundColor: "#ddd", marginVertical: 10 },
  statusRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  statusText: { fontSize: 14, color: "#555", marginLeft: 6 },
  ligado: { color: "#2e7d32", fontWeight: "bold" },
  desligado: { color: "#c62828", fontWeight: "bold" },
  semInternet: { color: "#c62828", fontWeight: "bold" },
  perifericosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  perifericoItem: { flexDirection: "row", alignItems: "center" },
  perifericoText: { fontSize: 13, color: "#666" },
});
