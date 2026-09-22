// src/screens/LabListScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { View as MotiView } from "moti";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ref, onValue } from "firebase/database";
import { db } from "../../config/firebaseConfig";
import ZoomCard from "../../components/ZoomCard";

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
          if (key === "nome" || key === "criadoPor" || key === "dataCriacao") {
            return;
          }

          if (key === "escola" && typeof data[key] === "object") {
            const escolaObj = data[key];
            Object.keys(escolaObj).forEach((salaKey) => {
              listaLabs.push({
                id: salaKey,
                nome: salaKey.charAt(0).toUpperCase() + salaKey.slice(1),
                pcs: escolaObj[salaKey],
              });
            });
          } else {
            listaLabs.push({
              id: key,
              nome: key.charAt(0).toUpperCase() + key.slice(1),
              pcs: data[key],
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
      <SafeAreaView
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
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
        transition={{ type: "timing", duration: 400 }}
        style={styles.customHeader}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {ambienteData?.nome || "Ambiente"}
          </Text>
        </View>
      </MotiView>

      {/* 2. TÍTULO DA SEÇÃO */}
      <MotiView
        from={{ opacity: 0, translateX: -15 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: "timing", duration: 400, delay: 100 }}
      >
        <Text style={styles.sectionTitle}>
          Salas e Laboratórios Disponíveis
        </Text>
      </MotiView>

      {/* 3. LISTA COM COMPONENTE REUTILIZÁVEL */}

      <FlatList
        data={labs}
        keyExtractor={(item) => item.id}
        style={styles.flatList}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={true}
        renderItem={({ item, index }) => {
          const totalPcs = item.pcs ? Object.keys(item.pcs).length : 0;

          return (
            <MotiView
              from={{ opacity: 0, translateY: -15 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 700, delay: 100 }}
            >
              <ZoomCard
                index={index}
                hoverBackgroundColor="#f8fafd"
                onPress={() =>
                  navigation.navigate("LabDetail", {
                    labId: item.id,
                    ambienteId: ambienteData.id,
                    labNome: item.nome,
                  })
                }
                style={styles.labCard}
              >
                <View style={styles.cardIconContainer}>
                  <MaterialCommunityIcons
                    name="desktop-tower"
                    size={26}
                    color="#005b9f"
                  />
                </View>

                <View style={styles.cardContent}>
                  <Text style={styles.labName}>{item.nome}</Text>
                  <Text style={styles.labHint}>
                    {totalPcs} PC(s) cadastrado(s)
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#ccc" />
              </ZoomCard>
            </MotiView>
          );
        }}
        ListEmptyComponent={
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", duration: 400, delay: 200 }}
          >
            <Text style={styles.emptyText}>
              Nenhuma sala ou laboratório cadastrado neste ambiente ainda.
            </Text>
          </MotiView>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, height: "100%", backgroundColor: "#f4f6f9" },
  customHeader: {
    flex: 0.1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  backButton: { padding: 4, marginRight: 10 },
  headerTitleContainer: { flexDirection: "column" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
    margin: 16,
    marginBottom: 12,
  },

  flatList: { flex: 1 },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 80,
    flexGrow: 1,
  },

  labCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eaedf1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  cardContent: { flex: 1 },
  labName: { fontSize: 17, fontWeight: "bold", color: "#005b9f" },
  labHint: { fontSize: 13, color: "#666", marginTop: 2 },
  emptyText: {
    textAlign: "center",
    color: "#666",
    marginTop: 40,
    fontSize: 15,
  },
});
