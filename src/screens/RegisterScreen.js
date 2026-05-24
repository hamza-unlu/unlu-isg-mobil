// ═══════════════════════════════════════════════════════════════════════
// KAYIT EKRANI — Yeni hesap (sadece İSG uzmanı / işyeri hekimi)
// ═══════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
    KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
    const [adSoyad, setAdSoyad]         = useState('');
    const [eposta, setEposta]           = useState('');
    const [sifre, setSifre]             = useState('');
    const [sifreTekrar, setSifreTekrar] = useState('');
    const [rol, setRol]                 = useState('isg_uzmani');
    const [sifreGoster, setSifreGoster] = useState(false);
    const [yukleniyor, setYukleniyor]   = useState(false);

    const { kayitOl } = useAuth();

    async function kayitDene() {
        if (!adSoyad || !eposta || !sifre || !sifreTekrar) {
            Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun.');
            return;
        }
        if (sifre.length < 6) {
            Alert.alert('Zayıf Şifre', 'Şifre en az 6 karakter olmalıdır.');
            return;
        }
        if (sifre !== sifreTekrar) {
            Alert.alert('Şifre Uyuşmazlığı', 'Şifreler birbiriyle eşleşmiyor.');
            return;
        }

        setYukleniyor(true);
        const sonuc = await kayitOl(adSoyad, eposta, sifre, sifreTekrar, rol);
        setYukleniyor(false);

        if (!sonuc.basarili) {
            Alert.alert('Kayıt Başarısız', sonuc.mesaj);
        }
        // Başarılıysa AuthContext otomatik yönlendirir (girisYapildi: true)
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <Text style={styles.logo}>🛡️</Text>
                <Text style={styles.baslik}>ÜNLÜ İSG</Text>
                <Text style={styles.altyazi}>Yeni Hesap Oluştur</Text>

                <View style={styles.form}>
                    <Text style={styles.formBaslik}>Hesap Bilgileriniz</Text>

                    <Text style={styles.etiket}>Ad Soyad</Text>
                    <TextInput
                        style={styles.input}
                        value={adSoyad}
                        onChangeText={setAdSoyad}
                        placeholder="Ad Soyad"
                        placeholderTextColor="#94a3b8"
                    />

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

                    {/* Rol Seçimi */}
                    <Text style={styles.etiket}>Rolünüz</Text>
                    <View style={styles.rolSatir}>
                        <TouchableOpacity
                            style={[styles.rolKart, rol === 'isg_uzmani' && styles.rolKartSecili]}
                            onPress={() => setRol('isg_uzmani')}>
                            <Text style={styles.rolIkon}>🛡️</Text>
                            <Text style={[styles.rolYazi, rol === 'isg_uzmani' && styles.rolYaziSecili]}>
                                İş Güvenliği Uzmanı
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.rolKart, rol === 'isyeri_hekimi' && styles.rolKartSecili]}
                            onPress={() => setRol('isyeri_hekimi')}>
                            <Text style={styles.rolIkon}>🩺</Text>
                            <Text style={[styles.rolYazi, rol === 'isyeri_hekimi' && styles.rolYaziSecili]}>
                                İşyeri Hekimi
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.etiket}>Şifre</Text>
                    <View style={styles.sifreSatir}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                            value={sifre}
                            onChangeText={setSifre}
                            placeholder="En az 6 karakter"
                            placeholderTextColor="#94a3b8"
                            secureTextEntry={!sifreGoster}
                        />
                        <TouchableOpacity
                            style={styles.gozBtn}
                            onPress={() => setSifreGoster(!sifreGoster)}>
                            <Text style={styles.gozBtnYazi}>{sifreGoster ? '🙈' : '👁️'}</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.etiket}>Şifre (Tekrar)</Text>
                    <TextInput
                        style={styles.input}
                        value={sifreTekrar}
                        onChangeText={setSifreTekrar}
                        placeholder="Şifrenizi tekrar girin"
                        placeholderTextColor="#94a3b8"
                        secureTextEntry={!sifreGoster}
                    />

                    <TouchableOpacity
                        style={[styles.btnKayit, yukleniyor && styles.btnDevre]}
                        onPress={kayitDene}
                        disabled={yukleniyor}>
                        {yukleniyor
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.btnKayitYazi}>HESAP OLUŞTUR</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.girisLink}
                        onPress={() => navigation.goBack()}>
                        <Text style={styles.girisLinkYazi}>Zaten hesabım var — Giriş Yap</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.altBilgi}>© 2026 Ünlü OSGB</Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container:  { flex: 1, backgroundColor: '#1e3a8a' },
    scroll:     { flexGrow: 1, padding: 24, justifyContent: 'center', paddingVertical: 40 },
    logo:       { fontSize: 56, textAlign: 'center', marginBottom: 8 },
    baslik:     { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', letterSpacing: 1.5 },
    altyazi:    { fontSize: 14, color: '#bfdbfe', textAlign: 'center', marginBottom: 28 },
    form:       { backgroundColor: '#fff', padding: 24, borderRadius: 16, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
    formBaslik: { fontSize: 18, fontWeight: '700', color: '#1e293b', textAlign: 'center', marginBottom: 16 },
    etiket:     { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 12 },
    input:      { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, fontSize: 15, color: '#0f172a', backgroundColor: '#fafafa', marginBottom: 4 },
    sifreSatir: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    gozBtn:     { padding: 12, backgroundColor: '#f1f5f9', borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0' },
    gozBtnYazi: { fontSize: 18 },
    rolSatir:   { flexDirection: 'row', gap: 10, marginTop: 4 },
    rolKart:    { flex: 1, borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: '#fafafa' },
    rolKartSecili: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
    rolIkon:    { fontSize: 24, marginBottom: 4 },
    rolYazi:    { fontSize: 12, fontWeight: '600', color: '#475569', textAlign: 'center' },
    rolYaziSecili: { color: '#1d4ed8' },
    btnKayit:   { backgroundColor: '#2563eb', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 24 },
    btnDevre:   { opacity: 0.7 },
    btnKayitYazi: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
    girisLink:  { marginTop: 16, alignItems: 'center' },
    girisLinkYazi: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
    altBilgi:   { textAlign: 'center', color: '#bfdbfe', fontSize: 12, marginTop: 24 },
});