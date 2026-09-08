// src/screens/RegisterScreen.js
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function RegisterScreen({ navigation }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const handleRegister = () => {
    if (!nome || !email || !senha) {
      Alert.alert("Atenção", "Preencha todos os campos para criar sua conta.");
      return;
    }
    // Lógica de cadastro com Firebase Auth virá aqui
    console.log("Cadastrando:", nome, email);
    Alert.alert("Sucesso", "Conta criada com sucesso!");
    navigation.navigate("Login");
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.navigate("Welcome")}>
        <Ionicons name="arrow-back" size={60} color={"#005b9f"} />
      </TouchableOpacity>
      <View style={styles.iconContainer}>
        <Ionicons name="person-add-outline" size={60} color="#005b9f" />
      </View>

      <Text style={styles.titulo}>Criar Conta</Text>
      <Text style={styles.subtitulo}>
        Cadastre-se para começar a usar o Smart Lab Monitor.
      </Text>

      <View style={styles.inputContainer}>
        <Ionicons
          name="person-outline"
          size={20}
          color="#666"
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder="Nome completo"
          placeholderTextColor="#999"
          autoComplete="email"
          value={nome}
          onChangeText={setNome}
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons
          name="mail-outline"
          size={20}
          color="#666"
          style={styles.inputIcon}
        />
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
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color="#666"
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#999"
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
        />
      </View>

      <TouchableOpacity style={styles.botao} onPress={handleRegister}>
        <Text style={styles.textoBotao}>Cadastrar</Text>
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
  iconContainer: {
    alignSelf: "center",
    marginBottom: 20,
    backgroundColor: "#e3f2fd",
    padding: 18,
    borderRadius: 50,
  },
  titulo: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 15,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: "#333", outlineStyle: "none" },
  botao: {
    backgroundColor: "#005b9f",
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    elevation: 2,
  },
  textoBotao: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  linkContainer: { marginTop: 20, alignItems: "center" },
  textoLink: { color: "#666", fontSize: 14 },
  linkDestaque: { color: "#005b9f", fontWeight: "bold" },
});
