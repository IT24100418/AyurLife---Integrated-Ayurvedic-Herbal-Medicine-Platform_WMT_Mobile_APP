import { Tabs } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Home, Stethoscope, ShoppingBag, ClipboardList, BookOpen, User, Users } from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [role, setRole] = useState('patient');
  const tintColor = '#10b981';

  useEffect(() => {
    const getRole = async () => {
      const storedUser = await AsyncStorage.getItem('userInfo');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setRole(user.role || 'patient');
      }
    };
    getRole();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tintColor,
        tabBarInactiveTintColor: '#94a3b8',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '900',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: role === 'doctor' ? 'Appointments' : 'Care',
          tabBarIcon: ({ color }) => role === 'doctor' ? <ClipboardList size={24} color={color} /> : <Stethoscope size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="knowledge"
        options={{
          title: 'Knowledge',
          tabBarIcon: ({ color }) => <BookOpen size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="forum"
        options={{
          title: 'Forum',
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => <ShoppingBag size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: role === 'patient' ? 'Records' : 'Profile',
          tabBarIcon: ({ color }) => role === 'patient' ? <ClipboardList size={24} color={color} /> : <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
