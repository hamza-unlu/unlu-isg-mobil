
// FİRMA BİLGİLERİ EKRANI

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

export default function FirmaBilgileriScreen({ route, navigation }) {
    const { firmaId, firmaAdi } = route.params;
    const [firma, setFirma] = useState(null);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [yenileniyor, setYenileniyor] = useState(false);
    const [hata, setHata] = useState('');

    const verileriYukle = useCallback(async () => {
        try {
            setHata('');
            // Firma listesinden firmayı bul (mevcut endpoint'i kullan)
            const yanit = await api.get('/api/firmalar');
            const liste = yanit.veri || yanit;
            const bulunan = (Array.isArray(liste) ? liste : []).find(
                f => String(f._id || f.id) === String(firmaId)
            );
            if (!bulunan) {
                setHata('Firma bulunamadı');
            } else {
                setFirma(bulunan);
            }
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

    if (hata || !firma) {
        return (
            <SafeAreaView style={styles.container}>
                <UstBar baslik={firmaAdi} navigation={navigation} />
                <View style={styles.merkez}>
                    <Text style={styles.hataYazi}>⚠️ {hata || 'Veri yok'}</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Firma alanlarını topla (web'deki gibi)
    const ad = firma.firmaAdi || firma.adi || 'İsimsiz';
    const yetkili = firma.yetkili || firma.yetkiliAdi || '—';
    const telefon = firma.telefon || firma.yetkiliTelefon || '—';
    const eposta = firma.eposta || firma.email || firma.firmaMail || '—';
    const personelSayisi = firma.personelSayisi || firma.personel || 0;
    const sgkSicil = firma.sgkSicilNo || firma.sgkSicil || '—';
    const adres = firma.adres || '—';
    const naceKodu = firma.naceKodu || firma.nace || '—';
    const faaliyet = firma.faaliyetAlani || firma.anaFaaliyet || '—';
    const tehlikeSinifi = firma.isg?.tehlikeSinifi || firma.tehlikeSinifi;
    const ekleyen = firma.ekleyenKullanici?.adSoyad || '—';

    // Tehlike sınıfı renkleri
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
        <SafeAreaView style={styles.container}>
            <UstBar baslik={ad} navigation={navigation} />

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
                {/* Logo + Ad + Tehlike Rozeti */}
                <View style={styles.basKart}>
                    <Text style={styles.basIkon}>🏢</Text>
                    <Text style={styles.basAd}>{ad}</Text>
                    <View style={[styles.tehlikeRozet, { backgroundColor: tehlikeBg }]}>
                        <Text style={[styles.tehlikeYazi, { color: tehlikeRenk }]}>
                            {tehlikeYazi}
                        </Text>
                    </View>
                </View>

                {/* İletişim Bilgileri */}
                <Bolum baslik="📞 İLETİŞİM" >
                    <Satir etiket="Yetkili" deger={yetkili} />
                    <Satir etiket="Telefon" deger={telefon} />
                    <Satir etiket="E-posta" deger={eposta} />
                </Bolum>

                {/* SGK & Adres */}
                <Bolum baslik="📍 KAYIT BİLGİLERİ">
                    <Satir etiket="SGK Sicil No" deger={sgkSicil} />
                    <Satir etiket="Adres" deger={adres} cokSatir />
                </Bolum>

                {/* Faaliyet */}
                <Bolum baslik="🏷️ FAALİYET">
                    <Satir etiket="NACE Kodu" deger={naceKodu} />
                    <Satir etiket="Ana Faaliyet Alanı" deger={faaliyet} cokSatir />
                </Bolum>

                {/* İSG Bilgileri */}
                <Bolum baslik="⚠️ İSG VERİLERİ">
                    <Satir etiket="Personel Sayısı" deger={String(personelSayisi)} />
                    <Satir etiket="Tehlike Sınıfı" deger={tehlikeYazi} />
                </Bolum>

                {/* Sistem */}
                <Bolum baslik="👤 SİSTEM">
                    <Satir etiket="Ekleyen Kullanıcı" deger={ekleyen} />
                </Bolum>

                {/* Bilgi notu */}
                <View style={styles.notKart}>
                    <Text style={styles.notYazi}>
                        💡 Firma bilgilerini düzenlemek için web arayüzünü kullanın.
                        Belgelere ulaşmak için alt menüden "Dokümanlar" sekmesine geçin.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── ÜST BAR ──────────────────────────────────────────────────────────
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

// ─── BÖLÜM (Başlıklı kart) ────────────────────────────────────────────
function Bolum({ baslik, children }) {
    return (
        <View style={styles.bolum}>
            <Text style={styles.bolumBaslik}>{baslik}</Text>
            <View style={styles.bolumIcerik}>{children}</View>
        </View>
    );
}

// ─── SATIR (etiket + değer) ───────────────────────────────────────────
function Satir({ etiket, deger, cokSatir }) {
    return (
        <View style={styles.satir}>
            <Text style={styles.satirEtiket}>{etiket}</Text>
            <Text
                style={styles.satirDeger}
                numberOfLines={cokSatir ? 0 : 1}
            >
                {deger}
            </Text>
        </View>
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
    },
    icerik: {
        flex: 1,
    },
    basKart: {
        backgroundColor: '#fff',
        margin: 12,
        padding: 24,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    basIkon: {
        fontSize: 56,
        marginBottom: 8,
    },
    basAd: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
        textAlign: 'center',
        marginBottom: 12,
    },
    tehlikeRozet: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 6,
    },
    tehlikeYazi: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    bolum: {
        marginHorizontal: 12,
        marginBottom: 12,
    },
    bolumBaslik: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#64748b',
        letterSpacing: 0.6,
        marginBottom: 6,
        marginLeft: 4,
    },
    bolumIcerik: {
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
    },
    satir: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    satirEtiket: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    satirDeger: {
        fontSize: 14,
        color: '#0f172a',
        fontWeight: '500',
    },
    notKart: {
        backgroundColor: '#eff6ff',
        marginHorizontal: 12,
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#2563eb',
    },
    notYazi: {
        fontSize: 12,
        color: '#1e40af',
        lineHeight: 18,
    },
});