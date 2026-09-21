import React, { useContext, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { View as MotiView } from 'moti'; // Import da Moti
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../auth/AuthContext';
import { ref, get, update, remove } from 'firebase/database';
import { updateProfile, deleteUser } from 'firebase/auth';
import { db, auth } from '../config/firebaseConfig';

export default function ProfileScreen({ navigation }) {
  const { user, userRole } = useContext(AuthContext);

  const [listaAmbientes, setListaAmbientes] = useState([]);
  const [loadingAmbiente, setLoadingAmbiente] = useState(true);

  // Estados dos dados do Utilizador
  const [fotoPerfil, setFotoPerfil] = useState(user?.photoURL || null);
  const [nomeExibicao, setNomeExibicao] = useState(user?.displayName || 'Utilizador');

  // Estados do Modal de Edição
  const [modalEditVisible, setModalEditVisible] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editFoto, setEditFoto] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function buscarDadosVinculados() {
      if (!user) {
        setLoadingAmbiente(false);
        return;
      }

      try {
        const userSnap = await get(ref(db, `usuarios/${user.uid}`));
        let uData = {};
        if (userSnap.exists()) {
          uData = userSnap.val();
          if (uData.photoURL || uData.foto) {
            setFotoPerfil(uData.photoURL || uData.foto);
          }
          if (uData.nome) {
            setNomeExibicao(uData.nome);
          }
        }

        const ambSnap = await get(ref(db, 'ambientes'));
        if (ambSnap.exists()) {
          const todosAmbientes = ambSnap.val();
          let nomesEncontrados = [];

          if (uData.ambientesPermitidos) {
            const permitidosKeys = Object.keys(uData.ambientesPermitidos);
            permitidosKeys.forEach((ambId) => {
              if (todosAmbientes[ambId]) {
                const amb = todosAmbientes[ambId];
                const nome = amb.nome || amb.escola?.nome || ambId;
                nomesEncontrados.push(nome);
              }
            });
          }

          if (nomesEncontrados.length === 0 && (uData.role === 'admin' || userRole === 'admin')) {
            Object.keys(todosAmbientes).forEach((ambId) => {
              const amb = todosAmbientes[ambId];
              const nome = amb.nome || amb.escola?.nome || ambId;
              nomesEncontrados.push(nome);
            });
          }

          setListaAmbientes(nomesEncontrados);
        } else {
          setListaAmbientes([]);
        }
      } catch (error) {
        console.error('Erro ao buscar dados do perfil:', error);
      } finally {
        setLoadingAmbiente(false);
      }
    }

    buscarDadosVinculados();
  }, [user, userRole]);

  const abrirModalEdicao = () => {
    setEditNome(nomeExibicao);
    setEditFoto(fotoPerfil || '');
    setModalEditVisible(true);
  };

  const handleSalvarPerfil = async () => {
    if (!editNome.trim()) {
      const msg = "O nome não pode ficar em branco.";
      Platform.OS === 'web' ? alert(msg) : Alert.alert("Atenção", msg);
      return;
    }

    try {
      setSaving(true);
      const photoVal = editFoto.trim() || null;

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: editNome.trim(),
          photoURL: photoVal,
        });
      }

      await update(ref(db, `usuarios/${user.uid}`), {
        nome: editNome.trim(),
        photoURL: photoVal,
      });

      setNomeExibicao(editNome.trim());
      setFotoPerfil(photoVal);
      setModalEditVisible(false);

      const msgSucesso = "Perfil atualizado com sucesso!";
      Platform.OS === 'web' ? alert(msgSucesso) : Alert.alert("Sucesso", msgSucesso);
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      const msgErro = "Não foi possível salvar as alterações.";
      Platform.OS === 'web' ? alert(msgErro) : Alert.alert("Erro", msgErro);
    } finally {
      setSaving(false);
    }
  };

  const handleExcluirConta = () => {
    const executarExclusao = async () => {
      try {
        setSaving(true);
        const uid = user.uid;

        await remove(ref(db, `usuarios/${uid}`));

        if (auth.currentUser) {
          await deleteUser(auth.currentUser);
        }
      } catch (error) {
        console.error("Erro ao excluir conta:", error);
        if (error.code === 'auth/requires-recent-login') {
          const msg = "Por segurança, faça login novamente no aplicativo antes de excluir a sua conta.";
          Platform.OS === 'web' ? alert(msg) : Alert.alert("Reautenticação Necessária", msg);
        } else {
          const msg = "Erro ao excluir conta. Tente novamente mais tarde.";
          Platform.OS === 'web' ? alert(msg) : Alert.alert("Erro", msg);
        }
      } finally {
        setSaving(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("ATENÇÃO: Deseja realmente EXCLUIR a sua conta? Esta ação é irreversível!")) {
        executarExclusao();
      }
    } else {
      Alert.alert(
        "Excluir Conta",
        "ATENÇÃO: Deseja realmente excluir a sua conta? Esta ação é irreversível e apagará todos os seus dados!",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Excluir", style: "destructive", onPress: executarExclusao }
        ]
      );
    }
  };

  const renderAvatar = () => {
    let uri = fotoPerfil;
    if (uri && typeof uri === 'string') {
      if (!uri.startsWith('http') && !uri.startsWith('data:image')) {
        uri = `data:image/jpeg;base64,${uri}`;
      }
      return (
        <Image
          source={{ uri }}
          style={styles.avatar}
          onError={() => setFotoPerfil(null)}
        />
      );
    }
    return (
      <Ionicons
        name="person-circle-outline"
        size={96}
        color="#005b9f"
        style={styles.avatarPlaceholder}
      />
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* 1. ANIMAÇÃO DE ENTRADA DO AVATAR (ESCALA + FADE-IN) */}
      <MotiView
        from={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 12, duration: 500 }}
        style={styles.avatarContainer}
      >
        {renderAvatar()}
        <TouchableOpacity style={styles.editAvatarBadge} onPress={abrirModalEdicao}>
          <Ionicons name="camera-outline" size={16} color="#fff" />
        </TouchableOpacity>
      </MotiView>

      {/* 2. ANIMAÇÃO DO NOME E EMAIL (DESLIZA DE CIMA PARA BAIXO) */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 100 }}
      >
        <Text style={styles.nomeUsuario}>{nomeExibicao}</Text>
        <Text style={styles.emailUsuario}>{user?.email || 'E-mail não disponível'}</Text>
      </MotiView>

      {/* 3. ANIMAÇÃO DO CARD DE INFORMAÇÕES (DESLIZA DE BAIXO PARA CIMA) */}
      <MotiView
        from={{ opacity: 0, translateY: 30 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 200 }}
        style={styles.cardInfo}
      >
        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#005b9f" />
          <Text style={styles.infoLabel}>Nível de Acesso:</Text>
          <Text style={styles.infoValue}>
            {userRole ? userRole.toUpperCase() : 'USER'}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRowColumn}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="school-outline" size={20} color="#005b9f" />
            <Text style={styles.infoLabel}>Ambientes Permitidos:</Text>
          </View>

          {loadingAmbiente ? (
            <ActivityIndicator size="small" color="#005b9f" style={{ marginTop: 5 }} />
          ) : listaAmbientes.length > 0 ? (
            <View style={styles.badgesContainer}>
              {listaAmbientes.map((ambNome, index) => (
                <MotiView
                  key={index}
                  from={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'timing', duration: 300, delay: 300 + index * 80 }}
                  style={styles.ambienteBadge}
                >
                  <Text style={styles.ambienteBadgeText}>{ambNome}</Text>
                </MotiView>
              ))}
            </View>
          ) : (
            <Text style={styles.noEnvText}>Nenhum ambiente vinculado</Text>
          )}
        </View>
      </MotiView>

      {/* 4. ANIMAÇÃO DOS BOTÕES */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 350 }}
        style={{ width: '100%', alignItems: 'center' }}
      >
        <TouchableOpacity style={styles.botaoEditar} onPress={abrirModalEdicao}>
          <Ionicons name="create-outline" size={20} color="#005b9f" style={{ marginRight: 8 }} />
          <Text style={styles.textoBotaoEditar}>Editar Perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botaoHome} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="home-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.textoBotaoHome}>Voltar para o Painel (Home)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botaoExcluir} onPress={handleExcluirConta}>
          <Ionicons name="trash-outline" size={18} color="#c62828" style={{ marginRight: 6 }} />
          <Text style={styles.textoBotaoExcluir}>Excluir Minha Conta</Text>
        </TouchableOpacity>
      </MotiView>

      {/* MODAL DE EDIÇÃO */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalEditVisible}
        onRequestClose={() => setModalEditVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Informações</Text>
              <TouchableOpacity onPress={() => setModalEditVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nome de Exibição:</Text>
            <TextInput
              style={styles.input}
              value={editNome}
              onChangeText={setEditNome}
              placeholder="Digite o seu nome"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>URL da Foto de Perfil:</Text>
            <TextInput
              style={styles.input}
              value={editFoto}
              onChangeText={setEditFoto}
              placeholder="Cole o link da foto (http ou base64)"
              placeholderTextColor="#999"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalEditVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSalvarPerfil}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 20, 
    backgroundColor: '#f5f5f5' 
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: { 
    width: 96, 
    height: 96, 
    borderRadius: 48, 
    borderWidth: 2, 
    borderColor: '#005b9f' 
  },
  avatarPlaceholder: { 
    marginBottom: 0 
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#005b9f',
    borderRadius: 15,
    padding: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  nomeUsuario: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#333', 
    textAlign: 'center' 
  },
  emailUsuario: { 
    fontSize: 14, 
    color: '#666', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  cardInfo: { 
    width: '100%', 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 20, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 2 
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 8 
  },
  infoRowColumn: {
    paddingVertical: 8,
  },
  infoLabel: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#444', 
    marginLeft: 10, 
    flex: 1 
  },
  infoValue: { 
    fontSize: 15, 
    fontWeight: 'bold', 
    color: '#005b9f' 
  },
  divider: { 
    height: 1, 
    backgroundColor: '#eee', 
    marginVertical: 8 
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 6,
  },
  ambienteBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  ambienteBadgeText: {
    color: '#005b9f',
    fontSize: 13,
    fontWeight: '600',
  },
  noEnvText: {
    color: '#999',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
  
  botaoEditar: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderWidth: 1,
    borderColor: '#005b9f',
    width: '100%',
    paddingVertical: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 10,
  },
  textoBotaoEditar: { 
    color: '#005b9f', 
    fontSize: 15, 
    fontWeight: 'bold' 
  },
  botaoHome: { 
    flexDirection: 'row', 
    backgroundColor: '#005b9f', 
    width: '100%',
    paddingVertical: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center',
    elevation: 2,
    marginBottom: 15,
  },
  textoBotaoHome: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: 'bold' 
  },
  botaoExcluir: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  textoBotaoExcluir: {
    color: '#c62828',
    fontSize: 14,
    fontWeight: 'bold',
  },

  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20 
  },
  modalContent: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    width: '100%',
    maxWidth: 400,
    padding: 20,
    elevation: 5 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#005b9f',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});