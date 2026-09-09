// src/auth/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';
import { ref, get, set, update } from 'firebase/database';
import { Platform } from 'react-native';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' ou 'user'
  const [loading, setLoading] = useState(true);

  // Monitora o estado da autenticação e busca o cargo (role) no banco
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Busca o cargo do usuário no Realtime Database
        const userRef = ref(db, `usuarios/${currentUser.uid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          setUserRole(snapshot.val().role);
        } else {
          // Se for o primeiro acesso (ex: Google Login sem registro prévio), cadastra como 'user' padrão
          const defaultRole = 'user';
          await set(userRef, {
            email: currentUser.email,
            nome: currentUser.displayName || 'Usuário',
            role: defaultRole
          });
          setUserRole(defaultRole);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Login com Email e Senha
  const loginWithEmail = async (email, senha) => {
    try {
      const response = await signInWithEmailAndPassword(auth, email, senha);
      return { success: true, user: response.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Cadastro com Email e Senha (Por padrão, nasce como 'user', a menos que seja o primeiro ou especificado)
  const registerWithEmail = async (email, senha, nome, role = 'user') => {
    try {
      const response = await createUserWithEmailAndPassword(auth, email, senha);
      const uid = response.user.uid;

      // Salva os dados iniciais do usuário no banco
      await set(ref(db, `usuarios/${uid}`), {
        email,
        nome,
        role // 'admin' ou 'user'
      });

      return { success: true, user: response.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Login com Google
  const loginWithGoogle = async () => {
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        const response = await signInWithPopup(auth, provider);
        return { success: true, user: response.user };
      } else {
        return { success: false, error: "Login com Google otimizado para Web no momento." };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserRole(null);
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userRole, 
      loading, 
      loginWithEmail, 
      registerWithEmail, 
      loginWithGoogle, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}