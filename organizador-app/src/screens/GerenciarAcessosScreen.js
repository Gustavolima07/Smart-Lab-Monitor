// src/screens/GerenciarAcessosScreen.js
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../auth/AuthContext';
import { ref, get, set, remove, onValue } from 'firebase/database';
import { db } from '../config/firebaseConfig';

export default function GerenciarAcessosScreen() {
  const { user } = useContext(AuthContext);
  const [emailInput, setEmailInput] = useState('');
  const [usuariosVinculados, setUsuariosVinculados] = useState([]);
  const [ambienteIdAdmin, setAmbienteIdAdmin] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1. OUVINTE EM TEMPO REAL: Vigia o acesso do próprio usuário logado
  useEffect(() => {
    if (!user) return;
    
    const permitidosRef = ref(db, `usuarios/${user.uid}/ambientesPermitidos`);
    const unsubscribe = onValue(permitidosRef, (snapshot) => {
      if (snapshot.exists()) {
        const ids = Object.keys(snapshot.val());
        if (ids.length > 0) {
          setAmbienteIdAdmin(ids[0]);
        } else {
          // Se não tem mais ids, perdeu o acesso
          setAmbienteIdAdmin(null);
          setUsuariosVinculados([]);
        }
      } else {
        // Se o nó não existe mais, perdeu o acesso
        setAmbienteIdAdmin(null);
        setUsuariosVinculados([]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // 2. OUVINTE EM TEMPO REAL: Atualiza a lista de vinculados do ambiente
  useEffect(() => {
    if (!ambienteIdAdmin) {
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
          if (userData.ambientesPermitidos && userData.ambientesPermitidos[ambienteIdAdmin]) {
            const fotoPerfil = userData.photoURL || userData.foto || userData.avatar || (uid === user.uid ? user.photoURL : null);

            lista.push({
              uid: uid,
              email: userData.email || 'E-mail não informado',
              nome: userData.nome || userData.displayName || 'Usuário',
              photoURL: fotoPerfil
            });
          }
        });
        setUsuariosVinculados(lista);
      } else {
        setUsuariosVinculados([]);
      }
    });

    return () => unsubscribe();
  }, [ambienteIdAdmin, user?.uid, user?.photoURL]);

  const handleAdicionarAcesso = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!emailInput.trim()) {
      setErrorMessage("Digite um e-mail válido.");
      return;
    }
    if (!ambienteIdAdmin) {
      setErrorMessage("Você não tem acesso administrativo a nenhum ambiente.");
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

      Object.keys(usuariosData).forEach(uid => {
        const uData = usuariosData[uid];
        if (uData.email && uData.email.toLowerCase() === emailProcurado) {
          targetUid = uid;
        }
      });

      if (!targetUid) {
        setErrorMessage("Nenhum usuário cadastrado com este e-mail.");
        return;
      }

      await set(ref(db, `usuarios/${targetUid}/ambientesPermitidos/${ambienteIdAdmin}`), true);
      setSuccessMessage("Acesso concedido com sucesso!");
      setEmailInput('');
      
    } catch (error) {
      console.error("Erro ao adicionar acesso:", error);
      setErrorMessage("Erro ao adicionar o acesso.");
    }
  };

  const handleRemoverAcesso = async (targetUid, targetEmail) => {
    if (targetUid === user?.uid) {
      if (Platform.OS === 'web') {
        window.alert("Você não pode remover seu próprio acesso.");
      } else {
        Alert.alert("Atenção", "Você não pode remover seu próprio acesso.");
      }
      return;
    }

    const executarRemocao = async () => {
      try {
        await remove(ref(db, `usuarios/${targetUid}/ambientesPermitidos/${ambienteIdAdmin}`));
        setSuccessMessage("Acesso removido com sucesso.");
      } catch (error) {
        console.error("Erro ao remover:", error);
        if (Platform.OS === 'web') {
          window.alert("Erro ao remover o acesso do banco de dados.");
        } else {
          Alert.alert("Erro", "Falha ao remover o acesso do banco de dados.");
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmacao = window.confirm(`Deseja realmente remover o acesso de ${targetEmail}?`);
      if (confirmacao) {
        executarRemocao();
      }
    } else {
      Alert.alert(
        "Confirmar Remoção",
        `Deseja remover o acesso de ${targetEmail}?`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Remover", style: "destructive", onPress: executarRemocao }
        ]
      );
    }
  };

  const renderAvatar = (url) => {
    if (url && typeof url === 'string' && (url.startsWith('http') || url.startsWith('data:image'))) {
      return <Image source={{ uri: url }} style={styles.avatar} />;
    }
    return <Ionicons name="person-circle-outline" size={40} color="#005b9f" style={{ marginRight: 12 }} />;
  };

  if (!ambienteIdAdmin) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="lock-closed-outline" size={60} color="#c62828" />
        <Text style={[styles.title, { marginTop: 15, textAlign: 'center' }]}>Acesso Negado</Text>
        <Text style={[styles.subtitle, { textAlign: 'center' }]}>Você não tem permissão para gerenciar nenhum ambiente.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gerenciar Acessos ao Ambiente</Text>
      <Text style={styles.subtitle}>Adicione colaboradores ou remova permissões.</Text>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="E-mail do usuário..."
          placeholderTextColor="#888"
          value={emailInput}
          onChangeText={setEmailInput}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAdicionarAcesso}>
          <Ionicons name="person-add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={styles.listTitle}>Usuários com Acesso:</Text>

      <FlatList
        data={usuariosVinculados}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            
            {renderAvatar(item.photoURL)}
            
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.nome}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
            
            {item.uid !== user?.uid && (
              <TouchableOpacity 
                onPress={() => handleRemoverAcesso(item.uid, item.email)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={20} color="#c62828" />
              </TouchableOpacity>
            )}
            
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum usuário vinculado além de você.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f6f9' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 15 },
  errorText: { color: '#c62828', backgroundColor: '#ffebee', padding: 10, borderRadius: 6, marginBottom: 15, fontSize: 14, fontWeight: '600' },
  successText: { color: '#2e7d32', backgroundColor: '#e8f5e9', padding: 10, borderRadius: 6, marginBottom: 15, fontSize: 14, fontWeight: '600' },
  inputContainer: { flexDirection: 'row', marginBottom: 25 },
  input: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, height: 48, fontSize: 15, color: '#333' },
  addButton: { backgroundColor: '#005b9f', justifyContent: 'center', alignItems: 'center', width: 48, height: 48, borderRadius: 8, marginLeft: 10, elevation: 2 },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#444', marginBottom: 12 },
  userCard: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, borderWidth: 1, borderColor: '#005b9f' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  userEmail: { fontSize: 13, color: '#666', marginTop: 2 },
  deleteButton: { padding: 8 },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 30, fontSize: 14 }
});