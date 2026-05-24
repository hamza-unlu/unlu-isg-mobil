
// FİRMA KLASÖRLERİ EKRANI (Dokümanlar tab'ı ana sayfası)

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TextInput,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function FirmaKlasorleriScreen({ navigation }) {
    const { kullanici, cikis } = useAuth();
    const [firmalar, setFirmalar] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [yenileniyor, setYenileniyor] = useState(false);
    const [hata, setHata] = useState('');
    const [arama, setArama] = useState('');

    const firmalariYukle = useCallback(async () => {
        try {
            setHata('');
            const yanit = await api.get('/api/firmalar');
            const liste = yanit.veri || yanit;
            setFirmalar(Array.isArray(liste) ? liste : []);
        } catch (err) {
            setHata(err.message || 'Firmalar yüklenemedi');
        } finally {
            setYukleniyor(false);
            setYenileniyor(false);
        }
    }, []);

    useEffect(() => {
        firmalariYukle();
    }, [firmalariYukle]);

    const yenile = useCallback(() => {
        setYenileniyor(true);
        firmalariYukle();
    }, [firmalariYukle]);

    const filtrelenmis = firmalar.filter(f => {
        if (!arama) return true;
        const q = arama.toLocaleLowerCase('tr-TR');
        const ad = (f.firmaAdi || f.adi || '').toLocaleLowerCase('tr-TR');
        return ad.includes(q);
    });

    if (yukleniyor) {
        return (
            <SafeAreaView style={styles.container}>
                <UstBar kullanici={kullanici} cikis={cikis} />
                <View style={styles.merkez}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <UstBar kullanici={kullanici} cikis={cikis} />

            {/* Sayfa başlığı */}
            <View style={styles.sayfaBaslik}>
                <Text style={styles.sayfaBaslikYazi}>📁 Dokümanlar</Text>
                <Text style={styles.sayfaBaslikSayi}>
                    {filtrelenmis.length} firma
                </Text>
            </View>

            

            {/* Arama */}
            <View style={styles.aramaKutusu}>
                <Text style={styles.aramaIkon}>🔍</Text>
                <TextInput
                    style={styles.aramaInput}
                    value={arama}
                    onChangeText={setArama}
                    placeholder="Firma ara..."
                    placeholderTextColor="#94a3b8"
                />
                {arama ? (
                    <TouchableOpacity onPress={() => setArama('')}>
                        <Text style={styles.aramaSil}>✕</Text>
                    </TouchableOpacity>
                ) : null}
            </View>

            {hata ? (
                <View style={styles.hataKart}>
                    <Text style={styles.hataYazi}>⚠️ {hata}</Text>
                </View>
            ) : null}

            {/* Firma klasörü grid */}
            <FlatList
                data={filtrelenmis}
                keyExtractor={(item) => item._id || item.id || item.firmaAdi}
                renderItem={({ item }) => (
                    <FirmaKlasorKart
                        firma={item}
                        onPress={() => {
                            navigation.navigate('DocumentsHub', {
                                firmaId: item._id || item.id,
                                firmaAdi: item.firmaAdi || item.adi,
                            });
                        }}
                    />
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={yenileniyor}
                        onRefresh={yenile}
                        colors={['#2563eb']}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.bosKart}>
                        <Text style={styles.bosIkon}>📁</Text>
                        <Text style={styles.bosBaslik}>
                            {arama ? 'Sonuç bulunamadı' : 'Henüz firma yok'}
                        </Text>
                    </View>
                }
                contentContainerStyle={styles.liste}
            />
        </SafeAreaView>
    );
}

// ─── ÜST BAR ─────────────────────────────────────────────────────────
function UstBar({ kullanici, cikis }) {
    return (
        <View style={styles.ustBar}>
            <View>
                <Text style={styles.ustBarBaslik}>🛡️ ÜNLÜ İSG</Text>
                <Text style={styles.ustBarAltyazi}>
                    {kullanici?.adSoyad || 'Kullanıcı'}
                </Text>
            </View>
            <TouchableOpacity onPress={cikis} style={styles.cikisBtn}>
                <Text style={styles.cikisBtnYazi}>Çıkış</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── FİRMA KLASÖR KARTI ──────────────────────────────────────────────
function FirmaKlasorKart({ firma, onPress }) {
    const ad = firma.firmaAdi || firma.adi || 'İsimsiz';
    const tehlikeSinifi = firma.isg?.tehlikeSinifi || firma.tehlikeSinifi;

    let tehlikeRenk = '#94a3b8';
    let tehlikeBg = '#f1f5f9';
    if (tehlikeSinifi === 'tehlikeli') {
        tehlikeRenk = '#ca8a04';
        tehlikeBg = '#fef3c7';
    } else if (tehlikeSinifi === 'cok_tehlikeli' || tehlikeSinifi === 'çok_tehlikeli') {
        tehlikeRenk = '#dc2626';
        tehlikeBg = '#fee2e2';
    } else if (tehlikeSinifi === 'az_tehlikeli') {
        tehlikeRenk = '#16a34a';
        tehlikeBg = '#dcfce7';
    }

    const tehlikeYazi = {
        'az_tehlikeli':    'AZ TEHLİKELİ',
        'tehlikeli':       'TEHLİKELİ',
        'cok_tehlikeli':   'ÇOK TEHLİKELİ',
        'çok_tehlikeli':   'ÇOK TEHLİKELİ',
    }[tehlikeSinifi] || 'BELİRSİZ';

    return (
        <TouchableOpacity style={styles.klasorKart} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.klasorIkon}>
                <Text style={{ fontSize: 28 }}>📁</Text>
            </View>
            <View style={styles.klasorIcerik}>
                <Text style={styles.klasorAd} numberOfLines={2}>{ad}</Text>
                <View style={[styles.tehlikeRozet, { backgroundColor: tehlikeBg }]}>
                    <Text style={[styles.tehlikeYazi, { color: tehlikeRenk }]}>
                        {tehlikeYazi}
                    </Text>
                </View>
            </View>
            <Text style={styles.okIsareti}>›</Text>
        </TouchableOpacity>
    );
}

// ─── STİLLER ──────────────────────────────────────────────────────────
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
    ustBar: {
        backgroundColor: '#1e3a8a',
        padding: 20,
        paddingTop: 45,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ustBarBaslik: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    ustBarAltyazi: {
        color: '#bfdbfe',
        fontSize: 12,
        marginTop: 2,
    },
    cikisBtn: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    cikisBtnYazi: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
    },
    sayfaBaslik: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    sayfaBaslikYazi: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    sayfaBaslikSayi: {
        fontSize: 13,
        color: '#64748b',
        backgroundColor: '#e2e8f0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    aiNot: {
        backgroundColor: '#1e3a8a',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 14,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    aiIkon: {
        fontSize: 24,
    },
    aiYazi: {
        flex: 1,
        color: '#fff',
        fontSize: 13,
        lineHeight: 18,
    },
    aramaKutusu: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    aramaIkon: {
        fontSize: 14,
        marginRight: 8,
    },
    aramaInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 14,
        color: '#0f172a',
    },
    aramaSil: {
        fontSize: 16,
        color: '#94a3b8',
        padding: 4,
    },
    hataKart: {
        backgroundColor: '#fef2f2',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 12,
        borderRadius: 8,
    },
    hataYazi: {
        color: '#dc2626',
        fontSize: 13,
    },
    liste: {
        paddingHorizontal: 12,
        paddingBottom: 180,
    },
    klasorKart: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    klasorIkon: {
        width: 52,
        height: 52,
        backgroundColor: '#fef3c7',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    klasorIcerik: {
        flex: 1,
    },
    klasorAd: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 6,
    },
    tehlikeRozet: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    tehlikeYazi: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.3,
    },
    okIsareti: {
        fontSize: 24,
        color: '#cbd5e1',
        marginLeft: 8,
    },
    bosKart: {
        margin: 16,
        padding: 32,
        backgroundColor: '#fff',
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    bosIkon: {
        fontSize: 48,
        marginBottom: 8,
    },
    bosBaslik: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#475569',
    },
});