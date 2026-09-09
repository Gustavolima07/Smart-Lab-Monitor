// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';

// Importe o seu AppNavigator e o seu AuthProvider (ajuste os caminhos se precisar)
import AppNavigator from './src/router/AppNavigator'; 
import { AuthProvider } from './src/auth/AuthContext'; 

export default function App() {
  return (
    // O AuthProvider envolve o app para fornecer os dados do usuário logado
    <AuthProvider>
      {/* O NavigationContainer DEVE envolver o seu sistema de rotas */}
      <NavigationContainer>
        
        <AppNavigator />

      </NavigationContainer>
    </AuthProvider>
  );
}