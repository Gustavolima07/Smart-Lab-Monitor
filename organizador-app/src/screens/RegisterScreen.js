// src/screens/RegisterScreen.js
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"; // Importamos o updateProfile
import { ref, set } from "firebase/database";
import { auth, db } from "../config/firebaseConfig";
import * as ImagePicker from "expo-image-picker";

export default function RegisterScreen({ navigation }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [imageBase64, setImageBase64] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSelecionarFoto = async () => {
    try {
      setErrorMessage("");
      setSuccessMessage("");
      
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permissão negada", "Precisamos de permissão para acessar suas fotos e escolher uma imagem de perfil.");
          return;
        }
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, 
        aspect: [1, 1],      
        quality: 0.5,        
        base64: true,        
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        if (asset.base64) {
          const base64Str = `data:image/jpeg;base64,${asset.base64}`;
          setImageBase64(base64Str);
          setSuccessMessage("Foto selecionada com sucesso!");
        } 
        else if (Platform.OS === 'web' && asset.uri) {
          // Na Web, o Expo muitas vezes já retorna a URI como um Base64 direto
          if (asset.uri.startsWith('data:image')) {
            setImageBase64(asset.uri);
            setSuccessMessage("Foto selecionada com sucesso!");
          } else {
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
              setImageBase64(reader.result); 
              setSuccessMessage("Foto selecionada com sucesso!");
            };
          }
        } else {
          setErrorMessage("Não foi possível processar o formato da imagem.");
        }
      }
    } catch (error) {
      console.error("Erro ao selecionar imagem:", error);
      setErrorMessage("Ocorreu um erro ao tentar processar a foto.");
    }
  };

  const validarEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleRegister = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!nome.trim()) {
      setErrorMessage("Por favor, preencha o seu nome completo.");
      return;
    }
    if (!email.trim() || !validarEmail(email.trim())) {
      setErrorMessage("Por favor, insira um e-mail válido.");
      return;
    }
    if (!senha || senha.length < 6) {
      setErrorMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (!imageBase64) {
      setErrorMessage("Por favor, adicione uma foto de perfil.");
      return;
    }

    setLoading(true);

    try {
      // 1. Cria a conta no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), senha);
      const user = userCredential.user;

      // 2. Atualiza o perfil apenas com o NOME (Sem o photoURL para evitar o erro de limite de texto)
      await updateProfile(user, {
        displayName: nome.trim(),
      });

      const cargo = isAdmin ? "admin" : "ti";

      // 3. Salva a foto Base64 GIGANTE aqui, no Realtime Database, onde é permitido!
      await set(ref(db, `usuarios/${user.uid}`), {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        role: cargo,
        photoURL: imageBase64, // Salva o Base64 aqui
        ambientesPermitidos: {}
      });
      setLoading(false);
      
      // 4. Tratamento do Alerta de Sucesso (Web x Mobile)
      if (Platform.OS === 'web') {
        window.alert("Conta criada com sucesso!");
        navigation.navigate("Login");
      } else {
        Alert.alert("Sucesso", "Conta criada com sucesso!", [
          { text: "OK", onPress: () => navigation.navigate("Login") }
        ]);
      }

    } catch (error) {
      setLoading(false);
      console.error("Erro ao cadastrar:", error);
      
      if (error.code === 'auth/email-already-in-use') {
        setErrorMessage("Este e-mail já está em uso por outra conta.");
      } else if (error.code === 'auth/invalid-email') {
        setErrorMessage("O formato do e-mail é inválido.");
      } else {
        setErrorMessage("Erro ao criar conta. Tente novamente mais tarde.");
      }
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.navigate("Welcome")} style={styles.backButton}>
        <Ionicons name="arrow-back" size={32} color={"#005b9f"} />
      </TouchableOpacity>

      <Text style={styles.titulo}>Criar Conta</Text>
      <Text style={styles.subtitulo}>
        Cadastre-se para começar a usar o Smart Lab Monitor.
      </Text>

      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#c62828" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {successMessage ? (
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#2e7d32" />
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.imagePickerContainer} onPress={handleSelecionarFoto}>
        {imageBase64 ? (
          <View>
            <Image source={{ uri: imageBase64 }} style={styles.previewImage} />
            <View style={styles.editIconBadge}>
              <Ionicons name="pencil" size={14} color="#fff" />
            </View>
          </View>
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="camera-outline" size={36} color="#005b9f" />
            <Text style={styles.imagePickerText}>Adicionar Foto</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Nome completo"
          placeholderTextColor="#999"
          value={nome}
          onChangeText={setNome}
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#999"
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
        />
      </View>

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Conta de Administrador?</Text>
        <Switch
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={isAdmin ? "#005b9f" : "#f4f3f4"}
          onValueChange={setIsAdmin}
          value={isAdmin}
        />
      </View>

      <TouchableOpacity style={styles.botao} onPress={handleRegister} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.textoBotao}>Cadastrar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate("Login")}
        style={styles.linkContainer}
      >
        <Text style={styles.textoLink}>
          Já tem uma conta? <Text style={styles.linkDestaque}>Faça login</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    padding: 24,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
  },
  titulo: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 5,
    marginTop: 20,
  },
  subtitulo: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffebee",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ffcdd2",
  },
  errorText: {
    color: "#c62828",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#c8e6c9",
  },
  successText: {
    color: "#2e7d32",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  imagePickerContainer: {
    alignSelf: "center",
    marginBottom: 25,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#005b9f",
  },
  editIconBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#005b9f",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#90caf9",
    borderStyle: "dashed",
  },
  imagePickerText: {
    fontSize: 12,
    color: "#005b9f",
    marginTop: 6,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: "#333" },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 20,
  },
  switchLabel: { fontSize: 15, color: "#444", fontWeight: "600" },
  botao: {
    backgroundColor: "#005b9f",
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  textoBotao: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  linkContainer: { marginTop: 20, alignItems: "center" },
  textoLink: { color: "#666", fontSize: 15 },
  linkDestaque: { color: "#005b9f", fontWeight: "bold" },
});