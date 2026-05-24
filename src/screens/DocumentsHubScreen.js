// FİRMA DETAY EKRANI

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { api } from '../services/api';


export default function DocumentsHubScreen({ route, navigation }) {
    const { firmaId, firmaAdi } = route.params;
    const [veri, setVeri] = useState(null);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [yenileniyor, setYenileniyor] = useState(false);
    const [hata, setHata] = useState('');

    const verileriYukle = useCallback(async () => {
        try {
            setHata('');
            const yanit = await api.get(`/api/dokumanlar/mobil-firma-detay/${firmaId}`);
            setVeri(yanit);
        } catch (err) {
            setHata(err.message || 'Yüklenemedi');
        } finally {
            setYukleniyor(false);
            setYenileniyor(false);
        }
    }, [firmaId]);

    useEffect(() => {
        verileriYukle();
    }, [verileriYukle]);

    const yenile = useCallback(() => {
        setYenileniyor(true);
        verileriYukle();
    }, [verileriYukle]);

    if (yukleniyor) {
        return (
            <SafeAreaView style={styles.container}>
                <UstBar baslik={firmaAdi} navigation={navigation} />
                <View style={styles.merkez}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            </SafeAreaView>
        );
    }

    if (hata) {
        return (
            <SafeAreaView style={styles.container}>
                <UstBar baslik={firmaAdi} navigation={navigation} />
                <View style={styles.merkez}>
                    <Text style={styles.hataYazi}>⚠️ {hata}</Text>
                </View>
            </SafeAreaView>
        );
    }

    const { firma, kategoriler, toplamBelge } = veri;

    return (
        <SafeAreaView style={styles.container}>
            <UstBar baslik={firma.firmaAdi} navigation={navigation} />

            <ScrollView
                style={styles.icerik}
                refreshControl={
                    <RefreshControl
                        refreshing={yenileniyor}
                        onRefresh={yenile}
                        colors={['#2563eb']}
                    />
                }
            >
                {/* Firma bilgi kartı */}
                <View style={styles.firmaKart}>
                    <Text style={styles.firmaIkon}>🏢</Text>
                    <Text style={styles.firmaAd}>{firma.firmaAdi}</Text>
                    <View style={styles.firmaSatir}>
                        <View style={styles.firmaIstatistik}>
                            <Text style={styles.firmaIstatistikSayi}>
                                {toplamBelge}
                            </Text>
                            <Text style={styles.firmaIstatistikEtiket}>
                                Toplam Belge
                            </Text>
                        </View>
                        <View style={styles.firmaIstatistik}>
                            <Text style={styles.firmaIstatistikSayi}>
                                {kategoriler.length}
                            </Text>
                            <Text style={styles.firmaIstatistikEtiket}>
                                Kategori
                            </Text>
                        </View>
                    </View>
                </View>

               

                {/* Kategori grid */}
                <View style={styles.grid}>
                    {kategoriler.map((kat) => (
                        <KategoriKart
                            key={kat.kod}
                            kategori={kat}
                            onPress={() => {
                                navigation.navigate('Belgeler', {
                                    firmaId,
                                    firmaAdi: firma.firmaAdi,
                                    kategori: kat.kod,
                                    kategoriAd: kat.ad,
                                    kategoriIkon: kat.ikon,
                                });
                            }}
                        />
                    ))}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── ÜST BAR (Geri butonu ile) ───────────────────────────────────────
function UstBar({ baslik, navigation }) {
    return (
        <View style={styles.ustBar}>
            <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.geriBtn}
            >
                <Text style={styles.geriBtnYazi}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.ustBarBaslik} numberOfLines={1}>
                {baslik}
            </Text>
            <View style={{ width: 40 }} />
        </View>
    );
}

// ─── KATEGORİ KARTI ──────────────────────────────────────────────────
function KategoriKart({ kategori, onPress }) {
    return (
        <TouchableOpacity
            style={styles.kategoriKart}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={styles.kategoriIkon}>{kategori.ikon}</Text>
            <Text style={styles.kategoriAd} numberOfLines={2}>
                {kategori.ad}
            </Text>
            <Text style={styles.kategoriSayi}>
                {kategori.sayi} belge
            </Text>
        </TouchableOpacity>
    );
}

// ─── STİLLER ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    merkez: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hataYazi: {
        fontSize: 14,
        color: '#dc2626',
        padding: 20,
        textAlign: 'center',
    },
    ustBar: {
        backgroundColor: '#1e3a8a',
        padding: 16,
        paddingTop: 45,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    geriBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    geriBtnYazi: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '300',
    },
    ustBarBaslik: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginHorizontal: 8,
    },
    icerik: {
        flex: 1,
    },
    firmaKart: {
        backgroundColor: '#fff',
        margin: 12,
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    firmaIkon: {
        fontSize: 48,
        marginBottom: 8,
    },
    firmaAd: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
        textAlign: 'center',
        marginBottom: 16,
    },
    firmaSatir: {
        flexDirection: 'row',
        gap: 24,
    },
    firmaIstatistik: {
        alignItems: 'center',
    },
    firmaIstatistikSayi: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e3a8a',
    },
    firmaIstatistikEtiket: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
    },
    notKart: {
        backgroundColor: '#eff6ff',
        marginHorizontal: 12,
        marginBottom: 12,
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#2563eb',
    },
    notYazi: {
        fontSize: 12,
        color: '#1e40af',
        lineHeight: 17,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 8,
        gap: 8,
    },
    kategoriKart: {
        width: '48%',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        position: 'relative',
        minHeight: 130,
        justifyContent: 'center',
    },
    kategoriIkon: {
        fontSize: 38,
        marginBottom: 8,
    },
    kategoriAd: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0f172a',
        textAlign: 'center',
        marginBottom: 4,
    },
    kategoriSayi: {
        fontSize: 12,
        color: '#64748b',
    },
});