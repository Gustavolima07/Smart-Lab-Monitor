// src/screens/ChatScreens/ChatScreen.js
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  Modal,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ref, onValue } from 'firebase/database';
import { db } from '../../config/firebaseConfig';

export default function ChatScreen({ navigation }) {
  const [mensagem, setMensagem] = useState('');
  const [listaMensagens, setListaMensagens] = useState([
    { id: '1', texto: 'Olá! Sistema de monitoramento online.', remetente: 'sistema', horario: '14:00', anexo: null },
    { id: '2', texto: 'Algum laboratório com falha relatada hoje?', remetente: 'usuario', horario: '14:05', anexo: null },
  ]);

  const [pcsComProblema, setPcsComProblema] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [pcAnexado, setPcAnexado] = useState(null);

  // Busca em tempo real todos os PCs com problemas em todos os laboratórios no Firebase
  useEffect(() => {
    const escolaRef = ref(db, 'escola');

    const unsubscribe = onValue(escolaRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        let problemasEncontrados = [];

        Object.keys(data).forEach((labKey) => {
          const labData = data[labKey];
          if (labData) {
            Object.keys(labData).forEach((pcKey) => {
              const pc = labData[pcKey];
              const temErro = !pc.ligado || !pc.rede_ativa || !pc.teclado || !pc.mouse || !pc.video;

              if (temErro) {
                const nomeLabFormatado = labKey.replace('lab', 'Laboratório ');
                problemasEncontrados.push({
                  id: `${labKey}-${pcKey}`,
                  labId: labKey,
                  labNome: nomeLabFormatado.charAt(0).toUpperCase() + nomeLabFormatado.slice(1),
                  pcNome: pcKey.toUpperCase(),
                  detalhes: `Energia: ${pc.ligado ? 'OK' : 'Falha'} | Rede: ${pc.rede_ativa ? 'OK' : 'Sem Internet'}`,
                });
              }
            });
          }
        });

        setPcsComProblema(problemasEncontrados);
      } else {
        setPcsComProblema([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const enviarMensagem = () => {
    if (mensagem.trim() === '' && !pcAnexado) return;

    const novaMensagem = {
      id: Date.now().toString(),
      texto: mensagem,
      remetente: 'usuario',
      horario: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      anexo: pcAnexado,
    };

    setListaMensagens([...listaMensagens, novaMensagem]);
    setMensagem('');
    setPcAnexado(null); // Limpa o anexo após enviar
  };

  const selecionarAnexo = (pc) => {
    setPcAnexado(pc);
    setModalVisible(false);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={listaMensagens}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatList}
        renderItem={({ item }) => {
          const isUser = item.remetente === 'usuario';
          return (
            <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.otherBubble]}>
              {item.texto ? (
                <Text style={[styles.messageText, isUser ? styles.userText : styles.otherText]}>
                  {item.texto}
                </Text>
              ) : null}

              {/* Renderiza o card anexado na mensagem, se houver */}
              {item.anexo && (
                <TouchableOpacity 
                  style={styles.attachmentCard}
                  onPress={() => navigation.navigate('MainApp', { screen: 'LabDetail', params: { labId: item.anexo.labId } })}
                >
                  <Ionicons name="warning" size={18} color="#c62828" />
                  <View style={styles.attachmentInfo}>
                    <Text style={styles.attachmentTitle}>{item.anexo.pcNome} - {item.anexo.labNome}</Text>
                    <Text style={styles.attachmentSubtitle}>Clique para ver o laboratório</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#666" />
                </TouchableOpacity>
              )}

              <Text style={[styles.timeText, isUser ? styles.userTime : styles.otherTime]}>
                {item.horario}
              </Text>
            </View>
          );
        }}
      />

      {/* Pré-visualização do anexo selecionado antes de enviar */}
      {pcAnexado && (
        <View style={styles.previewContainer}>
          <Ionicons name="warning" size={18} color="#c62828" />
          <Text style={styles.previewText}>Anexado: {pcAnexado.pcNome} ({pcAnexado.labNome})</Text>
          <TouchableOpacity onPress={() => setPcAnexado(null)}>
            <Ionicons name="close-circle" size={20} color="#c62828" />
          </TouchableOpacity>
        </View>
      )}

      {/* Barra de Digitação */}
      <View style={styles.inputContainer}>
        {/* Botão de anexar computador com problema (só aparece se houver PCs com falha) */}
        {pcsComProblema.length > 0 && (
          <TouchableOpacity 
            style={styles.attachButton} 
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="alert-circle-outline" size={24} color="#c62828" />
            <View style={styles.redDot} />
          </TouchableOpacity>
        )}

        <TextInput
          style={styles.input}
          placeholder="Digite sua mensagem..."
          placeholderTextColor="#999"
          value={mensagem}
          onChangeText={setMensagem}
        />

        <TouchableOpacity style={styles.sendButton} onPress={enviarMensagem}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Modal para escolher qual PC com problema anexar */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione o PC com Alerta</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {pcsComProblema.map((pc) => (
                <TouchableOpacity 
                  key={pc.id} 
                  style={styles.modalItem}
                  onPress={() => selecionarAnexo(pc)}
                >
                  <Ionicons name="desktop" size={20} color="#c62828" />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.modalItemTitle}>{pc.pcNome} - {pc.labNome}</Text>
                    <Text style={styles.modalItemSubtitle}>{pc.detalhes}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color="#005b9f" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  chatList: { padding: 16 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 12, marginBottom: 10, elevation: 1 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#005b9f', borderBottomRightRadius: 2 },
  otherBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#e0e0e0' },
  messageText: { fontSize: 15, color: '#333' },
  userText: { color: '#fff' },
  otherText: { color: '#333' },
  timeText: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  userTime: { color: 'rgba(255, 255, 255, 0.7)' },
  otherTime: { color: '#999' },
  
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ef9a9a',
  },
  attachmentInfo: { flex: 1, marginHorizontal: 8 },
  attachmentTitle: { fontSize: 13, fontWeight: 'bold', color: '#c62828' },
  attachmentSubtitle: { fontSize: 11, color: '#666' },

  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
  },
  previewText: { flex: 1, fontSize: 13, color: '#c62828', fontWeight: 'bold', marginLeft: 8 },

  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e0e0e0' },
  attachButton: { position: 'relative', marginRight: 10, padding: 4 },
  redDot: { position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#c62828' },
  input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 16, height: 45, fontSize: 15, color: '#333' },
  sendButton: { backgroundColor: '#005b9f', justifyContent: 'center', alignItems: 'center', height: 42, width: 42, borderRadius: 21, marginLeft: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalScroll: { paddingBottom: 20 },
  modalItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  modalItemTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  modalItemSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
});