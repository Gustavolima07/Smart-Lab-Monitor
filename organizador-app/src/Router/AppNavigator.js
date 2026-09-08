// src/navigation/AppNavigator.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";

// Importação das telas de Autenticação
import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";

// Importação das telas principais do sistema
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import LabDetailScreen from "../screens/LabDetailScreen";
import ConversasScreen from "../screens/ConversasScreen";
import ChatScreen from "../screens/ChatScreens/ChatScreen";

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// Drawer Navigator (Menu lateral para usuários autenticados)
function DrawerNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={{
        drawerType: "front",
        drawerActiveTintColor: "#005b9f",
        headerStyle: { backgroundColor: "#005b9f" },
        headerTintColor: "#fff",
      }}
    >
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "Painel Geral da Escola",
          drawerLabel: "Laboratórios",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="desktop-outline" size={size} color={color} />
          ),
        }}
      />
      
      {/* Rota oculta para os detalhes do laboratório */}
      <Drawer.Screen
        name="LabDetail"
        component={LabDetailScreen}
        options={{ 
          title: "Detalhes do Laboratório",
          drawerItemStyle: { display: "none" } 
        }}
      />

      <Drawer.Screen
        name="Conversas"
        component={ConversasScreen}
        options={{
          title: "Conversas",
          drawerLabel: "Conversas",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Meu Perfil",
          drawerLabel: "Perfil",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Logout"
        component={HomeScreen}
        options={{
          title: "Sair",
          drawerLabel: "Sair",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="exit" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          drawerItemPress: (e) => {
            e.preventDefault();
            navigation.replace("Welcome");
          },
        })}
      />
    </Drawer.Navigator>
  );
}

// Stack Navigator Principal (Controla o fluxo geral do app)
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="MainApp" component={DrawerNavigator} />
        
        {/* Tela de Chat cadastrada no Stack para permitir navegação limpa */}
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen} 
          options={{ headerShown: true, title: "Chat", headerStyle: { backgroundColor: "#005b9f" }, headerTintColor: "#fff" }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}