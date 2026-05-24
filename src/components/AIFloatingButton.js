// ═══════════════════════════════════════════════════════════════════════
// AI FLOATING BUTTON
// ───────────────────────────────────────────────────────────────────────
// Her ekranın sağ altında yüzen 🤖 butonu.
// Tıklayınca tam ekran modal olarak AI sohbet açılır.
// AIChatScreen içeriği buraya taşındı.
// ═══════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Modal, SafeAreaView, FlatList, TextInput,
    KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const ORNEK_SORULAR = [
    { ikon: '🏢', metin: 'Hangi firmalar kayıtlı?' },
    { ikon: '⚠️', metin: 'En çok eksiği olan firma hangisi?' },
    { ikon: '⏰', metin: 'Süresi yaklaşan eğitimler var mı?' },
    { ikon: '🩺', metin: 'Periyodik muayenesi dolan personel?' },
    { ikon: '📋', metin: '6331 sayılı kanunun 13. maddesi nedir?' },
];

const STORAGE_KEY = 'isg_ai_sohbet_gecmis';

export default function AIFloatingButton() {
    const { kullanici } = useAuth();
    const [acik, setAcik]                   = useState(false);
    const [mesajlar, setMesajlar]           = useState([]);
    const [girdi, setGirdi]                 = useState('');
    const [gonderiliyor, setGonderiliyor]   = useState(false);
    const flatListRef = useRef(null);

    useEffect(() => {
        if (acik) gecmisYukle();
    }, [acik, kullanici?._id]);

    async function gecmisYukle() {
        try {
            const ham = await AsyncStorage.getItem(STORAGE_KEY);
            if (!ham) return;
            const obj = JSON.parse(ham);
            const mevcutId = kullanici?._id ? String(kullanici._id) : null;
            if (obj?.kullaniciId !== mevcutId) {
                await AsyncStorage.removeItem(STORAGE_KEY);
                return;
            }
            setMesajlar(Array.isArray(obj.mesajlar) ? obj.mesajlar : []);
        } catch { /* sessiz */ }
    }

    async function gecmisKaydet(liste) {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
                kullaniciId: kullanici?._id ? String(kullanici._id) : null,
                mesajlar: liste.slice(-20),
            }));
        } catch { /* sessiz */ }
    }

    async function gonder(soru = girdi) {
        const temiz = soru.trim();
        if (!temiz || gonderiliyor) return;

        const kullaniciMesaji = { rol: 'kullanici', metin: temiz, saat: saatStr() };
        const yeniListe = [...mesajlar, kullaniciMesaji];
        setMesajlar(yeniListe);
        setGirdi('');
        setGonderiliyor(true);
        scrollEnSona();

        try {
            const yanit = await api.post('/api/ai/sohbet', {
                soru: temiz,
                gecmisMesajlar: mesajlar.map(m => ({ rol: m.rol, metin: m.metin })),
            });
            if (!yanit.basarili) throw new Error(yanit.hata || 'Yanıt alınamadı');
            const asistanMesaji = { rol: 'asistan', metin: yanit.yanit, saat: saatStr() };
            const tam = [...yeniListe, asistanMesaji];
            setMesajlar(tam);
            gecmisKaydet(tam);
            scrollEnSona();
        } catch (err) {
            const hata = { rol: 'asistan', metin: `⚠️ ${err.message || 'Bilinmeyen hata'}`, saat: saatStr() };
            const hataListe = [...yeniListe, hata];
            setMesajlar(hataListe);
            gecmisKaydet(hataListe);
            scrollEnSona();
        } finally {
            setGonderiliyor(false);
        }
    }

    function scrollEnSona() {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }

    function saatStr() {
        const d = new Date();
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }

    function sohbetTemizle() {
        Alert.alert('Sohbeti Temizle', 'Tüm sohbet geçmişini silmek istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Temizle', style: 'destructive', onPress: async () => {
                setMesajlar([]);
                await AsyncStorage.removeItem(STORAGE_KEY);
            }},
        ]);
    }

    return (
        <>
            {/* ── FLOATING BUTON ── */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setAcik(true)}
                activeOpacity={0.85}
            >
                <Text style={styles.fabIkon}>💬</Text>
            </TouchableOpacity>

            {/* ── AI SOHBET MODALI ── */}
            <Modal
                visible={acik}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setAcik(false)}
            >
                <SafeAreaView style={styles.container}>
                    {/* Üst bar */}
                    <View style={styles.ustBar}>
                        <View style={styles.ustBarSol}>
                            <View style={styles.avatar}>
                                <Text style={{ fontSize: 18 }}>🤖</Text>
                            </View>
                            <View>
                                <Text style={styles.ustBarBaslik}>İSG Asistanı</Text>
                                <View style={styles.ustBarAltyaziSatir}>
                                    <View style={styles.onlineNokta} />
                                    <Text style={styles.ustBarAltyazi}>Çevrimiçi · Sistemle bağlı</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.ustBarSag}>
                            {mesajlar.length > 0 && (
                                <TouchableOpacity onPress={sohbetTemizle} style={styles.ustBarBtn}>
                                    <Text style={{ fontSize: 14 }}>🗑️</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => setAcik(false)} style={styles.ustBarBtn}>
                                <Text style={styles.kapat}>✕ Kapat</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                    >
                        {mesajlar.length === 0 ? (
                            <ScrollView contentContainerStyle={styles.hosgeldinKonteyner}>
                                <HosgeldinKart onOrnekSec={gonder} />
                            </ScrollView>
                        ) : (
                            <FlatList
                                ref={flatListRef}
                                data={mesajlar}
                                keyExtractor={(_, idx) => `msg-${idx}`}
                                renderItem={({ item }) => <MesajBalonu mesaj={item} />}
                                contentContainerStyle={styles.mesajListe}
                                onContentSizeChange={() =>
                                    flatListRef.current?.scrollToEnd({ animated: false })
                                }
                                ListFooterComponent={gonderiliyor ? <YaziyorGosterge /> : null}
                            />
                        )}

                        {/* Girdi */}
                        <View style={styles.girdiAlan}>
                            <TextInput
                                style={styles.girdiInput}
                                value={girdi}
                                onChangeText={setGirdi}
                                placeholder="Sorunuzu yazın..."
                                placeholderTextColor="#94a3b8"
                                multiline
                                maxLength={1000}
                                editable={!gonderiliyor}
                                autoCorrect={false}
                            />
                            <TouchableOpacity
                                style={[styles.gonderBtn, (!girdi.trim() || gonderiliyor) && { opacity: 0.4 }]}
                                onPress={() => gonder()}
                                disabled={!girdi.trim() || gonderiliyor}
                            >
                                <Text style={styles.gonderBtnYazi}>➤</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>
        </>
    );
}

