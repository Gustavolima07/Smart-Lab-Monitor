// src/screens/HomeScreen.js
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { ref, get } from "firebase/database";
import { db } from "../config/firebaseConfig";
import LabCard from "../components/LabCard";

export default function HomeScreen({ navigation }) {
  const [laboratorios, setLaboratorios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLaboratorios = async () => {
      try {
        // Aponta para o nó 'escola' conforme o seu banco de dados
        const escolaRef = ref(db, "escola");
        const snapshot = await get(escolaRef);

        if (snapshot.exists()) {
          const data = snapshot.val();

          // Varre os laboratórios dentro de 'escola' (ex: 'lab6')
          const listaLabs = Object.keys(data).map((key) => {
            const labData = data[key];
            // Conta quantos computadores existem dentro deste laboratório
            const totalPcs = labData ? Object.keys(labData).length : 0;

            // Formata o nome para ficar bonito na tela (ex: 'lab6' vira 'Laboratório 6')
            const nomeFormatado = key.replace("lab", "Laboratório ");

            return {
              id: key,
              name:
                nomeFormatado.charAt(0).toUpperCase() + nomeFormatado.slice(1),
              icon:
                key === "sala-maker" ? "construct-outline" : "desktop-outline",
              pcs: totalPcs,
            };
          });

          setLaboratorios(listaLabs);
        } else {
          setLaboratorios([]);
        }
      } catch (error) {
        console.error("Erro ao buscar dados do Firebase:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLaboratorios();
  }, []);

  const handleSelectLab = (labId) => {
    // Certifique-se de que está passando um objeto com a chave 'labId'
    navigation.navigate("LabDetail", { labId: labId });
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#005b9f" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Selecione um Ambiente</Text>

      <FlatList
        data={laboratorios}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <LabCard
            title={item.name}
            icon={item.icon}
            pcCount={item.pcs}
            onPress={() => handleSelectLab(item.id)} // Passa o ID exato (ex: 'lab6') para a próxima tela
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginHorizontal: 16,
    marginVertical: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
});
