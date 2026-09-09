// src/screens/ProfileScreen.js
import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../auth/AuthContext';
import { ref, get } from 'firebase/database';
import { db } from '../config/firebaseConfig';

export default function ProfileScreen({ navigation }) {
  const { user, userRole } = useContext(AuthContext);
  const [nomeAmbiente, setNomeAmbiente] = useState('Carregando ambiente...');
  const [loadingAmbiente, setLoadingAmbiente] = useState(true);
  
  // Cria um estado para a foto, iniciando com a do Google (se tiver) ou null
  const [fotoPerfil, setFotoPerfil] = useState(user?.photoURL || null);
  const [nomeExibicao, setNomeExibicao] = useState(user?.displayName || 'Usuário');

  useEffect(() => {
    async function buscarDadosVinculados() {
      if (!user) {
        setLoadingAmbiente(false);
        return;
      }

      try {
        // 1. Busca os dados completos do usuário no banco (para pegar a foto Base64 e o nome exato)
        const userSnap = await get(ref(db, `usuarios/${user.uid}`));
        if (userSnap.exists()) {
          const uData = userSnap.val();
          if (uData.photoURL) setFotoPerfil(uData.photoURL);
          if (uData.nome) setNomeExibicao(uData.nome);
        }

        // 2. Busca o ambiente vinculado
        if (userSnap.exists() && userSnap.val().ambientesPermitidos) {
          const idsAmbientes = Object.keys(userSnap.val().ambientesPermitidos);
          if (idsAmbientes.length > 0) {
            const primeiroId = idsAmbientes[0];
            const ambSnap = await get(ref(db, `ambientes/${primeiroId}`));
            if (ambSnap.exists()) {
              const dadosAmb = ambSnap.val();
              setNomeAmbiente(dadosAmb.nome || dadosAmb.escola?.nome || primeiroId);
            } else {
              setNomeAmbiente('Ambiente não encontrado');
            }
          } else {
            setNomeAmbiente('Nenhum ambiente vinculado');
          }
        } else {
          setNomeAmbiente('Nenhum ambiente vinculado');
        }
      } catch (error) {
        console.error('Erro ao buscar dados do perfil:', error);
        setNomeAmbiente('Erro ao carregar');
      } finally {
        setLoadingAmbiente(false);
      }
    }

    buscarDadosVinculados();
  }, [user]);

  // Função auxiliar para renderizar a imagem corretamente
  const renderAvatar = () => {
    if (fotoPerfil && typeof fotoPerfil === 'string' && (fotoPerfil.startsWith('http') || fotoPerfil.startsWith('data:image'))) {
      return <Image source={{ uri: fotoPerfil }} style={styles.avatar} />;
    }
    return <Ionicons name="person-circle-outline" size={90} color="#005b9f" style={styles.avatarPlaceholder} />;
  };

  return (
    <View style={styles.container}>
      
      {/* Imagem puxada do banco ou do Auth */}
      {renderAvatar()}

      <Text style={styles.nomeUsuario}>
        {nomeExibicao}
      </Text>
      <Text style={styles.emailUsuario}>
        {user?.email || 'E-mail não disponível'}
      </Text>

      <View style={styles.cardInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#005b9f" />
          <Text style={styles.infoLabel}>Nível de Acesso:</Text>
          <Text style={styles.infoValue}>
            {userRole ? userRole.toUpperCase() : 'USER'}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Ionicons name="school-outline" size={20} color="#005b9f" />
          <Text style={styles.infoLabel}>Escola / Ambiente:</Text>
          {loadingAmbiente ? (
            <ActivityIndicator size="small" color="#005b9f" style={{ marginLeft: 5 }} />
          ) : (
            <Text style={[styles.infoValue, { flex: 1, textAlign: 'right' }]} numberOfLines={1}>
              {nomeAmbiente}
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.botao} onPress={() => navigation.navigate('Home')}>
        <Ionicons name="home-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.textoBotao}>Voltar para o Painel (Home)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  avatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 15, borderWidth: 2, borderColor: '#005b9f' },
  avatarPlaceholder: { marginBottom: 15 },
  nomeUsuario: { fontSize: 22, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  emailUsuario: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
  cardInfo: { width: '100%', backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 30, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  infoLabel: { fontSize: 15, fontWeight: '600', color: '#444', marginLeft: 10, flex: 1 },
  infoValue: { fontSize: 15, fontWeight: 'bold', color: '#005b9f' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 4 },
  botao: { flexDirection: 'row', backgroundColor: '#005b9f', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', elevation: 2 },
  textoBotao: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});