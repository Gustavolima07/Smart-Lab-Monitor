import React, { useContext, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { 
  createDrawerNavigator, 
  DrawerContentScrollView, 
  DrawerItemList 
} from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ref, onValue } from 'firebase/database';

import { db } from '../config/firebaseConfig';
import { AuthContext } from '../auth/AuthContext';

// Importação das telas
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ConversasScreen from '../screens/ChatScreens/ConversasScreen';
import GerenciarAcessosScreen from '../screens/GerenciarAcessosScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreens/ChatScreen'; 

import LabListScreen from '../screens/LabScreens/LabListScreen';
import LabDetailScreen from '../screens/LabScreens/LabDetailScreen'; 

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

// COMPONENTE PERSONALIZADO PARA O MENU LATERAL (DRAWER)
function CustomDrawerContent(props) {
  const { logout } = useContext(AuthContext);

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1, justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        {/* Itens normais do Drawer */}
        <DrawerItemList {...props} />
      </View>

      {/* Botão de Sair no Rodapé do Menu */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color="#c62828" />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

// 1. CAIXA DO MENU LATERAL (Telas internas do aplicativo)
function DrawerRoutes() {
  const { user } = useContext(AuthContext);
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);

  useEffect(() => {
    if (!user) return;
    const chatsRef = ref(db, 'chats');
    const unsubscribe = onValue(chatsRef, (snapshot) => {
      if (snapshot.exists()) {
        const chatsData = snapshot.val();
        let contadorTotal = 0;
        Object.keys(chatsData).forEach((chatId) => {
          if (chatId.includes(user.uid)) {
            const naoLidasAqui = chatsData[chatId]?.metadata?.naoLidas?.[user.uid] || 0;
            contadorTotal += naoLidasAqui;
          }
        });
        setTotalNaoLidas(contadorTotal);
      }
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <Drawer.Navigator
      initialRouteName="Home"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerTintColor: '#005b9f',
        drawerActiveTintColor: '#005b9f',
        drawerActiveBackgroundColor: '#e3f2fd',
      }}
    >
      <Drawer.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          title: "Tela Inicial", 
          drawerIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> 
        }} 
      />
      <Drawer.Screen 
        name="Conversas" 
        component={ConversasScreen} 
        options={{
          title: "Conversas",
          drawerIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} />,
          drawerRight: () => totalNaoLidas > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{totalNaoLidas}</Text>
            </View>
          ) : null
        }} 
      />
      <Drawer.Screen 
        name="GerenciarAcessos" 
        component={GerenciarAcessosScreen} 
        options={{ 
          title: "Gerenciar Acessos", 
          drawerIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> 
        }} 
      />
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          title: "Perfil", 
          drawerIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> 
        }} 
      />
    </Drawer.Navigator>
  );
}

// 2. NAVEGAÇÃO PRINCIPAL (Gerencia Telas de Auth vs App Logado)
export default function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  // Enquanto o Firebase verifica se já existe login salvo, exibe uma tela de carregamento
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#005b9f" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        /* FLUXO LOGADO: Se o usuário estiver autenticado, carrega estas telas */
        <>
          <Stack.Screen name="MainApp" component={DrawerRoutes} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="LabList" component={LabListScreen} />
          <Stack.Screen name="LabDetail" component={LabDetailScreen} />
        </>
      ) : (
        /* FLUXO NÃO LOGADO: Se não houver usuário, exibe as telas de Auth */
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logoutContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginBottom: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  logoutText: {
    marginLeft: 15,
    fontSize: 15,
    color: '#c62828',
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: '#c62828',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 15,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});