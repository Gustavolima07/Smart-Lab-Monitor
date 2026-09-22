import React, { useState, useEffect, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  SectionList,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../auth/AuthContext";
import { ref, onValue } from "firebase/database";
import { db } from "../../config/firebaseConfig";

import ZoomCard from "../../components/ZoomCard";

export default function ConversasScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [usuariosRaw, setUsuariosRaw] = useState({});
  const [chatsRaw, setChatsRaw] = useState({});
  const [ambientesRaw, setAmbientesRaw] = useState({});
  const [loading, setLoading] = useState(true);

  // Estados para agrupamento e busca
  const [secoesContatos, setSecoesContatos] = useState([]);
  const [searchText, setSearchText] = useState("");

  const gerarChatId = (uid1, uid2) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  };

  // 1. Ouvinte para os Usuários
  useEffect(() => {
    const usuariosRef = ref(db, "usuarios");
    const unsubscribe = onValue(usuariosRef, (snapshot) => {
      if (snapshot.exists()) setUsuariosRaw(snapshot.val());
    });
    return () => unsubscribe();
  }, []);

  // 2. Ouvinte para os Chats
  useEffect(() => {
    const chatsRef = ref(db, "chats");
    const unsubscribe = onValue(chatsRef, (snapshot) => {
      if (snapshot.exists()) setChatsRaw(snapshot.val());
    });
    return () => unsubscribe();
  }, []);

  // 3. Ouvinte para os Ambientes
  useEffect(() => {
    const ambientesRef = ref(db, "ambientes");
    const unsubscribe = onValue(ambientesRef, (snapshot) => {
      if (snapshot.exists()) setAmbientesRaw(snapshot.val());
    });
    return () => unsubscribe();
  }, []);

  // 4. Monta e agrupa as conversas por Ambiente
  useEffect(() => {
    if (!user || !usuariosRaw[user.uid]) {
      setLoading(false);
      return;
    }

    const meusDados = usuariosRaw[user.uid];
    const meusAmbientesKeys = meusDados?.ambientesPermitidos
      ? Object.keys(meusDados.ambientesPermitidos)
      : [];

    // Estrutura em Seções por Ambiente
    const secoes = meusAmbientesKeys
      .map((ambId) => {
        const ambData = ambientesRaw[ambId];
        const nomeAmbiente =
          ambData?.nome || ambData?.nomeAmbiente || ambData?.titulo || ambId;

        const contatosDoAmbiente = [];

        Object.keys(usuariosRaw).forEach((uid) => {
          if (uid === user.uid) return;

          const uData = usuariosRaw[uid];

          // Verifica se este usuário possui permissão neste ambiente específico
          if (uData.ambientesPermitidos && uData.ambientesPermitidos[ambId]) {
            const chatId = gerarChatId(user.uid, uid);
            const meta = chatsRaw[chatId]?.metadata;

            contatosDoAmbiente.push({
              id: `${ambId}_${uid}`,
              uid: uid,
              chatId: chatId,
              nome: uData.nome || uData.displayName || "Usuário",
              email: uData.email,
              photoURL: uData.photoURL || uData.foto || null,
              ultimaMensagem: meta?.ultimaMensagem || uData.email || "",
              horario: meta?.horario || "",
              naoLidas: meta?.naoLidas?.[user.uid] || 0,
              timestamp: meta?.timestamp || 0,
            });
          }
        });

        // Ordena as conversas pela mensagem mais recente dentro do ambiente
        contatosDoAmbiente.sort((a, b) => b.timestamp - a.timestamp);

        return {
          id: ambId,
          title: nomeAmbiente,
          data: contatosDoAmbiente,
        };
      })
      .filter((section) => section.data.length > 0); // Remove ambientes vazios (sem outros membros)

    setSecoesContatos(secoes);
    setLoading(false);
  }, [user, usuariosRaw, chatsRaw, ambientesRaw]);

  // Filtragem com base na barra de pesquisa
  const secoesFiltradas = secoesContatos
    .map((section) => {
      const query = searchText.toLowerCase().trim();
      if (!query) return section;

      const contatosFiltrados = section.data.filter((item) => {
        const nomeMatch = item.nome.toLowerCase().includes(query);
        const emailMatch =
          item.email && item.email.toLowerCase().includes(query);
        const msgMatch =
          item.ultimaMensagem &&
          item.ultimaMensagem.toLowerCase().includes(query);
        return nomeMatch || emailMatch || msgMatch;
      });

      return { ...section, data: contatosFiltrados };
    })
    .filter((section) => section.data.length > 0);

  const abrirChat = (contato) => {
    navigation.navigate("Chat", { contato, chatId: contato.chatId });
  };

  const renderAvatar = (url) => {
    if (
      url &&
      typeof url === "string" &&
      (url.startsWith("http") || url.startsWith("data:image"))
    ) {
      return <Image source={{ uri: url }} style={styles.avatarImage} />;
    }
    return <Ionicons name="person-circle-outline" size={48} color="#005b9f" />;
  };

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
      {/* BARRA DE PESQUISA */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color="#888"
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar conversas..."
          placeholderTextColor="#888"
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* LISTA DIVIDIDA POR AMBIENTES */}
        <SectionList
          sections={secoesFiltradas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Ionicons
                name="business"
                size={16}
                color="#005b9f"
                style={{ marginRight: 6 }}
                />
              <Text style={styles.sectionHeaderText}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <ZoomCard>
            <TouchableOpacity
            style={styles.chatCard}
              onPress={() => abrirChat(item)}
            >
              <View style={styles.avatarContainer}>
                {renderAvatar(item.photoURL)}
              </View>
              <View style={styles.infoContainer}>
                <View style={styles.topRow}>
                  <Text style={styles.chatName}>{item.nome}</Text>
                  <Text style={styles.chatTime}>{item.horario}</Text>
                </View>
                <View style={styles.bottomRow}>
                  <Text numberOfLines={1} style={styles.lastMessage}>
                    {item.ultimaMensagem}
                  </Text>
                  {item.naoLidas > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.naoLidas}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
              </ZoomCard>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searchText
                ? "Nenhuma conversa encontrada."
                : "Nenhum colega encontrado nos seus ambientes."}
            </Text>
          }
        />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },

  // Barra de Pesquisa
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },

  listContainer: { padding: 16 },

  // Cabeçalho dos Ambientes
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#005b9f",
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#005b9f",
  },

  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    elevation: 1,
  },
  avatarContainer: {
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%", borderRadius: 24 },
  infoContainer: { flex: 1 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  chatName: { fontSize: 16, fontWeight: "bold", color: "#333" },
  chatTime: { fontSize: 12, color: "#999" },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: { fontSize: 13, color: "#666", flex: 1, marginRight: 8 },
  badge: {
    backgroundColor: "#005b9f",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  emptyText: {
    textAlign: "center",
    color: "#666",
    marginTop: 40,
    fontSize: 15,
  },
});
