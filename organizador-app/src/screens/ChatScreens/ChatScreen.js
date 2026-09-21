import React, { useState, useEffect, useContext } from "react";
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
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ref, onValue, push, set, get, remove } from "firebase/database";
import { db } from "../../config/firebaseConfig";
import { AuthContext } from "../../auth/AuthContext";

export default function ChatScreen({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const { contato, chatId } = route.params || {};
  const insets = useSafeAreaInsets();

  const [mensagem, setMensagem] = useState("");
  const [listaMensagens, setListaMensagens] = useState([]);
  const [pcsComProblema, setPcsComProblema] = useState([]);
  const [ambientesData, setAmbientesData] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [pcAnexado, setPcAnexado] = useState(null);

  const flatListRef = React.useRef(null);

  // 1. OUVINTE DE MENSAGENS EM TEMPO REAL
  useEffect(() => {
    if (!chatId || !user) return;
    const chatRef = ref(db, `chats/${chatId}/mensagens`);
    
    const unsubscribe = onValue(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const mensagensFormatadas = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => a.timestamp - b.timestamp);
        
        setListaMensagens(mensagensFormatadas);
        set(ref(db, `chats/${chatId}/metadata/naoLidas/${user.uid}`), 0);
      } else {
        setListaMensagens([]);
      }
    });
    return () => unsubscribe();
  }, [chatId, user]);

  // 2. OUVINTE DE AMBIENTES E PCS COM FALHA
  useEffect(() => {
    if (!user) return;
    
    let unsubscribeAmbientes = () => {};

    const userRef = ref(db, `usuarios/${user.uid}/ambientesPermitidos`);
    const unsubscribeUser = onValue(userRef, (userSnap) => {
      if (userSnap.exists()) {
        const permitidos = Object.keys(userSnap.val());
        unsubscribeAmbientes(); 
        
        const ambientesRef = ref(db, 'ambientes');
        unsubscribeAmbientes = onValue(ambientesRef, (ambSnap) => {
          if (ambSnap.exists()) {
            const data = ambSnap.val();
            setAmbientesData(data); // Guarda cópia para verificação em tempo real
            let problemasEncontrados = [];

            permitidos.forEach(ambienteId => {
              if (data[ambienteId] && data[ambienteId].escola) {
                const escolaData = data[ambienteId].escola;
                
                Object.keys(escolaData).forEach(labKey => {
                  const labData = escolaData[labKey];
                  if (labData) {
                    Object.keys(labData).forEach((pcKey) => {
                      const pc = labData[pcKey];
                      const temErro = pc.ligado === false || pc.rede_ativa === false || pc.teclado === false || pc.mouse === false || pc.video === false;
                      
                      if (temErro) {
                        problemasEncontrados.push({
                          id: `${ambienteId}-${labKey}-${pcKey}`,
                          ambienteId: ambienteId,
                          labId: labKey,
                          labNome: labKey,
                          pcNome: pcKey.toUpperCase(),
                          pcKey: pcKey,
                          detalhes: `Energia: ${pc.ligado ? "OK" : "Falha"} | Rede: ${pc.rede_ativa ? "OK" : "S/ Internet"}`,
                        });
                      }
                    });
                  }
                });
              }
            });
            setPcsComProblema(problemasEncontrados);
          } else {
            setAmbientesData({});
            setPcsComProblema([]);
          }
        });
      } else {
        setPcsComProblema([]);
      }
    });

    return () => {
      unsubscribeUser();
      unsubscribeAmbientes();
    };
  }, [user]);

  // VERIFICA SE O PC ANEXADO TEVE O PROBLEMA RESOLVIDO
  const isPcResolvido = (anexo) => {
    if (!anexo) return true;
    const amb = ambientesData[anexo.ambienteId];
    if (!amb || !amb.escola) return true;
    const lab = amb.escola[anexo.labId];
    if (!lab) return true;

    const key = anexo.pcKey || anexo.pcNome?.toLowerCase();
    const pc = lab[key] || lab[anexo.pcNome];
    if (!pc) return true;

    // Retorna true se NÃO tiver mais nenhum erro
    const temErro = pc.ligado === false || pc.rede_ativa === false || pc.teclado === false || pc.mouse === false || pc.video === false;
    return !temErro;
  };

