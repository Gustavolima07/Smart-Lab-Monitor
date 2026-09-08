// src/screens/ConversasScreen.js
import React from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CONVERSAS_EXEMPLO = [
  {
    id: '1',
    nome: 'Suporte Técnico - Escola',
    ultimaMensagem: 'Algum laboratório com falha relatada hoje?',
    horario: '14:05',
    naoLidas: 2,
  },
  {
    id: '2',
    nome: 'Manutenção Lab 6',
    ultimaMensagem: 'O PC 01 já foi normalizado.',
    horario: 'Ontem',
    naoLidas: 0,
  },
];

export default function ConversasScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={CONVERSAS_EXEMPLO}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.chatCard} 
            onPress={() => navigation.navigate('Chat', { nomeChat: item.nome })}
          >
            <View style={styles.avatarContainer}>
              <Ionicons name="chatbubbles-outline" size={24} color="#005b9f" />
            </View>
            <View style={styles.infoContainer}>
              <View style={styles.topRow}>
                <Text style={styles.chatName}>{item.nome}</Text>
                <Text style={styles.chatTime}>{item.horario}</Text>
              </View>
              <View style={styles.bottomRow}>
                <Text numberOfLines={1} style={styles.lastMessage}>{item.ultimaMensagem}</Text>
                {item.naoLidas > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.naoLidas}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  listContainer: { 
    padding: 16 
  },
  chatCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 10, 
    padding: 16, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#e0e0e0', 
    elevation: 1 
  },
  avatarContainer: { 
    backgroundColor: '#e3f2fd', 
    padding: 12, 
    borderRadius: 25, 
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: { 
    flex: 1 
  },
  topRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 4 
  },
  chatName: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  chatTime: { 
    fontSize: 12, 
    color: '#999' 
  },
  bottomRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  lastMessage: { 
    fontSize: 14, 
    color: '#666', 
    flex: 1, 
    marginRight: 8 
  },
  badge: { 
    backgroundColor: '#005b9f', 
    borderRadius: 10, 
    minWidth: 20, 
    height: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 6 
  },
  badgeText: { 
    color: '#fff', 
    fontSize: 11, 
    fontWeight: 'bold' 
  },
});