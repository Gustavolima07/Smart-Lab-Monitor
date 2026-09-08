import 'react-native-gesture-handler'; 
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';

// Importação dos ícones nativos do Expo
import { Ionicons } from '@expo/vector-icons'; 

import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/Profile';

const Drawer = createDrawerNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Drawer.Navigator 
        initialRouteName="Home"
        screenOptions={{
          drawerType: 'front',
          drawerActiveTintColor: '#005b9f',
          headerStyle: { backgroundColor: '#005b9f' },
          headerTintColor: '#fff',
        }}
      >
        
        {/* Tela 1: Painel */}
        <Drawer.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ 
            title: 'Painel da Escola',
            drawerLabel: 'Laboratórios', // <-- Sem emoji aqui
            drawerIcon: ({ color, size }) => ( // <-- Ícone real aqui
              <Ionicons name="desktop-outline" size={size} color={color} />
            )
          }} 
        />
        
        {/* Tela 2: Perfil */}
        <Drawer.Screen 
          name="Profile" 
          component={ProfileScreen} 
          options={{ 
            title: 'Meu Perfil',
            drawerLabel: 'Perfil do Professor', // <-- Sem emoji aqui
            drawerIcon: ({ color, size }) => ( // <-- Ícone real aqui
              <Ionicons name="person-outline" size={size} color={color} />
            )
          }}
        />

      </Drawer.Navigator>
    </NavigationContainer>
  );
}