// NAVEGAÇÃO PARA O LABORATÓRIO / PC
  const navegarParaLab = (anexo) => {
    if (!anexo) return;

    const params = {
      ambienteId: anexo.ambienteId,
      labId: anexo.labId,
      pcId: anexo.pcKey || anexo.pcNome,
      pcNome: anexo.pcNome,
      labNome: anexo.labNome,
    };

    // Navega diretamente para a tela LabDetail passando os parâmetros
    navigation.navigate("LabDetail", params);
  };
  // ENVIAR MENSAGEM
  const enviarMensagem = async () => {
    if (mensagem.trim() === "" && !pcAnexado) return;
    if (!chatId || !user) return;

    const novaMensagem = {
      texto: mensagem.trim(),
      remetenteId: user.uid, 
      horario: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
      anexo: pcAnexado || null,
    };

    try {
      const chatRef = ref(db, `chats/${chatId}/mensagens`);
      await set(push(chatRef), novaMensagem);

      const targetUid = chatId.replace(user.uid, '').replace('_', '');
      const metaRef = ref(db, `chats/${chatId}/metadata`);
      const metaSnap = await get(metaRef);
      
      let naoLidasTarget = 1;
      if (metaSnap.exists() && metaSnap.val().naoLidas && metaSnap.val().naoLidas[targetUid]) {
        naoLidasTarget = metaSnap.val().naoLidas[targetUid] + 1;
      }

      await set(metaRef, {
        ultimaMensagem: mensagem.trim() || 'Anexo de PC',
        horario: novaMensagem.horario,
        timestamp: novaMensagem.timestamp,
        naoLidas: {
          [user.uid]: 0,
          [targetUid]: naoLidasTarget
        }
      });

      setMensagem("");
      setPcAnexado(null);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  // APAGAR CONVERSA
  const handleApagarConversa = () => {
    const executarExclusao = async () => {
      try {
        await remove(ref(db, `chats/${chatId}`));
        setListaMensagens([]);
      } catch (error) {
        console.error("Erro ao apagar conversa:", error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Deseja realmente apagar toda esta conversa?")) {
        executarExclusao();
      }
    } else {
      Alert.alert(
        "Apagar Conversa",
        "Tem certeza de que deseja apagar todas as mensagens desta conversa?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Apagar", style: "destructive", onPress: executarExclusao }
        ]
      );
    }
  };

  const selecionarAnexo = (pc) => {
    setPcAnexado(pc);
    setModalVisible(false);
  };

  const KeyboardWrapper = Platform.OS === "web" ? View : KeyboardAvoidingView;

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color="#005b9f" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{contato?.nome || "Chat"}</Text>
        </View>

        <TouchableOpacity onPress={handleApagarConversa} style={{ padding: 6 }}>
          <Ionicons name="trash-outline" size={22} color="#c62828" />
        </TouchableOpacity>
      </View>

      <KeyboardWrapper 
        style={styles.container} 
        behavior={Platform.OS === "ios" ? "padding" : undefined} 
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          style={{ flex: 1 }}
          data={listaMensagens}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isUser = item.remetenteId === user.uid;
            const resolvido = item.anexo ? isPcResolvido(item.anexo) : false;

            return (
              <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.otherBubble]}>
                {item.texto ? (
                  <Text style={[styles.messageText, isUser ? styles.userText : styles.otherText]}>
                    {item.texto}
                  </Text>
                ) : null}
                
                {/* CARD DO ANEXO DO PC COM STATUS DINÂMICO */}
                {item.anexo && (
                  <TouchableOpacity 
                    style={[
                      styles.attachmentCard,
                      resolvido && styles.attachmentCardResolved
                    ]} 
                    onPress={() => navegarParaLab(item.anexo)}
                  >
                    <Ionicons 
                      name={resolvido ? "checkmark-circle" : "warning"} 
                      size={20} 
                      color={resolvido ? "#2e7d32" : "#c62828"} 
                    />
                    <View style={styles.attachmentInfo}>
                      <Text style={[styles.attachmentTitle, resolvido && styles.attachmentTitleResolved]}>
                        {item.anexo.pcNome} - {item.anexo.labNome}
                      </Text>
                      <Text style={[styles.attachmentSubtitle, resolvido && styles.attachmentSubtitleResolved]}>
                        {resolvido ? "Problema Resolvido • Ver Lab" : "Alerta de Falha • Ver Lab"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={resolvido ? "#2e7d32" : "#666"} />
                  </TouchableOpacity>
                )}

                <Text style={[styles.timeText, isUser ? styles.userTime : styles.otherTime]}>
                  {item.horario}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: "#999", marginTop: 40 }}>
              Mande um "Olá" para começar a conversa!
            </Text>
          }
        />

        {/* PRÉ-VISUALIZAÇÃO DE ANEXO SELECIONADO */}
        {pcAnexado && (
          <View style={styles.previewContainer}>
            <Ionicons name="warning" size={18} color="#c62828" />
            <Text style={styles.previewText}>Anexado: {pcAnexado.pcNome} ({pcAnexado.labNome})</Text>
            <TouchableOpacity onPress={() => setPcAnexado(null)}>
              <Ionicons name="close-circle" size={20} color="#c62828" />
            </TouchableOpacity>
          </View>
        )}

        {/* BARRA DE MENSAGEM COM PADDING PARA NAVEGADOR E MOBILE */}
        <View style={[
          styles.inputContainer, 
          { paddingBottom: Platform.OS === 'web' ? 20 : Math.max(insets.bottom, 12) }
        ]}>
          <TouchableOpacity 
            style={styles.attachButton} 
            onPress={() => {
              if (pcsComProblema.length > 0) {
                setModalVisible(true);
              } else {
                if (Platform.OS === 'web') {
                  window.alert("Não há computadores com falha relatada no momento.");
                } else {
                  Alert.alert("Tudo OK!", "Não há computadores com falha relatada no momento.");
                }
              }
            }}
          >
            <Ionicons name="alert-circle-outline" size={24} color={pcsComProblema.length > 0 ? "#c62828" : "#999"} />
            {pcsComProblema.length > 0 && <View style={styles.redDot} />}
          </TouchableOpacity>

          <TextInput 
            style={styles.input} 
            placeholder="Digite sua mensagem..." 
            placeholderTextColor="#999" 
            value={mensagem} 
            onChangeText={setMensagem} 
          />
          
          <TouchableOpacity style={styles.sendButton} onPress={enviarMensagem}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* MODAL PARA SELEÇÃO DE COMPUTADOR COM ERRO */}
        <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
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
                  <TouchableOpacity key={pc.id} style={styles.modalItem} onPress={() => selecionarAnexo(pc)}>
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

      </KeyboardWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: "#fff",
    maxHeight: Platform.OS === 'web' ? '100vh' : '100%',
    overflow: 'hidden' 
  },
  container: { 
    flex: 1, 
    backgroundColor: "#f5f5f5",
    overflow: 'hidden'
  },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between",
    paddingHorizontal: 12, 
    paddingVertical: 10,
    backgroundColor: "#fff", 
    borderBottomWidth: 1, 
    borderColor: "#eee" 
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginLeft: 8 },
  chatList: { padding: 16 },
  
  messageBubble: { maxWidth: "80%", padding: 12, borderRadius: 12, marginBottom: 10, elevation: 1 },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#005b9f", borderBottomRightRadius: 2 },
  otherBubble: { alignSelf: "flex-start", backgroundColor: "#fff", borderBottomLeftRadius: 2, borderWidth: 1, borderColor: "#e0e0e0" },
  
  messageText: { fontSize: 15, color: "#333" },
  userText: { color: "#fff" },
  otherText: { color: "#333" },
  
  timeText: { fontSize: 10, marginTop: 4, textAlign: "right" },
  userTime: { color: "rgba(255, 255, 255, 0.7)" },
  otherTime: { color: "#999" },
  
  // ESTILOS DO CARD DO ANEXO DE PC (EM ERRO vs RESOLVIDO)
  attachmentCard: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#ffebee", 
    borderRadius: 8, 
    padding: 8, 
    marginTop: 8, 
    borderWidth: 1, 
    borderColor: "#ef9a9a" 
  },
  attachmentCardResolved: {
    backgroundColor: "#e8f5e9",
    borderColor: "#a5d6a7"
  },
  attachmentInfo: { flex: 1, marginHorizontal: 8 },
  attachmentTitle: { fontSize: 13, fontWeight: "bold", color: "#c62828" },
  attachmentTitleResolved: { color: "#2e7d32" },
  attachmentSubtitle: { fontSize: 11, color: "#666" },
  attachmentSubtitleResolved: { color: "#388e3c" },

  previewContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#fff", 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderTopWidth: 1, 
    borderColor: "#e0e0e0" 
  },
  previewText: { flex: 1, fontSize: 13, color: "#c62828", fontWeight: "bold", marginLeft: 8 },
  
  inputContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: 12, 
    paddingTop: 10,
    backgroundColor: "#fff", 
    borderTopWidth: 1, 
    borderColor: "#e0e0e0" 
  },
  attachButton: { position: "relative", marginRight: 10, padding: 4 },
  redDot: { position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: "#c62828" },
  input: { flex: 1, backgroundColor: "#f0f0f0", borderRadius: 20, paddingHorizontal: 16, height: 44, fontSize: 15, color: "#333" },
  sendButton: { backgroundColor: "#005b9f", justifyContent: "center", alignItems: "center", height: 42, width: 42, borderRadius: 21, marginLeft: 10 },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "60%", padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  modalScroll: { paddingBottom: 20 },
  modalItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#f9f9f9", padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: "#eee" },
  modalItemTitle: { fontSize: 14, fontWeight: "bold", color: "#333" },
  modalItemSubtitle: { fontSize: 12, color: "#666", marginTop: 2 },
});