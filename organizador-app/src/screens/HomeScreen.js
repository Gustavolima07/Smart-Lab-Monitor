// src/screens/HomeScreen.js
import React, { useEffect, useState, useContext } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Platform, 
  Modal, 
  TextInput, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { AuthContext } from '../auth/AuthContext';
import { ref, onValue, set, push, remove } from 'firebase/database';
import { db } from '../config/firebaseConfig';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  const { user, userRole } = useContext(AuthContext);
  const [ambientes, setAmbientes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [nomeNovoAmbiente, setNomeNovoAmbiente] = useState('');
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // 1. Escuta as permissões do usuário em tempo real
    const permitidosRef = ref(db, `usuarios/${user.uid}/ambientesPermitidos`);
    // 2. Escuta todos os ambientes globais em tempo real
    const ambientesRef = ref(db, 'ambientes');

    let idsPermitidos = [];
    let todosAmbientes = {};

    const atualizarLista = () => {
      const listaFinal = [];
      idsPermitidos.forEach(id => {
        if (todosAmbientes[id]) {
          listaFinal.push({
            id: id,
            ...todosAmbientes[id]
          });
        }
      });
      setAmbientes(listaFinal);
      setLoading(false);
    };

    const unsubPermitidos = onValue(permitidosRef, (snap) => {
      idsPermitidos = snap.exists() ? Object.keys(snap.val()) : [];
      atualizarLista();
    });

    const unsubAmbientes = onValue(ambientesRef, (snap) => {
      todosAmbientes = snap.exists() ? snap.val() : {};
      atualizarLista();
    });

    return () => {
      unsubPermitidos();
      unsubAmbientes();
    };
  }, [user]);

  const handleCriarAmbiente = async () => {
    if (!nomeNovoAmbiente.trim()) {
      if (Platform.OS === 'web') window.alert("Digite um nome válido para o ambiente.");
      else Alert.alert("Atenção", "Digite um nome válido para o ambiente.");
      return;
    }

    setCriando(true);

    try {
      const novoAmbienteRef = push(ref(db, 'ambientes'));
      const novoAmbId = novoAmbienteRef.key;

      await set(novoAmbienteRef, {
        nome: nomeNovoAmbiente.trim(),
        criadoPor: user.uid,
        dataCriacao: Date.now()
      });

      await set(ref(db, `usuarios/${user.uid}/ambientesPermitidos/${novoAmbId}`), true);

      setCriando(false);
      setNomeNovoAmbiente('');
      setModalVisible(false);

      if (Platform.OS === 'web') window.alert("Ambiente criado com sucesso!");
      else Alert.alert("Sucesso", "Ambiente criado com sucesso!");
    } catch (error) {
      setCriando(false);
      console.error("Erro ao criar ambiente:", error);
      if (Platform.OS === 'web') window.alert("Erro ao criar o ambiente.");
      else Alert.alert("Erro", "Falha ao criar o ambiente.");
    }
  };

  const handleExcluirAmbiente = async (ambId, ambNome) => {
    const executarExclusao = async () => {
      try {
        // Atualização instantânea na tela antes mesmo de o servidor responder (remove o delay visual)
        setAmbientes(prev => prev.filter(item => item.id !== ambId));

        // Remove do banco de dados global de ambientes
        await remove(ref(db, `ambientes/${ambId}`));
        
        // Remove também o vínculo do usuário atual para garantir limpeza
        await remove(ref(db, `usuarios/${user.uid}/ambientesPermitidos/${ambId}`));

        if (Platform.OS === 'web') window.alert("Ambiente excluído com sucesso!");
        else Alert.alert("Sucesso", "Ambiente excluído com sucesso!");
      } catch (error) {
        console.error("Erro ao excluir ambiente:", error);
        if (Platform.OS === 'web') window.alert("Erro ao excluir o ambiente.");
        else Alert.alert("Erro", "Não foi possível excluir o ambiente.");
      }
    };

    if (Platform.OS === 'web') {
      const confirm = window.confirm(`Deseja realmente excluir o ambiente "${ambNome}"?`);
      if (confirm) executarExclusao();
    } else {
      Alert.alert("Confirmar Exclusão", `Deseja realmente excluir o ambiente "${ambNome}"?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: executarExclusao }
      ]);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#005b9f" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      <View style={styles.headerRow}>
        <Text style={styles.mainTitle}>Ambientes Disponíveis</Text>
        
        {userRole === 'admin' && (
          <TouchableOpacity 
            style={styles.novoAmbienteBtn} 
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.novoAmbienteBtnText}>Novo Ambiente</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <FlatList
        data={ambientes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const nomeAmbiente = item.nome || item.escola?.nome || "Ambiente sem nome";
          
          return (
            <View style={styles.ambienteCardWrapper}>
              <TouchableOpacity 
                style={styles.ambienteCard} 
                onPress={() => navigation.navigate('LabList', { ambienteData: item })}
              >
                <View style={styles.cardIconContainer}>
                  <MaterialCommunityIcons name="school" size={28} color="#005b9f" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.ambienteNome}>{nomeAmbiente}</Text>
                  <Text style={styles.ambienteHint}>Toque para acessar os laboratórios</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
              </TouchableOpacity>

              {userRole === 'admin' && (
                <TouchableOpacity 
                  style={styles.deleteAmbienteBtn} 
                  onPress={() => handleExcluirAmbiente(item.id, nomeAmbiente)}
                >
                  <Ionicons name="trash-outline" size={20} color="#c62828" />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum ambiente encontrado ou liberado para você.</Text>
        }
      />

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Criar Novo Ambiente</Text>
            <Text style={styles.modalSubtitle}>Insira o nome do local (Ex: Escola Central)</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Nome do ambiente..."
              placeholderTextColor="#999"
              value={nomeNovoAmbiente}
              onChangeText={setNomeNovoAmbiente}
              autoFocus={true}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setModalVisible(false);
                  setNomeNovoAmbiente('');
                }}
                disabled={criando}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={handleCriarAmbiente}
                disabled={criando}
              >
                {criando ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Criar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f6f9' },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  novoAmbienteBtn: { 
    flexDirection: 'row', 
    backgroundColor: '#005b9f', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8, 
    alignItems: 'center',
    elevation: 2 
  },
  novoAmbienteBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginLeft: 4 },
  
  ambienteCardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ambienteCard: { 
    flex: 1,
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 10, 
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: Platform.OS === 'web' ? 0.1 : 0.2,
    shadowRadius: 2
  },
  deleteAmbienteBtn: {
    backgroundColor: '#ffebee',
    padding: 14,
    borderRadius: 10,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  cardContent: { flex: 1 },
  ambienteNome: { fontSize: 18, fontWeight: 'bold', color: '#005b9f' },
  ambienteHint: { fontSize: 13, color: '#888', marginTop: 3 },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 30, fontSize: 15 },
  
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20 
  },
  modalContent: { 
    width: '100%', 
    maxWidth: 400, 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 20,
    elevation: 5 
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  modalSubtitle: { fontSize: 13, color: '#666', marginBottom: 15 },
  modalInput: { 
    backgroundColor: '#f9f9f9', 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    paddingHorizontal: 15, 
    height: 48, 
    fontSize: 15, 
    color: '#333',
    marginBottom: 20 
  },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, minWidth: 90, alignItems: 'center' },
  cancelButton: { backgroundColor: '#e0e0e0', marginRight: 10 },
  cancelButtonText: { color: '#333', fontWeight: 'bold' },
  confirmButton: { backgroundColor: '#005b9f' },
  confirmButtonText: { color: '#fff', fontWeight: 'bold' }
});