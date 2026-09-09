// src/router/AppNavigator.js
import React, { useContext, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ref, onValue } from 'firebase/database';

import { db } from '../config/firebaseConfig';
import { AuthContext } from '../auth/AuthContext';

// Importe TODAS as suas telas (ajuste os caminhos se precisar)
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

// 1. CAIXA DO MENU LATERAL (Telas de dentro do app)
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
      screenOptions={{
        headerTintColor: '#005b9f',
        drawerActiveTintColor: '#005b9f',
        drawerActiveBackgroundColor: '#e3f2fd',
      }}
    >
      <Drawer.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: "Tela Inicial", drawerIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} 
      />
      <Drawer.Screen 
        name="Conversas" 
        component={ConversasScreen} 
        options={{
          title: "Conversas",
          drawerIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} />,
          drawerRight: () => totalNaoLidas > 0 ? (
            <View style={{ backgroundColor: '#c62828', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginRight: 15 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{totalNaoLidas}</Text>
            </View>
          ) : null
        }} 
      />
      <Drawer.Screen 
        name="GerenciarAcessos" 
        component={GerenciarAcessosScreen} 
        options={{ title: "Gerenciar Acessos", drawerIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }} 
      />
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: "Perfil", drawerIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }} 
      />
    </Drawer.Navigator>
  );
}

// 2. CAIXA PRINCIPAL (Gerencia o fluxo de Login -> Menu -> Chat)
export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Telas de Autenticação */}
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      
      {/* Quando loga, chama o MainApp que carrega o Menu Lateral (DrawerRoutes) */}
      <Stack.Screen name="MainApp" component={DrawerRoutes} />
      
      {/* A tela de Chat fica na Stack para aparecer POR CIMA do menu e ter botão de voltar */}
      <Stack.Screen name="Chat" component={ChatScreen} />

      <Stack.Screen name="LabList" component={LabListScreen} />
      <Stack.Screen name="LabDetail" component={LabDetailScreen} />
    </Stack.Navigator>
  );
}