// ═══════════════════════════════════════════════════════════════════════
// ANASAYFA EKRANI
// ───────────────────────────────────────────────────────────────────────
// Kullanıcının yetkili olduğu firmalardaki kritik dokümanları gösterir.
// Backend'in /api/dokumanlar/mobil-anasayfa endpoint'inden veri çeker.
// ═══════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
    RefreshControl, Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import ProfilModal from '../components/ProfilModal';
import { API_BASE_URL } from '../config/api';


export default function HomeScreen() {
    const { kullanici, cikis } = useAuth();
    const [veri, setVeri] = useState(null);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [yenileniyor, setYenileniyor] = useState(false);
    const [hata, setHata] = useState('');
    const [profilAcik, setProfilAcik] = useState(false);

    // Verileri backend'den çek
    const verileriYukle = useCallback(async () => {
        try {
            setHata('');
            const yanit = await api.get('/api/dokumanlar/mobil-anasayfa');
            setVeri(yanit);
        } catch (err) {
            setHata(err.message || 'Veriler yüklenemedi');
        } finally {
            setYukleniyor(false);
            setYenileniyor(false);
        }
    }, []);

    useEffect(() => {
        verileriYukle();
    }, [verileriYukle]);

    // Pull-to-refresh için
    const yenile = useCallback(() => {
        setYenileniyor(true);
        verileriYukle();
    }, [verileriYukle]);

    // İlk yükleme ekranı
    if (yukleniyor) {
        return (
            <SafeAreaView style={styles.container}>
                <UstBar kullanici={kullanici} cikis={cikis} onProfil={() => setProfilAcik(true)} />
                <View style={styles.merkez}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.yukleniyorYazi}>Yükleniyor...</Text>
                </View>
                <ProfilModal acik={profilAcik} kapat={() => setProfilAcik(false)} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <UstBar kullanici={kullanici} cikis={cikis} onProfil={() => setProfilAcik(true)} />

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
                

                {/* Hata varsa göster */}
                {hata ? (
                    <View style={styles.hataKart}>
                        <Text style={styles.hataYazi}>⚠️ {hata}</Text>
                    </View>
                ) : null}

                {/* Özet kartları */}
                {veri?.ozet && (
                    <View style={styles.ozetSatir}>
                        <OzetKart
                            renk="#dc2626"
                            ikon="🔴"
                            sayi={veri.ozet.kritikSayisi}
                            etiket="Kritik"
                        />
                        <OzetKart
                            renk="#d97706"
                            ikon="🟠"
                            sayi={veri.ozet.uyariSayisi}
                            etiket="Uyarı"
                        />
                        <OzetKart
                            renk="#2563eb"
                            ikon="📚"
                            sayi={veri.ozet.egitimSayisi}
                            etiket="Eğitim"
                        />
                    </View>
                )}

                {/* Kritik dokümanlar */}
                {veri?.kritik && veri.kritik.length > 0 && (
                    <Bolum
                        baslik={`🔴 KRİTİK (${veri.kritik.length})`}
                        renk="#dc2626"
                    >
                        {veri.kritik.map((item, idx) => (
                            <DokumanSatir key={`k${idx}`} item={item} kritik={true} />
                        ))}
                    </Bolum>
                )}

                {/* Uyarı dokümanlar */}
                {veri?.uyari && veri.uyari.length > 0 && (
                    <Bolum
                        baslik={`🟠 UYARI (${veri.uyari.length})`}
                        renk="#d97706"
                    >
                        {veri.uyari.map((item, idx) => (
                            <DokumanSatir key={`u${idx}`} item={item} kritik={false} />
                        ))}
                    </Bolum>
                )}

                {/* Yaklaşan eğitimler */}
                {veri?.egitimler && veri.egitimler.length > 0 && (
                    <Bolum
                        baslik={`📚 YAKLAŞAN EĞİTİMLER (${veri.egitimler.length})`}
                        renk="#2563eb"
                    >
                        {veri.egitimler.map((e, idx) => (
                            <EgitimSatir key={`e${idx}`} egitim={e} />
                        ))}
                    </Bolum>
                )}

                {/* Hiçbir uyarı yoksa */}
                {veri?.ozet?.kritikSayisi === 0 &&
                 veri?.ozet?.uyariSayisi === 0 &&
                 veri?.ozet?.egitimSayisi === 0 && (
                    <View style={styles.bosKart}>
                        <Text style={styles.bosIkon}>✅</Text>
                        <Text style={styles.bosBaslik}>Her şey güncel</Text>
                        <Text style={styles.bosAciklama}>
                            30 gün içinde geçerlilik süresi dolacak doküman yok.
                        </Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <ProfilModal acik={profilAcik} kapat={() => setProfilAcik(false)} />
        </SafeAreaView>
    );
}

// ─── ÜST BAR ─────────────────────────────────────────────────────────
// ─── ÜST BAR ─────────────────────────────────────────────────────────
function UstBar({ kullanici, cikis, onProfil }) {
    const basHarfler = (kullanici?.adSoyad || '')
        .split(' ').filter(Boolean).map(p => p[0]).join('').substring(0, 2).toUpperCase();
    const fotoVar = !!kullanici?.profilFoto;

    return (
        <View style={styles.ustBar}>
            <View style={styles.ustBarSol}>
                <TouchableOpacity onPress={onProfil} style={styles.avatarKucuk} activeOpacity={0.7}>
                    {fotoVar
                        ? <Image source={{ uri: `${API_BASE_URL}${kullanici.profilFoto}?t=${Date.now()}` }} style={styles.avatarKucukResim} />
                        : <Text style={styles.avatarKucukHarf}>{basHarfler || '?'}</Text>}
                </TouchableOpacity>
                <View>
                    <Text style={styles.ustBarBaslik}>🛡️ ÜNLÜ İSG</Text>
                    <Text style={styles.ustBarAltyazi}>{kullanici?.adSoyad || 'Kullanıcı'}</Text>
                </View>
            </View>
            <TouchableOpacity onPress={cikis} style={styles.cikisBtn}>
                <Text style={styles.cikisBtnYazi}>Çıkış</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── ÖZET KART ───────────────────────────────────────────────────────
function OzetKart({ renk, ikon, sayi, etiket }) {
    return (
        <View style={[styles.ozetKart, { borderLeftColor: renk }]}>
            <Text style={styles.ozetIkon}>{ikon}</Text>
            <Text style={[styles.ozetSayi, { color: renk }]}>{sayi}</Text>
            <Text style={styles.ozetEtiket}>{etiket}</Text>
        </View>
    );
}

// ─── BÖLÜM (kritik / uyarı / eğitimler) ─────────────────────────────
function Bolum({ baslik, renk, children }) {
    return (
        <View style={styles.bolum}>
            <View style={[styles.bolumBaslikBar, { backgroundColor: renk }]}>
                <Text style={styles.bolumBaslik}>{baslik}</Text>
            </View>
            <View style={styles.bolumIcerik}>{children}</View>
        </View>
    );
}

// ─── DOKÜMAN SATIRI ──────────────────────────────────────────────────
function DokumanSatir({ item, kritik }) {
    const tarihGorsel = formatTarih(item.tarih);
    const durumYazi = item.gun <= 0 ? 'SÜRESİ DOLDU' : `${item.gun} Gün`;

    return (
        <View style={styles.satir}>
            <View style={styles.satirSol}>
                <Text style={styles.satirAd}>{item.ad}</Text>
                <Text style={styles.satirFirma}>{item.firma}</Text>
                <View style={styles.satirAlt}>
                    <Text style={styles.satirKategori}>{item.kategori}</Text>
                    <Text style={styles.satirTarih}>{tarihGorsel}</Text>
                </View>
            </View>
            <View style={[
                styles.satirRozet,
                { backgroundColor: kritik ? '#fee2e2' : '#fed7aa' }
            ]}>
                <Text style={[
                    styles.satirRozetYazi,
                    { color: kritik ? '#dc2626' : '#c2410c' }
                ]}>
                    {durumYazi}
                </Text>
            </View>
        </View>
    );
}

// ─── EĞİTİM SATIRI ───────────────────────────────────────────────────
function EgitimSatir({ egitim }) {
    return (
        <View style={styles.satir}>
            <View style={styles.satirSol}>
                <Text style={styles.satirAd}>{egitim.ad}</Text>
                <Text style={styles.satirFirma}>{egitim.firma}</Text>
                <Text style={styles.satirTarih}>
                    📅 {formatTarih(egitim.tarih)}
                </Text>
            </View>
            <View style={[styles.satirRozet, { backgroundColor: '#dbeafe' }]}>
                <Text style={[styles.satirRozetYazi, { color: '#1e3a8a' }]}>
                    {egitim.gun} Gün
                </Text>
            </View>
        </View>
    );
}

// ─── YARDIMCI: Tarih formatla (2026-04-25 → 25.04.2026) ──────────────
function formatTarih(tarihStr) {
    if (!tarihStr) return '—';
    try {
        const d = new Date(tarihStr);
        const gun = String(d.getDate()).padStart(2, '0');
        const ay  = String(d.getMonth() + 1).padStart(2, '0');
        const yil = d.getFullYear();
        return `${gun}.${ay}.${yil}`;
    } catch {
        return tarihStr;
    }
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
    yukleniyorYazi: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748b',
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
    ustBarSol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarKucuk: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
        overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    },
    avatarKucukResim: { width: '100%', height: '100%' },
    avatarKucukHarf: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
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
    icerik: {
        flex: 1,
    },
    hataKart: {
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
        borderWidth: 1,
        margin: 16,
        padding: 16,
        borderRadius: 8,
    },
    hataYazi: {
        color: '#dc2626',
        fontSize: 13,
    },
    ozetSatir: {
        flexDirection: 'row',
        padding: 12,
        gap: 8,
    },
    ozetKart: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 10,
        borderLeftWidth: 4,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    ozetIkon: {
        fontSize: 18,
        marginBottom: 4,
    },
    ozetSayi: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    ozetEtiket: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
    },
    bolum: {
        marginHorizontal: 12,
        marginBottom: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    bolumBaslikBar: {
        padding: 12,
    },
    bolumBaslik: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    bolumIcerik: {
        padding: 4,
    },
    satir: {
        flexDirection: 'row',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        alignItems: 'center',
    },
    satirSol: {
        flex: 1,
    },
    satirAd: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 2,
    },
    satirFirma: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 4,
    },
    satirAlt: {
        flexDirection: 'row',
        gap: 8,
    },
    satirKategori: {
        fontSize: 11,
        color: '#1e3a8a',
        backgroundColor: '#dbeafe',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    satirTarih: {
        fontSize: 11,
        color: '#94a3b8',
    },
    satirRozet: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        marginLeft: 8,
    },
    satirRozetYazi: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    bosKart: {
        margin: 16,
        padding: 32,
        backgroundColor: '#f0fdf4',
        borderRadius: 12,
        alignItems: 'center',
    },
    bosIkon: {
        fontSize: 48,
        marginBottom: 8,
    },
    bosBaslik: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#15803d',
        marginBottom: 4,
    },
    bosAciklama: {
        fontSize: 13,
        color: '#16a34a',
        textAlign: 'center',
    },
});