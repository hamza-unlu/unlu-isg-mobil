// ═══════════════════════════════════════════════════════════════════════
// FİRMALAR LİSTESİ EKRANI — Yeni Firma Ekleme Modallı
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView, FlatList,
    ActivityIndicator, RefreshControl, TextInput, Modal, ScrollView, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const TEHLIKE_SECENEKLERI = [
    { deger: 'Az Tehlikeli',  renk: '#16a34a', bg: '#dcfce7' },
    { deger: 'Tehlikeli',     renk: '#ca8a04', bg: '#fef3c7' },
    { deger: 'Çok Tehlikeli', renk: '#dc2626', bg: '#fee2e2' },
];

export default function FirmasScreen({ navigation }) {
    const { kullanici, cikis } = useAuth();
    const [firmalar, setFirmalar] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [yenileniyor, setYenileniyor] = useState(false);
    const [hata, setHata] = useState('');
    const [arama, setArama] = useState('');

    // Modal state
    const [modalAcik, setModalAcik] = useState(false);
    const [kaydediliyor, setKaydediliyor] = useState(false);

    // Form state
    const [form, setForm] = useState({
        firmaAdi: '', tehlikeSinifi: 'Tehlikeli', yetkiliKisi: '',
        telefon: '', eposta: '', sgkNo: '', adres: '',
        sektor: '', vergiNo: '', calisanSayisi: '',
    });

    function formGuncelle(alan, deger) {
        setForm(prev => ({ ...prev, [alan]: deger }));
    }

    function formSifirla() {
        setForm({
            firmaAdi: '', tehlikeSinifi: 'Tehlikeli', yetkiliKisi: '',
            telefon: '', eposta: '', sgkNo: '', adres: '',
            sektor: '', vergiNo: '', calisanSayisi: '',
        });
    }

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

    useEffect(() => { firmalariYukle(); }, [firmalariYukle]);

    const yenile = useCallback(() => {
        setYenileniyor(true);
        firmalariYukle();
    }, [firmalariYukle]);

    async function firmaKaydet() {
        if (!form.firmaAdi.trim()) {
            Alert.alert('Eksik Bilgi', 'Firma adı zorunludur.');
            return;
        }
        setKaydediliyor(true);
        try {
            const gonderilecek = {
                ...form,
                calisanSayisi: form.calisanSayisi ? Number(form.calisanSayisi) : 0,
            };
            await api.post('/api/firmalar', gonderilecek);
            setKaydediliyor(false);
            setModalAcik(false);
            formSifirla();
            Alert.alert('Başarılı', 'Firma başarıyla eklendi.');
            yenile();
        } catch (err) {
            setKaydediliyor(false);
            Alert.alert('Hata', err.message || 'Firma eklenemedi.');
        }
    }

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
                    <Text style={styles.yukleniyorYazi}>Firmalar yükleniyor...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <UstBar kullanici={kullanici} cikis={cikis} />

            <View style={styles.sayfaBaslik}>
                <Text style={styles.sayfaBaslikYazi}>🏢 Firmalar</Text>
                <Text style={styles.sayfaBaslikSayi}>{filtrelenmis.length} firma</Text>
            </View>

            {/* + Yeni Firma Ekle butonu */}
            <TouchableOpacity style={styles.ekleBtn} onPress={() => setModalAcik(true)} activeOpacity={0.8}>
                <Text style={styles.ekleBtnYazi}>+ Yeni Firma Ekle</Text>
            </TouchableOpacity>

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

            <FlatList
                data={filtrelenmis}
                keyExtractor={(item) => item._id || item.id || item.firmaAdi}
                renderItem={({ item }) => (
                    <FirmaSatir
                        firma={item}
                        onPress={() => {
                            navigation.navigate('FirmaBilgileri', {
                                firmaId: item._id || item.id,
                                firmaAdi: item.firmaAdi || item.adi,
                            });
                        }}
                    />
                )}
                refreshControl={
                    <RefreshControl refreshing={yenileniyor} onRefresh={yenile} colors={['#2563eb']} />
                }
                ListEmptyComponent={
                    <View style={styles.bosKart}>
                        <Text style={styles.bosIkon}>🏢</Text>
                        <Text style={styles.bosBaslik}>
                            {arama ? 'Sonuç bulunamadı' : 'Henüz firma yok'}
                        </Text>
                        <Text style={styles.bosAciklama}>
                            {arama
                                ? `"${arama}" ile eşleşen firma bulunamadı.`
                                : 'Yukarıdaki "+ Yeni Firma Ekle" butonuyla firma ekleyin.'}
                        </Text>
                    </View>
                }
                contentContainerStyle={styles.liste}
            />

            {/* ═══ YENİ FİRMA EKLEME MODALI ═══ */}
            <Modal visible={modalAcik} transparent animationType="slide"
                onRequestClose={() => setModalAcik(false)}>
                <View style={styles.modalArka}>
                    <View style={styles.modalKutu}>
                        <View style={styles.modalBaslikSatir}>
                            <Text style={styles.modalBaslik}>🏢 Yeni Firma Ekle</Text>
                            <TouchableOpacity onPress={() => setModalAcik(false)}>
                                <Text style={styles.modalKapat}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
                            <Alan etiket="Firma Adı *" deger={form.firmaAdi}
                                onChange={v => formGuncelle('firmaAdi', v)} placeholder="Örn: ABC İnşaat Ltd. Şti." />

                            {/* Tehlike Sınıfı */}
                            <Text style={styles.etiket}>Tehlike Sınıfı *</Text>
                            <View style={styles.tehlikeSatir}>
                                {TEHLIKE_SECENEKLERI.map(t => (
                                    <TouchableOpacity
                                        key={t.deger}
                                        style={[
                                            styles.tehlikeKart,
                                            form.tehlikeSinifi === t.deger && { borderColor: t.renk, backgroundColor: t.bg },
                                        ]}
                                        onPress={() => formGuncelle('tehlikeSinifi', t.deger)}>
                                        <Text style={[
                                            styles.tehlikeKartYazi,
                                            form.tehlikeSinifi === t.deger && { color: t.renk, fontWeight: 'bold' },
                                        ]}>{t.deger}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Alan etiket="Yetkili Kişi" deger={form.yetkiliKisi}
                                onChange={v => formGuncelle('yetkiliKisi', v)} placeholder="Ad Soyad" />
                            <Alan etiket="Telefon" deger={form.telefon}
                                onChange={v => formGuncelle('telefon', v)} placeholder="0212 000 00 00" keyboardType="phone-pad" />
                            <Alan etiket="E-posta (otomatik işveren hesabı açar)" deger={form.eposta}
                                onChange={v => formGuncelle('eposta', v)} placeholder="firma@ornek.com"
                                keyboardType="email-address" autoCapitalize="none" />
                            <Alan etiket="SGK Sicil No" deger={form.sgkNo}
                                onChange={v => formGuncelle('sgkNo', v)} placeholder="SGK numarası" />
                            <Alan etiket="Adres" deger={form.adres}
                                onChange={v => formGuncelle('adres', v)} placeholder="Firma adresi" cokSatir />
                            <Alan etiket="Sektör" deger={form.sektor}
                                onChange={v => formGuncelle('sektor', v)} placeholder="Örn: İnşaat" />
                            <Alan etiket="Vergi No" deger={form.vergiNo}
                                onChange={v => formGuncelle('vergiNo', v)} placeholder="Vergi numarası" keyboardType="number-pad" />
                            <Alan etiket="Çalışan Sayısı" deger={form.calisanSayisi}
                                onChange={v => formGuncelle('calisanSayisi', v)} placeholder="0" keyboardType="number-pad" />

                            <View style={{ height: 20 }} />
                        </ScrollView>

                        <View style={styles.modalBtnSatir}>
                            <TouchableOpacity style={styles.modalBtnIptal} onPress={() => setModalAcik(false)}>
                                <Text style={styles.modalBtnIptalYazi}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtnKaydet, kaydediliyor && { opacity: 0.7 }]}
                                onPress={firmaKaydet} disabled={kaydediliyor}>
                                {kaydediliyor
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={styles.modalBtnKaydetYazi}>Kaydet</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─── FORM ALANI (etiket + input) ──────────────────────────────────────
function Alan({ etiket, deger, onChange, placeholder, keyboardType, autoCapitalize, cokSatir }) {
    return (
        <View style={{ marginBottom: 12 }}>
            <Text style={styles.etiket}>{etiket}</Text>
            <TextInput
                style={[styles.alanInput, cokSatir && { height: 70, textAlignVertical: 'top' }]}
                value={deger}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor="#94a3b8"
                keyboardType={keyboardType || 'default'}
                autoCapitalize={autoCapitalize || 'sentences'}
                multiline={cokSatir}
            />
        </View>
    );
}

// ─── ÜST BAR ─────────────────────────────────────────────────────────
function UstBar({ kullanici, cikis }) {
    return (
        <View style={styles.ustBar}>
            <View>
                <Text style={styles.ustBarBaslik}>🛡️ ÜNLÜ İSG</Text>
                <Text style={styles.ustBarAltyazi}>{kullanici?.adSoyad || 'Kullanıcı'}</Text>
            </View>
            <TouchableOpacity onPress={cikis} style={styles.cikisBtn}>
                <Text style={styles.cikisBtnYazi}>Çıkış</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── FİRMA SATIRI ────────────────────────────────────────────────────
function FirmaSatir({ firma, onPress }) {
    const ad = firma.firmaAdi || firma.adi || 'İsimsiz Firma';
    const ekleyen = firma.ekleyenKullanici?.adSoyad || '';
    const tehlikeSinifi = firma.isg?.tehlikeSinifi || firma.tehlikeSinifi;

    let tehlikeRenk = '#94a3b8', tehlikeBg = '#f1f5f9';
    const ts = (tehlikeSinifi || '').toLowerCase();
    if (ts.includes('çok') || ts.includes('cok')) { tehlikeRenk = '#dc2626'; tehlikeBg = '#fee2e2'; }
    else if (ts.includes('az')) { tehlikeRenk = '#16a34a'; tehlikeBg = '#dcfce7'; }
    else if (ts.includes('tehlikeli')) { tehlikeRenk = '#ca8a04'; tehlikeBg = '#fef3c7'; }

    const tehlikeYazi = (tehlikeSinifi || 'BELİRSİZ').toLocaleUpperCase('tr-TR');

    return (
        <TouchableOpacity style={styles.firmaKart} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.firmaIkon}>
                <Text style={{ fontSize: 24 }}>🏢</Text>
            </View>
            <View style={styles.firmaIcerik}>
                <Text style={styles.firmaAd} numberOfLines={2}>{ad}</Text>
                {ekleyen ? <Text style={styles.firmaEkleyen}>👤 {ekleyen}</Text> : null}
                <View style={styles.firmaAlt}>
                    <View style={[styles.tehlikeRozet, { backgroundColor: tehlikeBg }]}>
                        <Text style={[styles.tehlikeYazi, { color: tehlikeRenk }]}>{tehlikeYazi}</Text>
                    </View>
                </View>
            </View>
            <Text style={styles.okIsareti}>›</Text>
        </TouchableOpacity>
    );
}

// ─── STİLLER ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    merkez: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    yukleniyorYazi: { marginTop: 12, fontSize: 14, color: '#64748b' },
    ustBar: { backgroundColor: '#1e3a8a', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    ustBarBaslik: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    ustBarAltyazi: { color: '#bfdbfe', fontSize: 12, marginTop: 2 },
    cikisBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    cikisBtnYazi: { color: '#fff', fontWeight: '600', fontSize: 13 },
    sayfaBaslik: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    sayfaBaslikYazi: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
    sayfaBaslikSayi: { fontSize: 13, color: '#64748b', backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    ekleBtn: { backgroundColor: '#2563eb', marginHorizontal: 16, marginBottom: 12, padding: 14, borderRadius: 10, alignItems: 'center' },
    ekleBtnYazi: { color: '#fff', fontSize: 15, fontWeight: '700' },
    aramaKutusu: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
    aramaIkon: { fontSize: 14, marginRight: 8 },
    aramaInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#0f172a' },
    aramaSil: { fontSize: 16, color: '#94a3b8', padding: 4 },
    hataKart: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 8 },
    hataYazi: { color: '#dc2626', fontSize: 13 },
    liste: { paddingHorizontal: 12, paddingBottom: 180 },
    firmaKart: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    firmaIkon: { width: 48, height: 48, backgroundColor: '#dbeafe', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    firmaIcerik: { flex: 1 },
    firmaAd: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
    firmaEkleyen: { fontSize: 12, color: '#64748b', marginBottom: 6 },
    firmaAlt: { flexDirection: 'row', gap: 6 },
    tehlikeRozet: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
    tehlikeYazi: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.3 },
    okIsareti: { fontSize: 24, color: '#cbd5e1', marginLeft: 8 },
    bosKart: { margin: 16, padding: 32, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    bosIkon: { fontSize: 48, marginBottom: 8 },
    bosBaslik: { fontSize: 16, fontWeight: 'bold', color: '#475569', marginBottom: 4 },
    bosAciklama: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
    // Modal
    modalArka: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
    modalKutu: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', paddingBottom: 20 },
    modalBaslikSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    modalBaslik: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
    modalKapat: { fontSize: 22, color: '#94a3b8', paddingHorizontal: 4 },
    modalForm: { paddingHorizontal: 20, paddingTop: 16 },
    etiket: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
    alanInput: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 15, color: '#0f172a', backgroundColor: '#fafafa' },
    tehlikeSatir: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    tehlikeKart: { flex: 1, borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: '#fafafa' },
    tehlikeKartYazi: { fontSize: 12, color: '#475569', textAlign: 'center' },
    modalBtnSatir: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 16 },
    modalBtnIptal: { flex: 1, backgroundColor: '#f1f5f9', padding: 14, borderRadius: 10, alignItems: 'center' },
    modalBtnIptalYazi: { color: '#475569', fontSize: 15, fontWeight: '600' },
    modalBtnKaydet: { flex: 1, backgroundColor: '#2563eb', padding: 14, borderRadius: 10, alignItems: 'center' },
    modalBtnKaydetYazi: { color: '#fff', fontSize: 15, fontWeight: '700' },
});