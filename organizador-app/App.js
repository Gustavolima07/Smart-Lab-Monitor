// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';

// Importe o seu AppNavigator e o seu AuthProvider
import AppNavigator from './src/router/AppNavigator'; 
import { AuthProvider } from './src/auth/AuthContext'; 

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}