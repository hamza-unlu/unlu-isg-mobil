// ═══════════════════════════════════════════════════════════════════════
// PROFİL MODALI — Foto yükle/sil + Şifre değiştir (web profil.js karşılığı)
// ═══════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView,
    TextInput, ScrollView, Image, ActivityIndicator, Alert,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { API_BASE_URL } from '../config/api';
import { tokenAl } from '../services/storage';

const ROL_ETIKETLERI = {
    sistem_yoneticisi: 'Sistem Yöneticisi',
    isg_uzmani:        'İş Güvenliği Uzmanı',
    isyeri_hekimi:     'İşyeri Hekimi',
    isveren:           'İşveren / Firma Yöneticisi',
    izleyici:          'İzleyici',
};

// Foto yolunu tam URL'e çevir (/uploads/.. → http://10.0.2.2:5500/uploads/..)
function fotoUrl(yol) {
    if (!yol) return null;
    if (yol.startsWith('http')) return yol;
    return `${API_BASE_URL}${yol}?t=${Date.now()}`;
}

export default function ProfilModal({ acik, kapat }) {
    const { kullanici, kullaniciGuncelle } = useAuth();
    const [sekme, setSekme] = useState('foto');

    // Foto state
    const [secilenFoto, setSecilenFoto] = useState(null); // { uri, name, type }
    const [fotoYukleniyor, setFotoYukleniyor] = useState(false);
    const [fotoMesaj, setFotoMesaj] = useState(null);     // { tip, metin }

    // Şifre state
    const [mevcutSifre, setMevcutSifre]   = useState('');
    const [yeniSifre, setYeniSifre]       = useState('');
    const [yeniTekrar, setYeniTekrar]     = useState('');
    const [goster, setGoster]             = useState({ m: false, y: false, t: false });
    const [sifreYukleniyor, setSifreYukleniyor] = useState(false);
    const [sifreMesaj, setSifreMesaj]     = useState(null);

    const basHarfler = (kullanici?.adSoyad || '')
        .split(' ').filter(Boolean).map(p => p[0]).join('').substring(0, 2).toUpperCase();

    // ─── Modal açılınca sıfırla ───
    function herSeyiSifirla() {
        setSecilenFoto(null);
        setFotoMesaj(null);
        setMevcutSifre(''); setYeniSifre(''); setYeniTekrar('');
        setSifreMesaj(null);
        setSekme('foto');
    }

    function kapatVeTemizle() {
        herSeyiSifirla();
        kapat();
    }

    // ─── Galeri'den foto seç ───
    async function fotoSec() {
        setFotoMesaj(null);
        const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!izin.granted) {
            setFotoMesaj({ tip: 'hata', metin: 'Galeriye erişim izni gerekli.' });
            return;
        }
        const sonuc = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (sonuc.canceled || !sonuc.assets?.[0]) return;

        const asset = sonuc.assets[0];
        // Boyut kontrolü (2 MB)
        if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
            setFotoMesaj({ tip: 'hata', metin: 'Dosya boyutu 2 MB değerini aşamaz.' });
            return;
        }
        const uzanti = asset.uri.split('.').pop().toLowerCase();
        const tip = uzanti === 'png' ? 'image/png'
                  : uzanti === 'webp' ? 'image/webp' : 'image/jpeg';
        setSecilenFoto({
            uri: asset.uri,
            name: `profil.${uzanti === 'png' ? 'png' : uzanti === 'webp' ? 'webp' : 'jpg'}`,
            type: tip,
        });
    }

    // ─── Foto yükle (FormData — api.post DEĞİL, manuel fetch) ───
    async function fotoYukle() {
        if (!secilenFoto) return;
        setFotoYukleniyor(true);
        setFotoMesaj(null);
        try {
            const formData = new FormData();
            formData.append('profilFoto', {
                uri: secilenFoto.uri,
                name: secilenFoto.name,
                type: secilenFoto.type,
            });

            const token = await tokenAl();
            const res = await fetch(`${API_BASE_URL}/api/auth/profil-foto`, {
                method: 'POST',
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    // Content-Type YOK — RN otomatik boundary ayarlar
                },
                body: formData,
            });
            const data = await res.json();
            if (!res.ok || !data.basarili) {
                throw new Error(data.hata || data.mesaj || 'Yükleme başarısız.');
            }

            await kullaniciGuncelle({ profilFoto: data.profilFoto });
            setSecilenFoto(null);
            setFotoMesaj({ tip: 'basari', metin: '✓ Profil fotoğrafınız güncellendi.' });
        } catch (err) {
            setFotoMesaj({ tip: 'hata', metin: err.message || 'Yükleme sırasında hata oluştu.' });
        } finally {
            setFotoYukleniyor(false);
        }
    }

    // ─── Foto sil ───
    function fotoSil() {
        Alert.alert('Fotoğrafı Kaldır', 'Profil fotoğrafınızı kaldırmak istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Kaldır', style: 'destructive', onPress: async () => {
                setFotoYukleniyor(true);
                setFotoMesaj(null);
                try {
                    await api.delete('/api/auth/profil-foto');
                    await kullaniciGuncelle({ profilFoto: null });
                    setFotoMesaj({ tip: 'basari', metin: '✓ Profil fotoğrafı kaldırıldı.' });
                } catch (err) {
                    setFotoMesaj({ tip: 'hata', metin: err.message || 'Silme sırasında hata oluştu.' });
                } finally {
                    setFotoYukleniyor(false);
                }
            }},
        ]);
    }

    // ─── Şifre güç hesapla ───
    function sifreGuc() {
        let p = 0;
        if (yeniSifre.length >= 6)  p++;
        if (yeniSifre.length >= 10) p++;
        if (/[A-Z]/.test(yeniSifre)) p++;
        if (/[0-9]/.test(yeniSifre)) p++;
        if (/[^A-Za-z0-9]/.test(yeniSifre)) p++;
        const seviye = [
            { y: 'Şifre giriniz', r: '#94a3b8', g: 0 },
            { y: 'Zayıf',  r: '#dc2626', g: 25 },
            { y: 'Orta',   r: '#d97706', g: 50 },
            { y: 'İyi',    r: '#ca8a04', g: 75 },
            { y: 'Güçlü',  r: '#16a34a', g: 90 },
            { y: 'Çok Güçlü', r: '#16a34a', g: 100 },
        ];
        return yeniSifre.length === 0 ? seviye[0] : (seviye[p] || seviye[0]);
    }

    // ─── Şifre değiştir ───
    async function sifreDegistir() {
        setSifreMesaj(null);
        if (!mevcutSifre || !yeniSifre || !yeniTekrar) {
            return setSifreMesaj({ tip: 'hata', metin: 'Tüm alanları doldurunuz.' });
        }
        if (yeniSifre !== yeniTekrar) {
            return setSifreMesaj({ tip: 'hata', metin: 'Yeni şifreler birbirini tutmuyor.' });
        }
        if (yeniSifre.length < 6) {
            return setSifreMesaj({ tip: 'hata', metin: 'Yeni şifre en az 6 karakter olmalıdır.' });
        }
        setSifreYukleniyor(true);
        try {
            const yanit = await api.post('/api/auth/sifre-degistir', {
                mevcutSifre, yeniSifre, yeniSifreTekrar: yeniTekrar,
            });
            if (!yanit.basarili) throw new Error(yanit.hata || 'Şifre değiştirilemedi.');
            setSifreMesaj({ tip: 'basari', metin: '✓ Şifreniz başarıyla değiştirildi.' });
            setMevcutSifre(''); setYeniSifre(''); setYeniTekrar('');
            setTimeout(() => kapatVeTemizle(), 1500);
        } catch (err) {
            setSifreMesaj({ tip: 'hata', metin: err.message || 'Şifre değiştirilemedi.' });
        } finally {
            setSifreYukleniyor(false);
        }
    }

    const onizleme = secilenFoto?.uri || fotoUrl(kullanici?.profilFoto);
    const guc = sifreGuc();
    const eslesme = yeniTekrar.length > 0 ? (yeniSifre === yeniTekrar) : null;

    return (
        <Modal visible={acik} animationType="slide" presentationStyle="pageSheet" onRequestClose={kapatVeTemizle}>
            <SafeAreaView style={styles.container}>
                {/* Üst bar */}
                <View style={styles.ustBar}>
                    <Text style={styles.ustBarBaslik}>👤 Profil Bilgilerim</Text>
                    <TouchableOpacity onPress={kapatVeTemizle} style={styles.kapatBtn}>
                        <Text style={styles.kapatYazi}>✕</Text>
                    </TouchableOpacity>
                </View>

                {/* Sekmeler */}
                <View style={styles.sekmeBar}>
                    <TouchableOpacity
                        style={[styles.sekmeBtn, sekme === 'foto' && styles.sekmeBtnAktif]}
                        onPress={() => setSekme('foto')}>
                        <Text style={[styles.sekmeYazi, sekme === 'foto' && styles.sekmeYaziAktif]}>📷 Fotoğraf</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.sekmeBtn, sekme === 'sifre' && styles.sekmeBtnAktif]}
                        onPress={() => setSekme('sifre')}>
                        <Text style={[styles.sekmeYazi, sekme === 'sifre' && styles.sekmeYaziAktif]}>🔒 Şifre Değiştir</Text>
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">

                        {/* ═══ FOTO SEKMESİ ═══ */}
                        {sekme === 'foto' && (
                            <View>
                                <View style={styles.avatarAlani}>
                                    <View style={styles.avatarBuyuk}>
                                        {onizleme
                                            ? <Image source={{ uri: onizleme }} style={styles.avatarResim} />
                                            : <Text style={styles.avatarHarf}>{basHarfler || '?'}</Text>}
                                    </View>
                                    <Text style={styles.avatarIsim}>{kullanici?.adSoyad || ''}</Text>
                                    <Text style={styles.avatarRol}>{ROL_ETIKETLERI[kullanici?.rol] || kullanici?.rol || ''}</Text>
                                </View>

                                <TouchableOpacity style={styles.secBtn} onPress={fotoSec}>
                                    <Text style={styles.secBtnYazi}>📁 Galeriden Fotoğraf Seç</Text>
                                    <Text style={styles.secBtnAlt}>JPG, PNG, WEBP — Maks. 2 MB</Text>
                                </TouchableOpacity>

                                {secilenFoto && (
                                    <View style={styles.secilenBant}>
                                        <Text style={styles.secilenYazi} numberOfLines={1}>🖼️ {secilenFoto.name}</Text>
                                        <TouchableOpacity onPress={() => setSecilenFoto(null)}>
                                            <Text style={styles.secilenIptal}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {fotoMesaj && (
                                    <View style={[styles.mesaj, fotoMesaj.tip === 'basari' ? styles.mesajBasari : styles.mesajHata]}>
                                        <Text style={[styles.mesajYazi, { color: fotoMesaj.tip === 'basari' ? '#15803d' : '#dc2626' }]}>
                                            {fotoMesaj.metin}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.aksiyonSatir}>
                                    {kullanici?.profilFoto && (
                                        <TouchableOpacity style={styles.silBtn} onPress={fotoSil} disabled={fotoYukleniyor}>
                                            <Text style={styles.silBtnYazi}>🗑️ Kaldır</Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={[styles.kaydetBtn, (!secilenFoto || fotoYukleniyor) && { opacity: 0.5 }]}
                                        onPress={fotoYukle}
                                        disabled={!secilenFoto || fotoYukleniyor}>
                                        {fotoYukleniyor
                                            ? <ActivityIndicator size="small" color="#fff" />
                                            : <Text style={styles.kaydetBtnYazi}>✓ Kaydet</Text>}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* ═══ ŞİFRE SEKMESİ ═══ */}
                        {sekme === 'sifre' && (
                            <View>
                                <SifreInput etiket="🔑 Mevcut Şifre" deger={mevcutSifre} onChange={setMevcutSifre}
                                    goster={goster.m} toggle={() => setGoster(g => ({ ...g, m: !g.m }))}
                                    placeholder="Mevcut şifreniz" />

                                <SifreInput etiket="🔒 Yeni Şifre" deger={yeniSifre} onChange={setYeniSifre}
                                    goster={goster.y} toggle={() => setGoster(g => ({ ...g, y: !g.y }))}
                                    placeholder="En az 6 karakter" />

                                {/* Güç göstergesi */}
                                {yeniSifre.length > 0 && (
                                    <View style={styles.gucAlani}>
                                        <View style={styles.gucCubuk}>
                                            <View style={[styles.gucDolum, { width: `${guc.g}%`, backgroundColor: guc.r }]} />
                                        </View>
                                        <Text style={[styles.gucYazi, { color: guc.r }]}>{guc.y}</Text>
                                    </View>
                                )}

                                <SifreInput etiket="🔒 Yeni Şifre (Tekrar)" deger={yeniTekrar} onChange={setYeniTekrar}
                                    goster={goster.t} toggle={() => setGoster(g => ({ ...g, t: !g.t }))}
                                    placeholder="Yeni şifrenizi tekrar girin" />

                                {eslesme !== null && (
                                    <Text style={[styles.eslesmeYazi, { color: eslesme ? '#16a34a' : '#dc2626' }]}>
                                        {eslesme ? '✓ Şifreler eşleşiyor' : '✗ Şifreler eşleşmiyor'}
                                    </Text>
                                )}

                                {sifreMesaj && (
                                    <View style={[styles.mesaj, sifreMesaj.tip === 'basari' ? styles.mesajBasari : styles.mesajHata]}>
                                        <Text style={[styles.mesajYazi, { color: sifreMesaj.tip === 'basari' ? '#15803d' : '#dc2626' }]}>
                                            {sifreMesaj.metin}
                                        </Text>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[styles.kaydetBtn, styles.kaydetTam, sifreYukleniyor && { opacity: 0.5 }]}
                                    onPress={sifreDegistir}
                                    disabled={sifreYukleniyor}>
                                    {sifreYukleniyor
                                        ? <ActivityIndicator size="small" color="#fff" />
                                        : <Text style={styles.kaydetBtnYazi}>🛡️ Şifreyi Değiştir</Text>}
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}

// ─── Şifre input (göz ikonlu) ───
function SifreInput({ etiket, deger, onChange, goster, toggle, placeholder }) {
    return (
        <View style={styles.formGrup}>
            <Text style={styles.formEtiket}>{etiket}</Text>
            <View style={styles.sifreKutu}>
                <TextInput
                    style={styles.sifreInput}
                    value={deger}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!goster}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <TouchableOpacity onPress={toggle} style={styles.gozBtn}>
                    <Text style={{ fontSize: 16 }}>{goster ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    ustBar: {
        backgroundColor: '#0a2664', paddingTop: 16, paddingBottom: 16, paddingHorizontal: 18,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    ustBarBaslik: { color: '#fff', fontSize: 16, fontWeight: '700' },
    kapatBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
    kapatYazi: { color: '#fff', fontSize: 18 },

    sekmeBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    sekmeBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    sekmeBtnAktif: { borderBottomColor: '#2563eb' },
    sekmeYazi: { fontSize: 13, color: '#64748b', fontWeight: '600' },
    sekmeYaziAktif: { color: '#2563eb' },

    icerik: { padding: 20 },

    // Avatar
    avatarAlani: { alignItems: 'center', marginBottom: 24 },
    avatarBuyuk: {
        width: 110, height: 110, borderRadius: 55, backgroundColor: '#1e3a8a',
        justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden',
        borderWidth: 3, borderColor: '#dbeafe',
    },
    avatarResim: { width: '100%', height: '100%' },
    avatarHarf: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
    avatarIsim: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
    avatarRol: { fontSize: 13, color: '#64748b', marginTop: 2 },

    // Foto seç
    secBtn: {
        backgroundColor: '#eff6ff', borderWidth: 2, borderColor: '#bfdbfe', borderStyle: 'dashed',
        borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 12,
    },
    secBtnYazi: { fontSize: 15, fontWeight: '600', color: '#1d4ed8' },
    secBtnAlt: { fontSize: 12, color: '#94a3b8', marginTop: 4 },

    secilenBant: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 12,
    },
    secilenYazi: { fontSize: 13, color: '#475569', flex: 1, marginRight: 8 },
    secilenIptal: { fontSize: 16, color: '#94a3b8' },

    aksiyonSatir: { flexDirection: 'row', gap: 12, marginTop: 4 },
    silBtn: { flex: 1, backgroundColor: '#fee2e2', padding: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' },
    silBtnYazi: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
    kaydetBtn: { flex: 1, backgroundColor: '#2563eb', padding: 14, borderRadius: 10, alignItems: 'center' },
    kaydetTam: { marginTop: 16 },
    kaydetBtnYazi: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // Şifre
    formGrup: { marginBottom: 16 },
    formEtiket: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
    sifreKutu: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    },
    sifreInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0f172a' },
    gozBtn: { paddingHorizontal: 14, paddingVertical: 10 },

    gucAlani: { marginBottom: 16, marginTop: -8 },
    gucCubuk: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
    gucDolum: { height: '100%', borderRadius: 3 },
    gucYazi: { fontSize: 12, fontWeight: '600' },

    eslesmeYazi: { fontSize: 12, fontWeight: '600', marginTop: -8, marginBottom: 12 },

    mesaj: { padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1 },
    mesajBasari: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
    mesajHata: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
    mesajYazi: { fontSize: 13, fontWeight: '500' },
});