// src/screens/LoginScreen.js
import React, { useState, useContext } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../auth/AuthContext';
import { ref, get, update } from 'firebase/database';
import { auth, db } from '../config/firebaseConfig';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('admin@escola.com');
  const [senha, setSenha] = useState('654321');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const { loginWithEmail, loginWithGoogle } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!email || !senha) {
      setErro('Preencha todos os campos.');
      return;
    }

    setLoading(true);
    setErro('');

    const res = await loginWithEmail(email, senha);
    setLoading(false);

    if (res.success) {
      navigation.replace('MainApp');
    } else {
      setErro('E-mail ou senha inválidos.');
    }
  };

  const handleGoogleLogin = async () => {
    setErro('');
    // Dependendo de como seu loginWithGoogle está implementado, pode ser necessário um loading aqui também
    const res = await loginWithGoogle();

    if (res.success) {
      try {
        const user = auth.currentUser;
        if (user) {
          const userRef = ref(db, `usuarios/${user.uid}`);
          const snapshot = await get(userRef);
          
          // Prepara os dados de atualização extraindo a foto do Google Auth
          const updateData = {
            nome: user.displayName || 'Usuário Google',
            email: user.email,
            photoURL: user.photoURL || null,
          };

          // Se for a primeira vez que esse usuário faz login, define um cargo padrão para não quebrar o app
          if (!snapshot.exists()) {
            updateData.role = 'ti'; // Cargo padrão para novos cadastros via Google
          }

          // Salva ou atualiza os dados no Realtime Database de forma segura
          await update(userRef, updateData);
        }
      } catch (dbError) {
        console.error("Erro ao salvar dados do Google no banco:", dbError);
      }

      navigation.replace('MainApp');
    } else {
      setErro('Erro ao logar com o Google.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.titulo}>Bem-vindo de volta!</Text>
        <Text style={styles.subtitulo}>Faça login para monitorar os laboratórios</Text>

        {erro ? <Text style={styles.erroText}>{erro}</Text> : null}

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor="#999"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>Entrar</Text>}
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>OU</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
          <Ionicons name="logo-google" size={20} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.buttonText}>Entrar com o Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerText}>Não tem uma conta? <Text style={styles.registerBold}>Cadastre-se</Text></Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  formContainer: { width: '90%', maxWidth: 400, padding: 20, backgroundColor: '#fff', borderRadius: 12, elevation: 3, borderWidth: 1, borderColor: '#e0e0e0' },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 5 },
  subtitulo: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  erroText: { color: '#c62828', fontSize: 13, marginBottom: 10, textAlign: 'center', fontWeight: 'bold' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 12, paddingHorizontal: 12 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 45, fontSize: 15, color: '#333' },
  loginButton: { backgroundColor: '#005b9f', borderRadius: 8, height: 45, justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#ddd' },
  dividerText: { marginHorizontal: 10, color: '#999', fontSize: 12, fontWeight: 'bold' },
  googleButton: { flexDirection: 'row', backgroundColor: '#db4437', paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', width: '100%', elevation: 2 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  registerLink: { marginTop: 20, alignItems: 'center' },
  registerText: { color: '#666', fontSize: 14 },
  registerBold: { color: '#005b9f', fontWeight: 'bold' },
});