// ═══════════════════════════════════════════════════════════════════════
// GİRİŞ EKRANI — Web tasarımına uyumlu + Şifremi Unuttum modalı
// ═══════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, SafeAreaView, StyleSheet,
    Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
    const [eposta, setEposta]         = useState('');
    const [sifre, setSifre]           = useState('');
    const [yukleniyor, setYukleniyor] = useState(false);
    const [sifreGoster, setSifreGoster] = useState(false);

    // Şifremi Unuttum modal state
    const [modalAcik, setModalAcik]     = useState(false);
    const [unutmaEposta, setUnutmaEposta] = useState('');
    const [modalYukleniyor, setModalYukleniyor] = useState(false);
    const [modalMesaj, setModalMesaj]   = useState({ tip: '', metin: '' });

    const { giris, sifreUnuttum } = useAuth();

    async function girisDene() {
        if (!eposta || !sifre) {
            Alert.alert('Eksik Bilgi', 'E-posta ve şifre alanlarını doldurun.');
            return;
        }
        setYukleniyor(true);
        const sonuc = await giris(eposta, sifre);
        setYukleniyor(false);
        if (!sonuc.basarili) {
            Alert.alert('Giriş Başarısız', sonuc.mesaj);
        }
    }

    function modalAcFn() {
        setUnutmaEposta(eposta); // login'deki e-postayı taşı
        setModalMesaj({ tip: '', metin: '' });
        setModalAcik(true);
    }
    function modalKapatFn() {
        setModalAcik(false);
        setUnutmaEposta('');
        setModalMesaj({ tip: '', metin: '' });
        setModalYukleniyor(false);
    }

    async function sifreUnuttumGonder() {
        if (!unutmaEposta) {
            setModalMesaj({ tip: 'hata', metin: 'Lütfen e-posta adresinizi girin.' });
            return;
        }
        setModalYukleniyor(true);
        setModalMesaj({ tip: '', metin: '' });
        const sonuc = await sifreUnuttum(unutmaEposta);
        setModalYukleniyor(false);
        if (sonuc.basarili) {
            setModalMesaj({ tip: 'basarili', metin: sonuc.mesaj });
            setTimeout(modalKapatFn, 3000);
        } else {
            setModalMesaj({ tip: 'hata', metin: sonuc.mesaj });
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}>
            <View style={styles.icerik}>
                {/* Logo/Başlık */}
                <Text style={styles.logo}>🛡️</Text>
                <Text style={styles.baslik}>ÜNLÜ İSG</Text>
                <Text style={styles.altyazi}>İSG Doküman Yönetim Sistemi'ne Hoşgeldiniz</Text>

                {/* Form Kartı */}
                <View style={styles.form}>
                    <Text style={styles.formBaslik}>Hesabınıza Girin</Text>

                    <Text style={styles.etiket}>E-posta Adresi</Text>
                    <TextInput
                        style={styles.input}
                        value={eposta}
                        onChangeText={setEposta}
                        placeholder="ornek@unluosgb.com"
                        placeholderTextColor="#94a3b8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    <Text style={styles.etiket}>Şifre</Text>
                    <View style={styles.sifreSatir}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                            value={sifre}
                            onChangeText={setSifre}
                            placeholder="••••••••"
                            placeholderTextColor="#94a3b8"
                            secureTextEntry={!sifreGoster}
                        />
                        <TouchableOpacity
                            style={styles.gozBtn}
                            onPress={() => setSifreGoster(!sifreGoster)}>
                            <Text style={styles.gozBtnYazi}>{sifreGoster ? '🙈' : '👁️'}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.btnGiris, yukleniyor && styles.btnDevre]}
                        onPress={girisDene}
                        disabled={yukleniyor}>
                        {yukleniyor
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.btnGirisYazi}>GİRİŞ YAP</Text>}
                    </TouchableOpacity>

                    {/* Şifremi Unuttum linki */}
                    <TouchableOpacity style={styles.unuttumLink} onPress={modalAcFn}>
                        <Text style={styles.unuttumLinkYazi}>Şifremi Unuttum</Text>
                    </TouchableOpacity>
                    <View style={styles.ayrac} />
                    <TouchableOpacity
                        style={styles.kayitLink}
                        onPress={() => navigation.navigate('Register')}>
                        <Text style={styles.kayitLinkYazi}>
                            Hesabın yok mu? <Text style={{ fontWeight: '700' }}>Kayıt Ol</Text>
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.altBilgi}>© 2026 Ünlü OSGB</Text>
            </View>

            {/* ═══ ŞİFREMİ UNUTTUM MODAL ═══ */}
            <Modal visible={modalAcik} transparent animationType="fade"
                onRequestClose={modalKapatFn}>
                <View style={styles.modalArka}>
                    <View style={styles.modalKutu}>
                        <View style={styles.modalBaslikSatir}>
                            <Text style={styles.modalBaslik}>Şifremi Unuttum</Text>
                            <TouchableOpacity onPress={modalKapatFn}>
                                <Text style={styles.modalKapat}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalAciklama}>
                            Kayıtlı e-posta adresinizi girin, size şifre sıfırlama bağlantısı göndereceğiz.
                            Bağlantı 15 dakika boyunca geçerlidir.
                        </Text>

                        <Text style={styles.etiket}>E-posta Adresi</Text>
                        <TextInput
                            style={styles.input}
                            value={unutmaEposta}
                            onChangeText={setUnutmaEposta}
                            placeholder="ornek@unluosgb.com"
                            placeholderTextColor="#94a3b8"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        {modalMesaj.metin ? (
                            <View style={[
                                styles.modalMesaj,
                                modalMesaj.tip === 'basarili' ? styles.modalMesajBasarili : styles.modalMesajHata,
                            ]}>
                                <Text style={[
                                    styles.modalMesajYazi,
                                    { color: modalMesaj.tip === 'basarili' ? '#166534' : '#dc2626' },
                                ]}>{modalMesaj.metin}</Text>
                            </View>
                        ) : null}

                        <View style={styles.modalBtnSatir}>
                            <TouchableOpacity style={styles.modalBtnIptal} onPress={modalKapatFn}>
                                <Text style={styles.modalBtnIptalYazi}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtnGonder, modalYukleniyor && styles.btnDevre]}
                                onPress={sifreUnuttumGonder}
                                disabled={modalYukleniyor}>
                                {modalYukleniyor
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={styles.modalBtnGonderYazi}>Bağlantı Gönder</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container:  { flex: 1, backgroundColor: '#1e3a8a' },
    icerik:     { flex: 1, padding: 24, justifyContent: 'center' },
    logo:       { fontSize: 64, textAlign: 'center', marginBottom: 12 },
    baslik:     { fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center', letterSpacing: 1.5 },
    altyazi:    { fontSize: 14, color: '#bfdbfe', textAlign: 'center', marginBottom: 40 },
    form:       { backgroundColor: '#fff', padding: 24, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
    formBaslik: { fontSize: 18, fontWeight: '700', color: '#1e293b', textAlign: 'center', marginBottom: 16 },
    etiket:     { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 12 },
    input:      { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, fontSize: 15, color: '#0f172a', backgroundColor: '#fafafa', marginBottom: 4 },
    sifreSatir: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    gozBtn:     { padding: 12, backgroundColor: '#f1f5f9', borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0' },
    gozBtnYazi: { fontSize: 18 },
    btnGiris:   { backgroundColor: '#2563eb', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 24 },
    btnDevre:   { opacity: 0.7 },
    btnGirisYazi: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
    unuttumLink:  { marginTop: 16, alignItems: 'center' },
    unuttumLinkYazi: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
    altBilgi:   { textAlign: 'center', color: '#bfdbfe', fontSize: 12, marginTop: 32 },
    // Modal
    modalArka:  { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalKutu:  { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440 },
    modalBaslikSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    modalBaslik: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
    modalKapat:  { fontSize: 22, color: '#94a3b8', paddingHorizontal: 4 },
    modalAciklama: { color: '#64748b', fontSize: 14, lineHeight: 20, marginBottom: 8 },
    modalMesaj:  { padding: 10, borderRadius: 8, marginTop: 12 },
    modalMesajBasarili: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac' },
    modalMesajHata:     { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
    modalMesajYazi: { fontSize: 13, fontWeight: '500' },
    modalBtnSatir: { flexDirection: 'row', gap: 12, marginTop: 20 },
    modalBtnIptal: { flex: 1, backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, alignItems: 'center' },
    modalBtnIptalYazi: { color: '#475569', fontSize: 14, fontWeight: '600' },
    modalBtnGonder: { flex: 1, backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center' },
    modalBtnGonderYazi: { color: '#fff', fontSize: 14, fontWeight: '600' },
    ayrac:        { height: 1, backgroundColor: '#e2e8f0', marginVertical: 16 },
    kayitLink:    { alignItems: 'center' },
    kayitLinkYazi:{ color: '#64748b', fontSize: 14 },
});