import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  Alert, 
  Image, 
  Platform, 
  ScrollView 
} from 'react-native';
import { View as MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../auth/AuthContext';
import { ref, get, set, remove, onValue, update } from 'firebase/database';
import { db } from '../config/firebaseConfig';

export default function GerenciarAcessosScreen() {
  const { user } = useContext(AuthContext);
  const [emailInput, setEmailInput] = useState('');
  const [usuariosVinculados, setUsuariosVinculados] = useState([]);
  
  // Lista de ambientes que o usuário pode GERENCIAR (Dono ou Admin)
  const [ambientesDisponiveis, setAmbientesDisponiveis] = useState([]);
  // Ambiente selecionado no momento: { id, nome, criadorUid }
  const [ambienteSelecionado, setAmbienteSelecionado] = useState(null);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [failedImages, setFailedImages] = useState({});

  // 1. OUVINTE EM TEMPO REAL: Busca ambientes onde o usuário é DONO ou ADMIN
  useEffect(() => {
    if (!user?.uid) return;

    const userPermsRef = ref(db, `usuarios/${user.uid}/ambientesPermitidos`);
    const ambientesRef = ref(db, 'ambientes');

    const carregarAmbientesGerenciáveis = async () => {
      try {
        const [permsSnap, ambSnap] = await Promise.all([
          get(userPermsRef),
          get(ambientesRef)
        ]);

        const perms = permsSnap.exists() ? permsSnap.val() : {};
        const ambData = ambSnap.exists() ? ambSnap.val() : {};

        const listaAmbientes = [];

        Object.keys(ambData).forEach((id) => {
          const amb = ambData[id];
          if (!amb) return;

          const criadorId = 
            amb.criadorUid || 
            amb.criadoPor || 
            amb.ownerUid || 
            amb.ownerId || 
            amb.adminUid || 
            amb.userId || 
            amb.uid || 
            amb.userUid;

          const permissaoUsuario = perms[id];

          // O usuário pode gerenciar se for o Criador/Dono OU se tiver permissão 'admin' / 'owner'
          const isDono = criadorId === user.uid || permissaoUsuario === 'owner';
          const isAdmin = permissaoUsuario === 'admin';

          if (isDono || isAdmin) {
            listaAmbientes.push({
              id: id,
              nome: amb.nome || amb.nomeAmbiente || amb.titulo || amb.title || amb.descricao || id,
              criadorUid: criadorId
            });
          }
        });

        setAmbientesDisponiveis(listaAmbientes);

        // Mantém o ambiente previamente selecionado se ainda for válido
        setAmbienteSelecionado((prev) => {
          if (prev && listaAmbientes.some(a => a.id === prev.id)) {
            return listaAmbientes.find(a => a.id === prev.id);
          }
          return listaAmbientes.length > 0 ? listaAmbientes[0] : null;
        });

      } catch (error) {
        console.error("Erro ao carregar ambientes gerenciáveis:", error);
      }
    };

    const unsubAmbientes = onValue(ambientesRef, carregarAmbientesGerenciáveis);
    const unsubPermissoes = onValue(userPermsRef, carregarAmbientesGerenciáveis);

    return () => {
      unsubAmbientes();
      unsubPermissoes();
    };
  }, [user?.uid]);

  // 2. OUVINTE EM TEMPO REAL: Busca os colaboradores com acesso ao ambiente selecionado
  useEffect(() => {
    if (!ambienteSelecionado?.id) {
      setUsuariosVinculados([]);
      return;
    }

    const usuariosRef = ref(db, 'usuarios');
    const unsubscribe = onValue(usuariosRef, (snapshot) => {
      if (snapshot.exists()) {
        const usuariosData = snapshot.val();
        const lista = [];

        Object.keys(usuariosData).forEach(uid => {
          const userData = usuariosData[uid];
          const permissao = userData.ambientesPermitidos ? userData.ambientesPermitidos[ambienteSelecionado.id] : null;

          if (permissao) {
            const fotoPerfil = userData.photoURL || userData.foto || userData.avatar || (uid === user?.uid ? user?.photoURL : null);

            // Define se o usuário listado é Dono, Admin ou TI
            let cargo = 'ti';
            if (uid === ambienteSelecionado.criadorUid || permissao === 'owner') {
              cargo = 'dono';
            } else if (permissao === 'admin') {
              cargo = 'admin';
            } else {
              cargo = 'ti';
            }

            lista.push({
              uid: uid,
              email: userData.email || 'E-mail não informado',
              nome: userData.nome || userData.displayName || 'Usuário',
              photoURL: fotoPerfil,
              cargo: cargo
            });
          }
        });
        setUsuariosVinculados(lista);
      } else {
        setUsuariosVinculados([]);
      }
    });

    return () => unsubscribe();
  }, [ambienteSelecionado?.id, ambienteSelecionado?.criadorUid, user?.uid, user?.photoURL]);

  // Concede acesso com cargo padrão 'ti'
  const handleAdicionarAcesso = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!emailInput.trim()) {
      setErrorMessage("Digite um e-mail válido.");
      return;
    }
    if (!ambienteSelecionado) {
      setErrorMessage("Você não tem nenhum ambiente selecionado.");
      return;
    }

    try {
      const emailProcurado = emailInput.trim().toLowerCase();
      const usuariosSnap = await get(ref(db, 'usuarios'));

      if (!usuariosSnap.exists()) {
        setErrorMessage("Nenhum usuário cadastrado no sistema.");
        return;
      }

      const usuariosData = usuariosSnap.val();
      let targetUid = null;
      let targetNome = '';

      Object.keys(usuariosData).forEach(uid => {
        const uData = usuariosData[uid];
        if (uData.email && uData.email.toLowerCase() === emailProcurado) {
          targetUid = uid;
          targetNome = uData.nome || uData.displayName || uData.email;
        }
      });

      if (!targetUid) {
        setErrorMessage("Nenhum usuário cadastrado com este e-mail.");
        return;
      }

      const updates = {};
      updates[`usuarios/${targetUid}/ambientesPermitidos/${ambienteSelecionado.id}`] = 'ti';
      updates[`usuarios/${targetUid}/role`] = 'ti';

      await update(ref(db), updates);
      
      setSuccessMessage(`Acesso ao ambiente "${ambienteSelecionado.nome}" concedido para ${targetNome} (Cargo: TI)!`);
      setEmailInput('');
      
    } catch (error) {
      console.error("Erro ao adicionar acesso:", error);
      setErrorMessage("Erro ao adicionar o acesso.");
    }
  };

  // Promover a Admin ou Rebaixar para TI
  const handleAlterarCargo = async (targetUid, targetNome, novoCargo) => {
    if (targetUid === user?.uid) {
      const msg = "Você não pode alterar seu próprio cargo nesta tela.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert("Atenção", msg);
      return;
    }

    const cargoNomeExtenso = novoCargo === 'admin' ? 'Administrador' : 'TI';
    const confirmMsg = `Deseja alterar o cargo de ${targetNome} para ${cargoNomeExtenso}?`;

    const executarAlteracao = async () => {
      try {
        const updates = {};
        updates[`usuarios/${targetUid}/ambientesPermitidos/${ambienteSelecionado.id}`] = novoCargo;
        updates[`usuarios/${targetUid}/role`] = novoCargo;

        await update(ref(db), updates);

        setSuccessMessage(`Cargo de ${targetNome} alterado para ${cargoNomeExtenso} com sucesso!`);
        setErrorMessage('');
      } catch (error) {
        console.error("Erro ao alterar cargo:", error);
        setErrorMessage("Erro ao atualizar cargo no banco de dados.");
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) executarAlteracao();
    } else {
      Alert.alert(
        "Alterar Cargo",
        confirmMsg,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Confirmar", onPress: executarAlteracao }
        ]
      );
    }
  };

  const handleRemoverAcesso = async (targetUid, targetEmail) => {
    if (targetUid === user?.uid) {
      const msg = "Você não pode remover seu próprio acesso.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert("Atenção", msg);
      return;
    }

    const executarRemocao = async () => {
      try {
        await remove(ref(db, `usuarios/${targetUid}/ambientesPermitidos/${ambienteSelecionado.id}`));
        setSuccessMessage(`Acesso ao ambiente "${ambienteSelecionado.nome}" removido.`);
      } catch (error) {
        console.error("Erro ao remover:", error);
        const msg = "Falha ao remover o acesso do banco de dados.";
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert("Erro", msg);
      }
    };

    const confirmMsg = `Deseja remover o acesso de ${targetEmail} do ambiente "${ambienteSelecionado.nome}"?`;

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) executarRemocao();
    } else {
      Alert.alert(
        "Confirmar Remoção",
        confirmMsg,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Remover", style: "destructive", onPress: executarRemocao }
        ]
      );
    }
  };

  const renderAvatar = (url, uid) => {
    const avatarUrl = url || (uid === user?.uid ? user?.photoURL : null);

    if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim().length > 0 && !failedImages[uid]) {
      if (Platform.OS === 'web') {
        return (
          <img 
            src={avatarUrl} 
            alt="Avatar" 
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              marginRight: 12,
              border: '1px solid #005b9f',
              objectFit: 'cover'
            }}
            onError={() => {
              setFailedImages(prev => ({ ...prev, [uid]: true }));
            }}
          />
        );
      }
      return (
        <Image 
          source={{ uri: avatarUrl }} 
          style={styles.avatar} 
          onError={() => setFailedImages(prev => ({ ...prev, [uid]: true }))}
        />
      );
    }
    return <Ionicons name="person-circle-outline" size={42} color="#005b9f" style={{ marginRight: 12 }} />;
  };

  if (!ambienteSelecionado) {
    return (
      <MotiView 
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 400 }}
        style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}
      >
        <Ionicons name="lock-closed-outline" size={60} color="#c62828" />
        <Text style={[styles.title, { marginTop: 15, textAlign: 'center' }]}>Nenhum Ambiente Sob Sua Gestão</Text>
        <Text style={[styles.subtitle, { textAlign: 'center' }]}>
          Você só pode gerenciar acessos dos ambientes onde você é Dono ou Administrador.
        </Text>
      </MotiView>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. CABEÇALHO ANIMADO (DESLIZA DE CIMA PARA BAIXO) */}
      <MotiView
        from={{ opacity: 0, translateY: -15 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 450 }}
      >
        <Text style={styles.title}>Gerenciar Acessos ao Ambiente</Text>
        <Text style={styles.subtitle}>Adicione colaboradores, defina cargos (Admin/TI) ou remova permissões.</Text>
      </MotiView>

      {/* 2. SELETOR DE AMBIENTES ANIMADO */}
      {ambientesDisponiveis.length > 1 && (
        <MotiView 
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 400, delay: 100 }}
          style={styles.selectorContainer}
        >
          <Text style={styles.selectorLabel}>Ambientes Gerenciáveis:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollSelector}>
            {ambientesDisponiveis.map((amb) => {
              const isSelected = amb.id === ambienteSelecionado?.id;
              return (
                <TouchableOpacity
                  key={amb.id}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => {
                    setAmbienteSelecionado(amb);
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                >
                  <Ionicons 
                    name="business" 
                    size={16} 
                    color={isSelected ? '#fff' : '#005b9f'} 
                    style={{ marginRight: 6 }} 
                  />
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {amb.nome}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </MotiView>
      )}

      {/* 3. BANNER INDICATIVO ANIMADO */}
      <MotiView 
        from={{ opacity: 0, translateX: -20 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 150 }}
        style={styles.activeBanner}
      >
        <Ionicons name="location-outline" size={18} color="#005b9f" />
        <Text style={styles.activeBannerText}>
          Gerenciando colaboradores do ambiente: <Text style={styles.activeBannerBold}>{ambienteSelecionado.nome}</Text>
        </Text>
      </MotiView>

      {/* MENSAGENS DE ALERTA COM ANIMAÇÃO SPRING */}
      {errorMessage ? (
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          <Text style={styles.errorText}>{errorMessage}</Text>
        </MotiView>
      ) : null}

      {successMessage ? (
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          <Text style={styles.successText}>{successMessage}</Text>
        </MotiView>
      ) : null}

      {/* 4. CAMPO DE ENTRADA ANIMADO */}
      <MotiView 
        from={{ opacity: 0, translateY: 15 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 200 }}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          placeholder="E-mail do colaborador..."
          placeholderTextColor="#888"
          value={emailInput}
          onChangeText={setEmailInput}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAdicionarAcesso}>
          <Ionicons name="person-add" size={20} color="#fff" />
        </TouchableOpacity>
      </MotiView>

      <Text style={styles.listTitle}>
        Usuários com Acesso em <Text style={{ color: '#005b9f' }}>{ambienteSelecionado.nome}</Text>:
      </Text>

      {/* 5. LISTA DE USUÁRIOS COM ANIMAÇÃO EM CASCATA (STAGGERED) */}
      <FlatList
        data={usuariosVinculados}
        keyExtractor={(item) => item.uid}
        renderItem={({ item, index }) => (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 350, delay: index * 75 }}
            style={styles.userCard}
          >
            
            {renderAvatar(item.photoURL, item.uid)}
            
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.nome}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
              
              <View style={styles.badgesRow}>
                <View style={styles.ambienteBadge}>
                  <Ionicons name="key-outline" size={12} color="#005b9f" />
                  <Text style={styles.ambienteBadgeText}>{ambienteSelecionado.nome}</Text>
                </View>

                {item.cargo === 'dono' && (
                  <View style={[styles.roleBadge, { backgroundColor: '#fff8e1', borderColor: '#ffe082' }]}>
                    <Ionicons name="star" size={12} color="#f57f17" />
                    <Text style={[styles.roleBadgeText, { color: '#f57f17' }]}>Dono</Text>
                  </View>
                )}

                {item.cargo === 'admin' && (
                  <View style={[styles.roleBadge, { backgroundColor: '#e8eaf6', borderColor: '#c5cae9' }]}>
                    <Ionicons name="shield-checkmark" size={12} color="#3f51b5" />
                    <Text style={[styles.roleBadgeText, { color: '#3f51b5' }]}>Admin</Text>
                  </View>
                )}

                {item.cargo === 'ti' && (
                  <View style={[styles.roleBadge, { backgroundColor: '#e0f2f1', borderColor: '#80cbc4' }]}>
                    <Ionicons name="hardware-chip-outline" size={12} color="#00695c" />
                    <Text style={[styles.roleBadgeText, { color: '#00695c' }]}>TI</Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* AÇÕES */}
            {item.uid !== user?.uid && item.cargo !== 'dono' && (
              <View style={styles.actionsContainer}>
                {item.cargo === 'admin' ? (
                  <TouchableOpacity 
                    style={[styles.roleActionButton, styles.demoteButton]}
                    onPress={() => handleAlterarCargo(item.uid, item.nome, 'ti')}
                  >
                    <Ionicons name="arrow-down-circle-outline" size={16} color="#c62828" />
                    <Text style={styles.demoteText}>Rebaixar p/ TI</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.roleActionButton, styles.promoteButton]}
                    onPress={() => handleAlterarCargo(item.uid, item.nome, 'admin')}
                  >
                    <Ionicons name="shield-checkmark-outline" size={16} color="#005b9f" />
                    <Text style={styles.promoteText}>Promover a Admin</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  onPress={() => handleRemoverAcesso(item.uid, item.email)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#c62828" />
                </TouchableOpacity>
              </View>
            )}
            
          </MotiView>
        )}
        ListEmptyComponent={
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 400 }}
          >
            <Text style={styles.emptyText}>Nenhum outro colaborador vinculado a este ambiente.</Text>
          </MotiView>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f6f9' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 15 },
  
  selectorContainer: { marginBottom: 15 },
  selectorLabel: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 6 },
  scrollSelector: { flexDirection: 'row' },
  chip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#e3f2fd', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 20, 
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#90caf9'
  },
  chipSelected: { backgroundColor: '#005b9f', borderColor: '#005b9f' },
  chipText: { fontSize: 13, color: '#005b9f', fontWeight: '600' },
  chipTextSelected: { color: '#fff' },

  activeBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#e8eaf6', 
    padding: 10, 
    borderRadius: 8, 
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#005b9f'
  },
  activeBannerText: { fontSize: 13, color: '#3f51b5', marginLeft: 6 },
  activeBannerBold: { fontWeight: 'bold', color: '#1a237e' },

  errorText: { color: '#c62828', backgroundColor: '#ffebee', padding: 10, borderRadius: 6, marginBottom: 15, fontSize: 14, fontWeight: '600' },
  successText: { color: '#2e7d32', backgroundColor: '#e8f5e9', padding: 10, borderRadius: 6, marginBottom: 15, fontSize: 14, fontWeight: '600' },
  inputContainer: { flexDirection: 'row', marginBottom: 25 },
  input: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, height: 48, fontSize: 15, color: '#333' },
  addButton: { backgroundColor: '#005b9f', justifyContent: 'center', alignItems: 'center', width: 48, height: 48, borderRadius: 8, marginLeft: 10, elevation: 2 },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#444', marginBottom: 12 },
  
  userCard: { 
    backgroundColor: '#fff', 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 10, 
    elevation: 1, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 2,
    flexWrap: 'wrap'
  },
  avatar: { width: 42, height: 42, borderRadius: 21, marginRight: 12, borderWidth: 1, borderColor: '#005b9f' },
  userInfo: { flex: 1, minWidth: 180 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  userEmail: { fontSize: 13, color: '#666', marginTop: 2 },
  
  badgesRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 6 },
  ambienteBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f4f8', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginRight: 6 },
  ambienteBadgeText: { fontSize: 11, color: '#005b9f', marginLeft: 4, fontWeight: '600' },

  roleBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  roleBadgeText: { fontSize: 11, marginLeft: 4, fontWeight: 'bold' },

  actionsContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', marginTop: Platform.OS === 'web' ? 0 : 6 },
  
  roleActionButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 6, 
    marginRight: 8,
    borderWidth: 1
  },
  promoteButton: { backgroundColor: '#e3f2fd', borderColor: '#90caf9' },
  promoteText: { fontSize: 12, color: '#005b9f', fontWeight: 'bold', marginLeft: 4 },
  
  demoteButton: { backgroundColor: '#ffebee', borderColor: '#ef9a9a' },
  demoteText: { fontSize: 12, color: '#c62828', fontWeight: 'bold', marginLeft: 4 },

  deleteButton: { padding: 8 },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 30, fontSize: 14 }
});