// ─── HOŞGELDİN ───────────────────────────────────────────────────────
function HosgeldinKart({ onOrnekSec }) {
    return (
        <View>
            <View style={styles.hosgeldin}>
                <Text style={styles.hosgeldinIkon}>🛡️</Text>
                <Text style={styles.hosgeldinBaslik}>Merhaba! Ben İSG Asistanınızım</Text>
                <Text style={styles.hosgeldinAciklama}>
                    Sisteminize bağlıyım. Firma, personel, eğitim ve İSG mevzuatını sorgulayabilirsiniz.
                </Text>
            </View>
            <Text style={styles.ornekBaslik}>💡 ÖRNEK SORULAR</Text>
            {ORNEK_SORULAR.map((s, idx) => (
                <TouchableOpacity key={idx} style={styles.ornekSoru} onPress={() => onOrnekSec(s.metin)} activeOpacity={0.7}>
                    <Text style={styles.ornekIkon}>{s.ikon}</Text>
                    <Text style={styles.ornekYazi}>{s.metin}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

// ─── MESAJ BALONU ────────────────────────────────────────────────────
function MesajBalonu({ mesaj }) {
    const isKullanici = mesaj.rol === 'kullanici';
    return (
        <View style={[styles.mesajSatir, isKullanici && styles.mesajSatirSag]}>
            <View style={[styles.mesajAvatar, isKullanici && styles.mesajAvatarKullanici]}>
                <Text style={{ fontSize: 14 }}>{isKullanici ? '👤' : '🤖'}</Text>
            </View>
            <View style={[styles.mesajIcerik, isKullanici && styles.mesajIcerikSag]}>
                <View style={[styles.balon, isKullanici ? styles.balonKullanici : styles.balonAsistan]}>
                    <MarkdownText metin={mesaj.metin} isKullanici={isKullanici} />
                </View>
                {mesaj.saat && (
                    <Text style={[styles.zamanYazi, isKullanici && styles.zamanYaziSag]}>{mesaj.saat}</Text>
                )}
            </View>
        </View>
    );
}

// ─── MARKDOWN PARSER ─────────────────────────────────────────────────
function MarkdownText({ metin, isKullanici }) {
    const yaziRenk = isKullanici ? '#fff' : '#1e293b';
    const boldRenk = isKullanici ? '#fff' : '#0a2664';
    return (
        <View>
            {String(metin || '').split('\n').map((satir, idx) => {
                if (!satir.trim()) return <View key={idx} style={{ height: 6 }} />;
                if (satir.startsWith('### ')) return <Text key={idx} style={[styles.h3, { color: boldRenk }]}>{parseInline(satir.substring(4), yaziRenk, boldRenk)}</Text>;
                if (satir.startsWith('## '))  return <Text key={idx} style={[styles.h2, { color: boldRenk }]}>{parseInline(satir.substring(3), yaziRenk, boldRenk)}</Text>;
                if (satir.startsWith('# '))   return <Text key={idx} style={[styles.h1, { color: boldRenk }]}>{parseInline(satir.substring(2), yaziRenk, boldRenk)}</Text>;
                const liste = satir.match(/^(\s*)([-•*])\s+(.+)/);
                if (liste) return (
                    <View key={idx} style={styles.listeSatir}>
                        <Text style={[styles.listeNokta, { color: yaziRenk }]}>•</Text>
                        <Text style={[styles.listeMetin, { color: yaziRenk }]}>{parseInline(liste[3], yaziRenk, boldRenk)}</Text>
                    </View>
                );
                return <Text key={idx} style={[styles.normalMetin, { color: yaziRenk }]}>{parseInline(satir, yaziRenk, boldRenk)}</Text>;
            })}
        </View>
    );
}

function parseInline(satir, yaziRenk, boldRenk) {
    const parts = []; let kalan = String(satir); let key = 0;
    while (kalan.length > 0) {
        const m = kalan.match(/\*\*([^*]+)\*\*/);
        if (!m) { parts.push(<Text key={key++}>{kalan}</Text>); break; }
        if (m.index > 0) parts.push(<Text key={key++}>{kalan.substring(0, m.index)}</Text>);
        parts.push(<Text key={key++} style={{ fontWeight: '700', color: boldRenk }}>{m[1]}</Text>);
        kalan = kalan.substring(m.index + m[0].length);
    }
    return parts;
}

// ─── YAZIYOR GÖSTERGESİ ──────────────────────────────────────────────
function YaziyorGosterge() {
    const [nokta, setNokta] = useState(0);
    useEffect(() => {
        const i = setInterval(() => setNokta(n => (n + 1) % 4), 400);
        return () => clearInterval(i);
    }, []);
    return (
        <View style={styles.mesajSatir}>
            <View style={styles.mesajAvatar}><Text style={{ fontSize: 14 }}>🤖</Text></View>
            <View style={styles.yaziyorBalon}>
                <Text style={styles.yaziyorYazi}>Analiz ediliyor{'.'.repeat(nokta)}</Text>
            </View>
        </View>
    );
}

// ─── STİLLER ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // FAB
    fab: {
        position: 'absolute',
        right: 18,
        bottom: 120,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: '#1a3a8f',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2.5,
        borderColor: '#fff',
        shadowColor: '#0a2664',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 12,
        zIndex: 999,
    },
    fabIkon: { fontSize: 26 },

    // Modal
    container: { flex: 1, backgroundColor: '#f0f4ff' },
    ustBar: {
        backgroundColor: '#0a2664', paddingTop: 45, paddingBottom: 14,
        paddingHorizontal: 16, flexDirection: 'row',
        justifyContent: 'space-between', alignItems: 'center',
    },
    ustBarSol:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar:            { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    ustBarBaslik:      { color: '#fff', fontSize: 15, fontWeight: '700' },
    ustBarAltyaziSatir:{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
    onlineNokta:       { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' },
    ustBarAltyazi:     { color: '#bfdbfe', fontSize: 11 },
    ustBarSag:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ustBarBtn:         { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)' },
    kapat:             { color: '#fff', fontSize: 12, fontWeight: '600' },

    // Hoşgeldin
    hosgeldinKonteyner: { padding: 16 },
    hosgeldin:          { backgroundColor: '#fff', padding: 24, borderRadius: 14, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#dbeafe' },
    hosgeldinIkon:      { fontSize: 44, marginBottom: 10 },
    hosgeldinBaslik:    { fontSize: 17, fontWeight: '700', color: '#0a2664', marginBottom: 8, textAlign: 'center' },
    hosgeldinAciklama:  { fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 19 },
    ornekBaslik:        { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
    ornekSoru:          { backgroundColor: '#fff', padding: 13, borderRadius: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#dbeafe' },
    ornekIkon:          { fontSize: 16 },
    ornekYazi:          { flex: 1, fontSize: 13, color: '#1d4ed8', fontWeight: '500' },

    // Mesajlar
    mesajListe:         { padding: 12, paddingBottom: 8 },
    mesajSatir:         { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end', gap: 8 },
    mesajSatirSag:      { flexDirection: 'row-reverse' },
    mesajAvatar:        { width: 30, height: 30, borderRadius: 15, backgroundColor: '#1e3a8a', justifyContent: 'center', alignItems: 'center' },
    mesajAvatarKullanici:{ backgroundColor: '#2563eb' },
    mesajIcerik:        { maxWidth: '80%' },
    mesajIcerikSag:     { alignItems: 'flex-end' },
    balon:              { padding: 11, paddingHorizontal: 14, borderRadius: 16 },
    balonKullanici:     { backgroundColor: '#0a2664', borderBottomRightRadius: 4 },
    balonAsistan:       { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#dbeafe' },
    zamanYazi:          { fontSize: 10, color: '#94a3b8', marginTop: 3, marginLeft: 4 },
    zamanYaziSag:       { marginRight: 4, marginLeft: 0 },

    // Markdown
    normalMetin: { fontSize: 13.5, lineHeight: 20 },
    h1:          { fontSize: 15, fontWeight: '700', marginVertical: 4 },
    h2:          { fontSize: 14.5, fontWeight: '700', marginVertical: 3 },
    h3:          { fontSize: 14, fontWeight: '700', marginVertical: 3 },
    listeSatir:  { flexDirection: 'row', marginVertical: 2, paddingLeft: 4 },
    listeNokta:  { fontSize: 13.5, marginRight: 7, lineHeight: 20 },
    listeMetin:  { flex: 1, fontSize: 13.5, lineHeight: 20 },

    // Yazıyor
    yaziyorBalon: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#dbeafe' },
    yaziyorYazi:  { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },

    // Girdi
    girdiAlan:   { flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0', gap: 8, alignItems: 'flex-end' },
    girdiInput:  { flex: 1, backgroundColor: '#f8faff', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#1e293b', maxHeight: 100, borderWidth: 1.5, borderColor: '#dbeafe' },
    gonderBtn:   { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0a2664', justifyContent: 'center', alignItems: 'center' },
    gonderBtnYazi:{ color: '#fff', fontSize: 18 },
});