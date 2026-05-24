// ═══════════════════════════════════════════════════════════════════════
// ANA UYGULAMA
// Tab sırası: Anasayfa | Firmalar | Personel | Eğitimler | Dokümanlar
// AI Floating Button her ekranda sağ altta görünür
// ═══════════════════════════════════════════════════════════════════════

import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthProvider, useAuth }    from './src/context/AuthContext';
import LoginScreen                  from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen                   from './src/screens/HomeScreen';
import FirmasScreen                 from './src/screens/FirmasScreen';
import FirmaBilgileriScreen         from './src/screens/FirmaBilgileriScreen';
import FirmaKlasorleriScreen        from './src/screens/FirmaKlasorleriScreen';
import DocumentsHubScreen           from './src/screens/DocumentsHubScreen';
import BelgelerScreen               from './src/screens/BelgelerScreen';
import PersonelScreen               from './src/screens/PersonelScreen';
import EgitimlerScreen              from './src/screens/EgitimlerScreen';
import AIFloatingButton             from './src/components/AIFloatingButton';

const Stack          = createNativeStackNavigator();
const Tab            = createBottomTabNavigator();
const FirmalarStack  = createNativeStackNavigator();
const DocumentsStack = createNativeStackNavigator();


// ─── FİRMALAR STACK ─────────────────────────────────────────────────
function FirmalarStackNavigator() {
    return (
        <FirmalarStack.Navigator screenOptions={{ headerShown: false }}>
            <FirmalarStack.Screen name="FirmasList"     component={FirmasScreen} />
            <FirmalarStack.Screen name="FirmaBilgileri" component={FirmaBilgileriScreen} />
        </FirmalarStack.Navigator>
    );
}

// ─── DOKÜMANLAR STACK ───────────────────────────────────────────────
function DocumentsStackNavigator() {
    return (
        <DocumentsStack.Navigator screenOptions={{ headerShown: false }}>
            <DocumentsStack.Screen name="FirmaKlasorleri" component={FirmaKlasorleriScreen} />
            <DocumentsStack.Screen name="DocumentsHub"    component={DocumentsHubScreen} />
            <DocumentsStack.Screen name="Belgeler"        component={BelgelerScreen} />
        </DocumentsStack.Navigator>
    );
}

// ─── ALT TAB BAR ────────────────────────────────────────────────────
function AnaTabBar() {
    const ikonlar = {
        Home:      '🏠',
        Firmas:    '🏢',
        Personel:  '👥',
        Egitimler: '🎓',
        Documents: '📁',
    };

    const insets = useSafeAreaInsets();
    return (
        <View style={{ flex: 1 }}>
            <Tab.Navigator
                screenOptions={({ route }) => ({
                    headerShown: false,
                    tabBarActiveTintColor:   '#1e3a8a',
                    tabBarInactiveTintColor: '#94a3b8',
                    tabBarStyle: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    height: 60 + insets.bottom,        
    paddingTop: 8,
    paddingBottom: insets.bottom + 8, 
},
                    tabBarLabelStyle: {
                        fontSize: 10,
                        fontWeight: '600',
                        marginBottom: 2,
                    },
                    tabBarIcon: ({ focused }) => (
                        <Text style={{
                            fontSize: focused ? 22 : 20,
                            opacity: focused ? 1 : 0.55,
                        }}>
                            {ikonlar[route.name]}
                        </Text>
                    ),
                })}
            >
                <Tab.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{ tabBarLabel: 'Anasayfa' }}
                />
                <Tab.Screen
                    name="Firmas"
                    component={FirmalarStackNavigator}
                    options={{ tabBarLabel: 'Firmalar' }}
                />
                <Tab.Screen
                    name="Personel"
                    component={PersonelScreen}
                    options={{ tabBarLabel: 'Personel' }}
                />
                <Tab.Screen
                    name="Egitimler"
                    component={EgitimlerScreen}
                    options={{ tabBarLabel: 'Eğitimler' }}
                />
                <Tab.Screen
                    name="Documents"
                    component={DocumentsStackNavigator}
                    options={{ tabBarLabel: 'Dokümanlar' }}
                />
            </Tab.Navigator>

            {/* AI floating button — tüm ekranlarda görünür */}
           {<AIFloatingButton /> }
        </View>
    );
}

// ─── ANA YÖNLENDİRİCİ ───────────────────────────────────────────────
function Yonlendirici() {
    const { girisYapildi, yukleniyor } = useAuth();

    if (yukleniyor) {
        return (
            <View style={styles.yukleniyor}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.yukleniyorYazi}>Yükleniyor...</Text>
            </View>
        );
    }

    return (
        <NavigationContainer>
            {girisYapildi ? (
                <AnaTabBar />
            ) : (
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                </Stack.Navigator>
            )}
        </NavigationContainer>
    );
}

// ─── ANA UYGULAMA ────────────────────────────────────────────────────
export default function App() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <Yonlendirici />
            </AuthProvider>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    yukleniyor: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    yukleniyorYazi: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748b',
    },
});