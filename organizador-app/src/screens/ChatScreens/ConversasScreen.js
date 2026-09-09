import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../auth/AuthContext';
import { ref, onValue, get } from 'firebase/database';
import { db } from '../../config/firebaseConfig';

export default function ConversasScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [contatos, setContatos] = useState([]);
  const [usuariosRaw, setUsuariosRaw] = useState({});
  const [chatsRaw, setChatsRaw] = useState({});
  const [loading, setLoading] = useState(true);

  const gerarChatId = (uid1, uid2) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  };

useEffect(() => {
    const usuariosRef = ref(db, 'usuarios');
    const unsubscribe = onValue(usuariosRef, (snapshot) => {
      if (snapshot.exists()) setUsuariosRaw(snapshot.val());
    });
    return () => unsubscribe();
  }, []);

  // 2. Ouvinte contínuo para os CHATS (Isso resolve o atraso!)
  useEffect(() => {
    const chatsRef = ref(db, 'chats');
    const unsubscribe = onValue(chatsRef, (snapshot) => {
      if (snapshot.exists()) setChatsRaw(snapshot.val());
    });
    return () => unsubscribe();
  }, []);

  // 3. Junta os dois dados em tempo real sempre que um deles mudar
  useEffect(() => {
    if (!user || !usuariosRaw[user.uid]) {
      setLoading(false);
      return;
    }

    const meusDados = usuariosRaw[user.uid];
    const meusAmbientes = meusDados?.ambientesPermitidos ? Object.keys(meusDados.ambientesPermitidos) : [];
    const listaContatos = [];

    Object.keys(usuariosRaw).forEach((uid) => {
      if (uid === user.uid) return;

      const uData = usuariosRaw[uid];
      const ambientesDele = uData.ambientesPermitidos ? Object.keys(uData.ambientesPermitidos) : [];
      const compartilhaAmbiente = meusAmbientes.some(ambId => ambientesDele.includes(ambId));

      if (compartilhaAmbiente) {
        const chatId = gerarChatId(user.uid, uid);
        const meta = chatsRaw[chatId]?.metadata; // Puxa os dados atualizados do chat

        listaContatos.push({
          id: uid,
          chatId: chatId,
          nome: uData.nome || uData.displayName || 'Usuário',
          email: uData.email,
          photoURL: uData.photoURL || uData.foto || null,
          ultimaMensagem: meta?.ultimaMensagem || uData.email,
          horario: meta?.horario || '',
          naoLidas: meta?.naoLidas?.[user.uid] || 0,
          timestamp: meta?.timestamp || 0
        });
      }
    });

    listaContatos.sort((a, b) => b.timestamp - a.timestamp);
    setContatos(listaContatos);
    setLoading(false);
  }, [user, usuariosRaw, chatsRaw]);

  const abrirChat = (contato) => {
    navigation.navigate('Chat', { contato, chatId: contato.chatId });
  };

  const renderAvatar = (url) => {
    if (url && typeof url === 'string' && (url.startsWith('http') || url.startsWith('data:image'))) {
      return <Image source={{ uri: url }} style={styles.avatarImage} />;
    }
    return <Ionicons name="person-circle-outline" size={48} color="#005b9f" />;
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
      <FlatList
        data={contatos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatCard} onPress={() => abrirChat(item)}>
            <View style={styles.avatarContainer}>{renderAvatar(item.photoURL)}</View>
            <View style={styles.infoContainer}>
              <View style={styles.topRow}>
                <Text style={styles.chatName}>{item.nome}</Text>
                <Text style={styles.chatTime}>{item.horario}</Text>
              </View>
              <View style={styles.bottomRow}>
                <Text numberOfLines={1} style={styles.lastMessage}>{item.ultimaMensagem}</Text>
                {item.naoLidas > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.naoLidas}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhum colega encontrado nos seus ambientes.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  listContainer: { padding: 16 },
  chatCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0', elevation: 1 },
  avatarContainer: { marginRight: 12, justifyContent: 'center', alignItems: 'center', width: 48, height: 48, borderRadius: 24, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 24 },
  infoContainer: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  chatTime: { fontSize: 12, color: '#999' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 13, color: '#666', flex: 1, marginRight: 8 },
  badge: { backgroundColor: '#005b9f', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 40, fontSize: 15 },
});