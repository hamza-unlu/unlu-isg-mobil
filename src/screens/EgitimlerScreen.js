// ═══════════════════════════════════════════════════════════════════════
// EĞİTİMLER EKRANI
// ───────────────────────────────────────────────────────────────────────
// Web ile birebir uyumlu:
// - Liste: eğitim adı, firma, eğitmen, tarih, katılımcı, durum
// - Yaklaşan / geçmiş eğitim banner'ı
// - Yeni eğitim ekleme modal'ı (eğitim türü dropdown + firma + ...)
// - Detay/düzenleme modal'ı
// - Arama filtresi
// ═══════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
    FlatList, TextInput, ActivityIndicator, RefreshControl,
    Modal, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

// ─── DURUM MAP ───────────────────────────────────────────────────────
const DURUM_SECENEKLER = [
    { deger: 'PLANLANDI',    etiket: '📘 Planlandı' },
    { deger: 'DEVAM EDİYOR', etiket: '🟣 Devam Ediyor' },
    { deger: 'TAMAMLANDI',   etiket: '✅ Tamamlandı' },
    { deger: 'ERTELENDİ',   etiket: '⏸️ Ertelendi' },
    { deger: 'İPTAL',        etiket: '❌ İptal' },
];

const DURUM_BACKEND = {
    'PLANLANDI': 'planlandi', 'TAMAMLANDI': 'tamamlandi',
    'İPTAL': 'iptal', 'ERTELENDİ': 'planlandi', 'DEVAM EDİYOR': 'planlandi',
};

const BOŞ_FORM = {
    egitimAdi: '', firmaId: '', egitmen: '',
    tarih: '', katilimci: '', mailGonder: false,
};

const TEHLIKE_SECENEKLER = ['Genel', 'Az Tehlikeli', 'Tehlikeli', 'Çok Tehlikeli'];

const BOŞ_TUR_FORM = {
    ad: '', sureSaat: '', gecerlilikSuresiAy: '12',
    tehlikeSinifi: 'Genel', aciklama: ''
};

const BOŞ_DETAY = {
    egitimAdi: '', firma: '', egitmen: '', tarih: '',
    katilimci: '', durum: 'PLANLANDI', notlar: '', mailGonder: false,
};

// ═══════════════════════════════════════════════════════════════════════
export default function EgitimlerScreen() {
    const { kullanici, cikis } = useAuth();

    const [egitimler, setEgitimler]       = useState([]);
    const [firmalar, setFirmalar]         = useState([]);
    const [egitimTurleri, setEgitimTurleri] = useState([]);
    const [yukleniyor, setYukleniyor]     = useState(true);
    const [yenileniyor, setYenileniyor]   = useState(false);
    const [arama, setArama]               = useState('');

    // Yeni eğitim modal
    const [ekleModal, setEkleModal]       = useState(false);
    const [form, setForm]                 = useState(BOŞ_FORM);
    const [kaydediyor, setKaydediyor]     = useState(false);
    const [toast, setToast] = useState({ goster: false, mesaj: '', tip: 'basari' });
    const [formHata, setFormHata]         = useState('');

    // Detay modal
    const [detayModal, setDetayModal]     = useState(false);
    const [aktifId, setAktifId]           = useState(null);
    const [detay, setDetay]               = useState(BOŞ_DETAY);
    const [detayKaydediyor, setDetayKaydediyor] = useState(false);

    // Firma seçim modal (ekleme)
    const [firmaEkleModal, setFirmaEkleModal] = useState(false);
    const [firmaEkleArama, setFirmaEkleArama] = useState('');

    // Eğitim türü seçim modal
    const [turModal, setTurModal]         = useState(false);
    // Yeni eğitim türü ekleme modal
const [turEkleModal, setTurEkleModal]     = useState(false);
const [turEkleHata, setTurEkleHata]       = useState('');
const [turEkleKaydediyor, setTurEkleKaydediyor] = useState(false);
const [turEkleForm, setTurEkleForm] = useState({
    ad: '', sureSaat: '', gecerlilikSuresiAy: '12',
    tehlikeSinifi: 'Genel', aciklama: ''
});

// Tehlike sınıfı seçim modal
const [tehlikeModal, setTehlikeModal]     = useState(false);
    const [turArama, setTurArama]         = useState('');

    // Durum seçim modal (detay)
    const [durumModal, setDurumModal]     = useState(false);

    // ── Veri yükleme ──────────────────────────────────────────────────
    const egitimlerYukle = useCallback(async () => {
        try {
            const yanit = await api.get(`/api/egitimler?_t=${Date.now()}`);
            const ham   = yanit.veri || yanit;
            setEgitimler(Array.isArray(ham) ? ham.map(backenddenFrontende) : []);
        } catch (err) {
            Alert.alert('Hata', 'Eğitimler yüklenemedi: ' + err.message);
        } finally {
            setYukleniyor(false);
            setYenileniyor(false);
        }
    }, []);

    const firmalariYukle = useCallback(async () => {
        try {
            const yanit = await api.get('/api/firmalar');
            const liste = yanit.veri || yanit;
            setFirmalar(Array.isArray(liste) ? liste : []);
        } catch { /* sessiz */ }
    }, []);

    const turlerYukle = useCallback(async () => {
        try {
            const yanit = await api.get('/api/egitim-turleri');
            const liste = yanit.veri || yanit;
            setEgitimTurleri(Array.isArray(liste) ? liste : []);
        } catch { /* sessiz */ }
    }, []);

    useEffect(() => {
        Promise.all([egitimlerYukle(), firmalariYukle(), turlerYukle()]);
    }, []);

    const yenile = useCallback(() => {
        setYenileniyor(true);
        egitimlerYukle();
    }, [egitimlerYukle]);

    // ── Toast göster (3.5 saniye sonra kapanır) ──────────────────────
const toastGoster = useCallback((mesaj, tip = 'basari') => {
    setToast({ goster: true, mesaj, tip });
    setTimeout(() => {
        setToast({ goster: false, mesaj: '', tip: 'basari' });
    }, 3500);
}, []);

    // ── Yeni eğitim türü kaydet ──────────────────────────────────────
const yeniTurKaydet = useCallback(async () => {
    setTurEkleHata('');
    if (!turEkleForm.ad.trim()) {
        return setTurEkleHata('Eğitim adı zorunludur.');
    }
    try {
        setTurEkleKaydediyor(true);
        const yanit = await api.post('/api/egitim-turleri', {
            ad:                 turEkleForm.ad.trim(),
            sureSaat:           parseInt(turEkleForm.sureSaat) || 0,
            gecerlilikSuresiAy: parseInt(turEkleForm.gecerlilikSuresiAy) || 12,
            tehlikeSinifi:      turEkleForm.tehlikeSinifi,
            aciklama:           turEkleForm.aciklama,
        });
        const yeniTur = yanit.veri || yanit;

        // Listeyi yenile
        await turlerYukle();
        // Yeni eklenen türü otomatik seç
        setForm(f => ({ ...f, egitimAdi: yeniTur.ad }));
        // Formu temizle, her iki modal'ı da kapat
        setTurEkleForm(BOŞ_TUR_FORM);
        setTurEkleModal(false);
        setTurModal(false);
    } catch (err) {
        setTurEkleHata(err.message || 'Eğitim türü eklenemedi.');
    } finally {
        setTurEkleKaydediyor(false);
    }
}, [turEkleForm, turlerYukle]); 

    // ── Format dönüşümü (backend → frontend) ─────────────────────────
    function backenddenFrontende(e) {
        const tarih = e.planlananTarih ? isoFormatla(e.planlananTarih) : (e.tarih || '');
        const durumMap = { planlandi: 'PLANLANDI', tamamlandi: 'TAMAMLANDI', iptal: 'İPTAL' };
        const durum = durumMap[e.durum] || (e.durum || 'PLANLANDI').toUpperCase();
        return {
            _id:       e._id,
            ad:        e.konu || e.ad || '',
            firma:     e.firma?.firmaAdi || e.firma || '',
            firmaId:   e.firma?._id || e.firma || '',
            egitmen:   e.egitmen || '',
            tarih,
            katilimci: (e.katilimcilar?.length > 0) ? e.katilimcilar.length : (e.katilimci || 0),
            durum,
            notlar:    e.notlar || '',
        };
    }

    function isoFormatla(iso) {
        const d = new Date(iso);
        return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
    }

    function tarihInputFormatla(ddmmyyyy) {
        if (!ddmmyyyy || !ddmmyyyy.includes('.')) return ddmmyyyy || '';
        const [g, m, y] = ddmmyyyy.split('.');
        return `${y}-${m}-${g}`;
    }

    // ── Gün farkı ve durum hesaplama ─────────────────────────────────
    function gunFarki(tarihDDMMYYYY) {
        if (!tarihDDMMYYYY) return 999;
        const [g, m, y] = tarihDDMMYYYY.split('.');
        const hedef = new Date(y, m - 1, g);
        const bugun = new Date(); bugun.setHours(0,0,0,0); hedef.setHours(0,0,0,0);
        return Math.ceil((hedef - bugun) / 86400000);
    }

    function durumStil(durum, tarih) {
        if (durum === 'PLANLANDI') {
            const g = gunFarki(tarih);
            if (g < 0)   return { bg: '#fce7f3', renk: '#9d174d', etiket: 'TARİH GEÇTİ' };
            if (g <= 10) return { bg: '#fee2e2', renk: '#dc2626', etiket: durum };
            if (g <= 30) return { bg: '#fff7ed', renk: '#ea580c', etiket: durum };
        }
        const map = {
            'PLANLANDI':    { bg: '#dbeafe', renk: '#1e40af', etiket: 'PLANLANDI' },
            'TAMAMLANDI':   { bg: '#dcfce7', renk: '#16a34a', etiket: 'TAMAMLANDI' },
            'ERTELENDİ':   { bg: '#f1f5f9', renk: '#475569', etiket: 'ERTELENDİ' },
            'İPTAL':        { bg: '#fee2e2', renk: '#dc2626', etiket: 'İPTAL' },
            'DEVAM EDİYOR': { bg: '#ede9fe', renk: '#7c3aed', etiket: 'DEVAM EDİYOR' },
        };
        return map[durum] || { bg: '#dbeafe', renk: '#1e40af', etiket: durum };
    }

    // ── Filtreli liste ────────────────────────────────────────────────
    const filtrelenmis = useMemo(() => {
        if (!arama.trim()) return egitimler;
        const q = arama.toLocaleLowerCase('tr-TR');
        return egitimler.filter(e =>
            (e.ad || '').toLocaleLowerCase('tr-TR').includes(q) ||
            (e.firma || '').toLocaleLowerCase('tr-TR').includes(q)
        );
    }, [egitimler, arama]);

    // ── Banner verileri ───────────────────────────────────────────────
    const { gecmisler, yaklasanlar } = useMemo(() => {
        const planlilar = egitimler.filter(e => e.durum === 'PLANLANDI');
        return {
            gecmisler:   planlilar.filter(e => gunFarki(e.tarih) < 0),
            yaklasanlar: planlilar.filter(e => { const g = gunFarki(e.tarih); return g >= 0 && g <= 10; }),
        };
    }, [egitimler]);

    const ekleKaydet = useCallback(async () => {
    setFormHata('');
    if (!form.egitimAdi) return setFormHata('Eğitim türü seçiniz.');
    if (!form.firmaId)   return setFormHata('Firma seçiniz.');
    if (!form.egitmen.trim()) return setFormHata('Eğitmen adı zorunludur.');
    if (!form.tarih)     return setFormHata('Tarih seçiniz.');
    if (!form.katilimci) return setFormHata('Katılımcı sayısı zorunludur.');

    // ── TARİH FORMAT DÖNÜŞTÜR ───────────────────────────────────────
    let tarihISO = form.tarih.trim();
    
    // DD.MM.YYYY → YYYY-MM-DD
    if (tarihISO.includes('.')) {
        const parcalar = tarihISO.split('.');
        if (parcalar.length !== 3) {
            return setFormHata('Tarih formatı: 30.05.2026 veya 2026-05-30');
        }
        const [g, m, y] = parcalar;
        tarihISO = `${y}-${m.padStart(2,'0')}-${g.padStart(2,'0')}`;
    }
    
    // Format doğrulama
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tarihISO)) {
        return setFormHata('Geçersiz tarih. Örn: 30.05.2026');
    }
    
    // Geçerli bir tarih mi kontrol et
    const tarihObj = new Date(tarihISO);
    if (isNaN(tarihObj.getTime())) {
        return setFormHata('Geçersiz tarih değeri.');
    }

    try {
        setKaydediyor(true);
        await api.post('/api/egitimler', {
            firma:          form.firmaId,
            konu:           form.egitimAdi,
            egitmen:        form.egitmen.trim(),
            planlananTarih: tarihISO,   // ← DÖNÜŞTÜRÜLMÜŞ TARİH
            durum:          'planlandi',
            katilimci:      parseInt(form.katilimci),
            mailGonder:     form.mailGonder,
        });
        setEkleModal(false);
        setForm(BOŞ_FORM);
        await egitimlerYukle();
        // Başarı bildirimi
const basariMesaj = form.mailGonder
    ? '✅ Eğitim kaydedildi ve firmaya e-posta gönderildi.'
    : '✅ Eğitim başarıyla kaydedildi.';
toastGoster(basariMesaj, 'basari');
    } catch (err) {
        console.log('🔴 EĞİTİM EKLEME HATASI (TAM):', JSON.stringify(err, null, 2));
        setFormHata(err.message || err.detay || 'Kayıt hatası.');
    } finally {
        setKaydediyor(false);
    }
}, [form, egitimlerYukle]);
    // ── Detay aç ─────────────────────────────────────────────────────
    const detayAc = useCallback((egitim) => {
        setAktifId(egitim._id);
        setDetay({
            egitimAdi:  egitim.ad,
            firma:      egitim.firma,
            egitmen:    egitim.egitmen,
            tarih:      tarihInputFormatla(egitim.tarih),
            katilimci:  String(egitim.katilimci),
            durum:      egitim.durum,
            notlar:     egitim.notlar || '',
            mailGonder: false,
        });
        setDetayModal(true);
    }, []);

    // ── Detay güncelle ───────────────────────────────────────────────
    const detayGuncelle = useCallback(async () => {
        if (!aktifId) return;
        try {
            setDetayKaydediyor(true);
            await api.put(`/api/egitimler/${aktifId}`, {
                konu:           detay.egitimAdi,
                egitmen:        detay.egitmen,
                planlananTarih: detay.tarih,
                durum:          DURUM_BACKEND[detay.durum] || 'planlandi',
                notlar:         detay.notlar,
                katilimci:      parseInt(detay.katilimci) || 0,
                mailGonder:     detay.mailGonder,
            });
            setDetayModal(false);
            await egitimlerYukle();
        } catch (err) {
            Alert.alert('Hata', err.message || 'Güncelleme hatası.');
        } finally {
            setDetayKaydediyor(false);
        }
    }, [aktifId, detay, egitimlerYukle]);

    // ── Eğitim sil ───────────────────────────────────────────────────
    const egitimSil = useCallback(() => {
        Alert.alert('Eğitimi Sil', 'Bu eğitimi kalıcı olarak silmek istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Sil', style: 'destructive', onPress: async () => {
                try {
                    await api.delete(`/api/egitimler/${aktifId}`);
                    setDetayModal(false);
                    await egitimlerYukle();
                } catch (err) {
                    Alert.alert('Hata', err.message);
                }
            }},
        ]);
    }, [aktifId, egitimlerYukle]);

    // ── Seçili firma adı (ekleme formu) ──────────────────────────────
    const secilenFirmaAdi = useMemo(() => {
        const f = firmalar.find(f => f._id === form.firmaId);
        return f ? f.firmaAdi : '';
    }, [firmalar, form.firmaId]);

    const filtrelenmisEkleFirma = useMemo(() => {
        if (!firmaEkleArama.trim()) return firmalar;
        const q = firmaEkleArama.toLocaleLowerCase('tr-TR');
        return firmalar.filter(f => (f.firmaAdi || '').toLocaleLowerCase('tr-TR').includes(q));
    }, [firmalar, firmaEkleArama]);

    const filtrelenmisTurler = useMemo(() => {
        if (!turArama.trim()) return egitimTurleri;
        const q = turArama.toLocaleLowerCase('tr-TR');
        return egitimTurleri.filter(t => (t.ad || '').toLocaleLowerCase('tr-TR').includes(q));
    }, [egitimTurleri, turArama]);

    if (yukleniyor) {
        return (
            <SafeAreaView style={styles.container}>

                {toast.goster && (
    <View style={[styles.toast, toast.tip === 'basari' ? styles.toastBasari : styles.toastHata]}>
        <Text style={styles.toastYazi}>{toast.mesaj}</Text>
        <TouchableOpacity onPress={() => setToast({ goster: false, mesaj: '', tip: 'basari' })}>
            <Text style={styles.toastKapat}>✕</Text>
        </TouchableOpacity>
    </View>
)}
                <UstBar kullanici={kullanici} cikis={cikis} />
                <View style={styles.merkez}><ActivityIndicator size="large" color="#2563eb" /></View>
            </SafeAreaView>
        );
    }

    return (
    <SafeAreaView style={styles.container}>

        {toast.goster && (
            <View style={[styles.toast, toast.tip === 'basari' ? styles.toastBasari : styles.toastHata]}>
                <Text style={styles.toastYazi}>{toast.mesaj}</Text>
                <TouchableOpacity onPress={() => setToast({ goster: false, mesaj: '', tip: 'basari' })}>
                    <Text style={styles.toastKapat}>✕</Text>
                </TouchableOpacity>
            </View>
        )}

        <UstBar kullanici={kullanici} cikis={cikis} />

        {/* Başlık */}
        <View style={styles.sayfaBaslik}>
                <Text style={styles.sayfaBaslikYazi}>🎓 Eğitimler</Text>
                <TouchableOpacity style={styles.ekleBtn} onPress={() => { setForm(BOŞ_FORM); setFormHata(''); setEkleModal(true); }}>
                    <Text style={styles.ekleBtnYazi}> Eğitim Planla</Text>
                </TouchableOpacity>
            </View>

            {/* Banner'lar */}
            {gecmisler.length > 0 && (
                <View style={[styles.banner, styles.bannerKritik]}>
                    <Text style={styles.bannerIkon}>⚠️</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.bannerBaslik}>PLANLI EĞİTİM TARİHİ GEÇTİ!</Text>
                        <Text style={styles.bannerMesaj} numberOfLines={1}>
                            {gecmisler[0].ad} — {gecmisler[0].firma}
                        </Text>
                        {gecmisler.length > 1 && (
                            <Text style={styles.bannerEkstra}>+{gecmisler.length - 1} eğitim daha geçmiş</Text>
                        )}
                    </View>
                </View>
            )}
            {yaklasanlar.length > 0 && (
                <View style={[styles.banner, styles.bannerUyari]}>
                    <Text style={styles.bannerIkon}>🔴</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.bannerBaslik, { color: '#dc2626' }]}>
                            DİKKAT! {gunFarki(yaklasanlar[0].tarih) === 0 ? 'Eğitim BUGÜN!' : `Eğitime ${gunFarki(yaklasanlar[0].tarih)} Gün Kaldı`}
                        </Text>
                        <Text style={styles.bannerMesaj} numberOfLines={1}>
                            {yaklasanlar[0].ad} — {yaklasanlar[0].firma}
                        </Text>
                        {yaklasanlar.length > 1 && (
                            <Text style={styles.bannerEkstra}>+{yaklasanlar.length - 1} eğitim daha yaklaşıyor</Text>
                        )}
                    </View>
                </View>
            )}

            {/* Arama */}
            <View style={styles.aramaKutusu}>
                <Text style={styles.aramaIkon}>🔍</Text>
                <TextInput
                    style={styles.aramaInput}
                    value={arama}
                    onChangeText={setArama}
                    placeholder="Eğitim veya firma ara..."
                    placeholderTextColor="#94a3b8"
                    autoCorrect={false}
                />
                {arama ? <TouchableOpacity onPress={() => setArama('')}><Text style={styles.aramaSil}>✕</Text></TouchableOpacity> : null}
            </View>

            {/* Liste */}
            <FlatList
                data={filtrelenmis}
                keyExtractor={item => item._id}
                renderItem={({ item }) => (
                    <EgitimKart egitim={item} onDetay={() => detayAc(item)} durumStil={durumStil} gunFarki={gunFarki} />
                )}
                refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={yenile} colors={['#2563eb']} />}
                ListEmptyComponent={
                    <View style={styles.bosKart}>
                        <Text style={styles.bosIkon}>🎓</Text>
                        <Text style={styles.bosBaslik}>{arama ? 'Sonuç bulunamadı' : 'Henüz planlı bir eğitim yok'}</Text>
                        <Text style={styles.bosAciklama}>{arama ? 'Farklı bir arama deneyin' : 'Eğitim Planla butonuna basarak ekleyin'}</Text>
                    </View>
                }
                contentContainerStyle={styles.liste}
            />

            {/* ══ YENİ EĞİTİM MODAL ══ */}
            <Modal visible={ekleModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEkleModal(false)}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <SafeAreaView style={styles.modalKapsayici}>
                        <View style={styles.modalUst}>
                            <TouchableOpacity onPress={() => setEkleModal(false)} style={styles.modalIptalBtn}>
                                <Text style={styles.modalIptalYazi}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={ekleKaydet}
                                style={[styles.modalKaydetBtn, kaydediyor && { opacity: 0.6 }]}
                                disabled={kaydediyor}
                            >
                                {kaydediyor
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={styles.modalKaydetYazi}>Kaydet</Text>}
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalIcerik} keyboardShouldPersistTaps="handled">
                            {formHata ? <View style={styles.formHataKutu}><Text style={styles.formHataYazi}>⚠️ {formHata}</Text></View> : null}

                            {/* Eğitim türü */}
                            <FormGrup etiket="Eğitim Adı *">
                                <TouchableOpacity style={[styles.formInput, styles.seciciBtn]} onPress={() => { setTurArama(''); setTurModal(true); }}>
                                    <Text style={form.egitimAdi ? styles.seciciYazi : styles.seciciPlaceholder}>{form.egitimAdi || 'Eğitim seçiniz...'}</Text>
                                    <Text style={{ color: '#94a3b8' }}>▼</Text>
                                </TouchableOpacity>
                            </FormGrup>

                            {/* Firma */}
                            <FormGrup etiket="Firma *">
                                <TouchableOpacity style={[styles.formInput, styles.seciciBtn]} onPress={() => { setFirmaEkleArama(''); setFirmaEkleModal(true); }}>
                                    <Text style={secilenFirmaAdi ? styles.seciciYazi : styles.seciciPlaceholder}>{secilenFirmaAdi || 'Firma seçiniz...'}</Text>
                                    <Text style={{ color: '#94a3b8' }}>▼</Text>
                                </TouchableOpacity>
                            </FormGrup>

                            {/* Eğitmen */}
                            <FormGrup etiket="Eğitmen *">
                                <TextInput style={styles.formInput} value={form.egitmen} onChangeText={v => setForm(f => ({ ...f, egitmen: v }))} placeholder="Örn: Hamza Ünlü" placeholderTextColor="#94a3b8" />
                            </FormGrup>

                            {/* Tarih */}
                            <FormGrup etiket="Planlanan Tarih *">
    <TextInput
        style={styles.formInput}
        value={form.tarih}
        onChangeText={v => setForm(f => ({ ...f, tarih: v }))}
        placeholder="30.05.2026"
        placeholderTextColor="#94a3b8"
        keyboardType="numbers-and-punctuation"
    />
</FormGrup>

                            {/* Katılımcı */}
                            <FormGrup etiket="Tahmini Katılımcı *">
                                <TextInput style={styles.formInput} value={form.katilimci} onChangeText={v => setForm(f => ({ ...f, katilimci: v }))} placeholder="Örn: 20" placeholderTextColor="#94a3b8" keyboardType="numeric" />
                            </FormGrup>

                            {/* Mail checkbox */}
                            <TouchableOpacity style={styles.checkboxSatir} onPress={() => setForm(f => ({ ...f, mailGonder: !f.mailGonder }))}>
                                <View style={[styles.checkbox, form.mailGonder && styles.checkboxSecili]}>
                                    {form.mailGonder && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                                </View>
                                <Text style={styles.checkboxYazi}>📧 Firmaya e-posta gönder</Text>
                            </TouchableOpacity>

                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </SafeAreaView>
                </KeyboardAvoidingView>
            </Modal>

            {/* ══ DETAY / DÜZENLEME MODAL ══ */}
            <Modal visible={detayModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetayModal(false)}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <SafeAreaView style={styles.modalKapsayici}>
                        <View style={styles.modalUst}>
                            <TouchableOpacity onPress={() => setDetayModal(false)} style={styles.modalIptalBtn}>
                                <Text style={styles.modalIptalYazi}>İptal</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalBaslik}>📋 Eğitim Detayı</Text>
                            <TouchableOpacity
                                onPress={detayGuncelle}
                                style={[styles.modalKaydetBtn, detayKaydediyor && { opacity: 0.6 }]}
                                disabled={detayKaydediyor}
                            >
                                {detayKaydediyor
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={styles.modalKaydetYazi}>Kaydet</Text>}
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalIcerik} keyboardShouldPersistTaps="handled">
                            {/* Durum rozeti */}
                            {(() => {
                                const s = durumStil(detay.durum, isoFormatla(detay.tarih));
                                return (
                                    <View style={[styles.detayDurumBadge, { backgroundColor: s.bg }]}>
                                        <Text style={[styles.detayDurumYazi, { color: s.renk }]}>{s.etiket}</Text>
                                    </View>
                                );
                            })()}

                            <FormGrup etiket="Eğitim Adı">
                                <TextInput style={styles.formInput} value={detay.egitimAdi} onChangeText={v => setDetay(d => ({ ...d, egitimAdi: v }))} placeholderTextColor="#94a3b8" />
                            </FormGrup>

                            <FormGrup etiket="Firma">
                                <TextInput style={[styles.formInput, { color: '#94a3b8' }]} value={detay.firma} editable={false} />
                            </FormGrup>

                            <FormGrup etiket="Eğitmen">
                                <TextInput style={styles.formInput} value={detay.egitmen} onChangeText={v => setDetay(d => ({ ...d, egitmen: v }))} placeholderTextColor="#94a3b8" />
                            </FormGrup>

                            <FormGrup etiket="Tarih">
                                <TextInput style={styles.formInput} value={detay.tarih} onChangeText={v => setDetay(d => ({ ...d, tarih: v }))} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" keyboardType="numeric" />
                            </FormGrup>

                            <FormGrup etiket="Katılımcı Sayısı">
                                <TextInput style={styles.formInput} value={detay.katilimci} onChangeText={v => setDetay(d => ({ ...d, katilimci: v }))} keyboardType="numeric" placeholderTextColor="#94a3b8" />
                            </FormGrup>

                            {/* Durum seçimi */}
                            <FormGrup etiket="Durum Değiştir">
                                <TouchableOpacity style={[styles.formInput, styles.seciciBtn]} onPress={() => setDurumModal(true)}>
                                    <Text style={styles.seciciYazi}>{DURUM_SECENEKLER.find(d => d.deger === detay.durum)?.etiket || detay.durum}</Text>
                                    <Text style={{ color: '#94a3b8' }}>▼</Text>
                                </TouchableOpacity>
                            </FormGrup>

                            {/* Notlar */}
                            <FormGrup etiket="Notlar / Açıklama">
                                <TextInput
                                    style={[styles.formInput, { height: 90, textAlignVertical: 'top' }]}
                                    value={detay.notlar}
                                    onChangeText={v => setDetay(d => ({ ...d, notlar: v }))}
                                    placeholder="Notlar, erteleme/iptal nedeni..."
                                    placeholderTextColor="#94a3b8"
                                    multiline
                                />
                            </FormGrup>

                            {/* Mail checkbox */}
                            <TouchableOpacity style={styles.checkboxSatir} onPress={() => setDetay(d => ({ ...d, mailGonder: !d.mailGonder }))}>
                                <View style={[styles.checkbox, detay.mailGonder && styles.checkboxSecili]}>
                                    {detay.mailGonder && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                                </View>
                                <Text style={styles.checkboxYazi}>📧 Firmaya e-posta gönder</Text>
                            </TouchableOpacity>

                            {/* Sil butonu */}
                            <TouchableOpacity style={styles.silBtn} onPress={egitimSil}>
                                <Text style={styles.silBtnYazi}>🗑️ Eğitimi Sil</Text>
                            </TouchableOpacity>

                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </SafeAreaView>
                </KeyboardAvoidingView>
            </Modal>

            {/* ══ EĞİTİM TÜRÜ SEÇİM MODAL ══ */}
            <Modal visible={turModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTurModal(false)}>
                <SafeAreaView style={styles.modalKapsayici}>
                    <View style={styles.modalUst}>
                        <TouchableOpacity onPress={() => setTurModal(false)} style={styles.modalIptalBtn}>
                            <Text style={styles.modalIptalYazi}>İptal</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalBaslik}>🎓 Eğitim Seç</Text>
<TouchableOpacity
    onPress={() => { setTurEkleHata(''); setTurEkleForm(BOŞ_TUR_FORM); setTurEkleModal(true); }}
    style={styles.yeniTurBtn}
>
    <Text style={styles.yeniTurBtnYazi}>+ Yeni Eğitim Oluştur</Text>
</TouchableOpacity>
                    </View>
                    <View style={[styles.aramaKutusu, { marginTop: 8 }]}>
                        <Text style={styles.aramaIkon}>🔍</Text>
                        <TextInput style={styles.aramaInput} value={turArama} onChangeText={setTurArama} placeholder="Ara..." placeholderTextColor="#94a3b8" autoFocus />
                        {turArama ? <TouchableOpacity onPress={() => setTurArama('')}><Text style={styles.aramaSil}>✕</Text></TouchableOpacity> : null}
                    </View>
                    <FlatList
                        data={filtrelenmisTurler}
                        keyExtractor={item => item._id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.listeItem, item.ad === form.egitimAdi && styles.listeItemSecili]}
                                onPress={() => { setForm(f => ({ ...f, egitimAdi: item.ad })); setTurModal(false); }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.listeItemAd, item.ad === form.egitimAdi && { color: '#2563eb' }]}>{item.ad}</Text>
                                    {item.sureSaat > 0 && <Text style={styles.listeItemAlt}>{item.sureSaat} Saat</Text>}
                                </View>
                                {item.ad === form.egitimAdi && <Text style={{ color: '#2563eb', fontSize: 18 }}>✓</Text>}
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={<Text style={styles.bosListeYazi}>Eğitim türü bulunamadı</Text>}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    />
                </SafeAreaView>
            </Modal>

            {/* ══ YENİ EĞİTİM TÜRÜ EKLE MODAL ══ */}
<Modal visible={turEkleModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTurEkleModal(false)}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.modalKapsayici}>
            <View style={styles.modalUst}>
                <TouchableOpacity onPress={() => setTurEkleModal(false)} style={styles.modalIptalBtn}>
                    <Text style={styles.modalIptalYazi}>İptal</Text>
                </TouchableOpacity>
                <Text style={styles.modalBaslik}> Yeni Eğitim Türü</Text>
            </View>

            <ScrollView style={styles.modalIcerik} keyboardShouldPersistTaps="handled">
                {turEkleHata ? <View style={styles.formHataKutu}><Text style={styles.formHataYazi}>⚠️ {turEkleHata}</Text></View> : null}

                <FormGrup etiket="Eğitim Adı *">
                    <TextInput
                        style={styles.formInput}
                        value={turEkleForm.ad}
                        onChangeText={v => setTurEkleForm(f => ({ ...f, ad: v }))}
                        placeholder="Örn: Sapancı Eğitimi"
                        placeholderTextColor="#94a3b8"
                    />
                </FormGrup>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                        <FormGrup etiket="Süre (Saat)">
                            <TextInput
                                style={styles.formInput}
                                value={turEkleForm.sureSaat}
                                onChangeText={v => setTurEkleForm(f => ({ ...f, sureSaat: v }))}
                                placeholder="Örn: 8"
                                placeholderTextColor="#94a3b8"
                                keyboardType="numeric"
                            />
                        </FormGrup>
                    </View>
                    <View style={{ flex: 1 }}>
                        <FormGrup etiket="Geçerlilik (Ay)">
                            <TextInput
                                style={styles.formInput}
                                value={turEkleForm.gecerlilikSuresiAy}
                                onChangeText={v => setTurEkleForm(f => ({ ...f, gecerlilikSuresiAy: v }))}
                                placeholder="12"
                                placeholderTextColor="#94a3b8"
                                keyboardType="numeric"
                            />
                        </FormGrup>
                    </View>
                </View>

                <FormGrup etiket="Tehlike Sınıfı">
                    <TouchableOpacity style={[styles.formInput, styles.seciciBtn]} onPress={() => setTehlikeModal(true)}>
                        <Text style={styles.seciciYazi}>{turEkleForm.tehlikeSinifi}</Text>
                        <Text style={{ color: '#94a3b8' }}>▼</Text>
                    </TouchableOpacity>
                </FormGrup>

                <FormGrup etiket="Açıklama (Opsiyonel)">
                    <TextInput
                        style={[styles.formInput, { height: 90, textAlignVertical: 'top' }]}
                        value={turEkleForm.aciklama}
                        onChangeText={v => setTurEkleForm(f => ({ ...f, aciklama: v }))}
                        placeholder="Bu eğitim hakkında kısa açıklama..."
                        placeholderTextColor="#94a3b8"
                        multiline
                    />
                </FormGrup>

                <TouchableOpacity
                    onPress={yeniTurKaydet}
                    style={[styles.modalKaydetBtn, { backgroundColor: '#10b981' }, turEkleKaydediyor && { opacity: 0.6 }]}
                    disabled={turEkleKaydediyor}
                >
                    {turEkleKaydediyor
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.modalKaydetYazi}>Kaydet</Text>}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    </KeyboardAvoidingView>
</Modal>

{/* ══ TEHLİKE SINIFI SEÇİM MODAL ══ */}
<Modal visible={tehlikeModal} animationType="fade" transparent onRequestClose={() => setTehlikeModal(false)}>
    <TouchableOpacity style={styles.durumModalArka} activeOpacity={1} onPress={() => setTehlikeModal(false)}>
        <View style={styles.durumModalKutu}>
            <Text style={styles.durumModalBaslik}>Tehlike Sınıfı Seç</Text>
            {TEHLIKE_SECENEKLER.map(t => (
                <TouchableOpacity
                    key={t}
                    style={[styles.durumSecenekItem, t === turEkleForm.tehlikeSinifi && styles.durumSecenekSecili]}
                    onPress={() => { setTurEkleForm(f => ({ ...f, tehlikeSinifi: t })); setTehlikeModal(false); }}
                >
                    <Text style={[styles.durumSecenekYazi, t === turEkleForm.tehlikeSinifi && { color: '#2563eb', fontWeight: '700' }]}>{t}</Text>
                    {t === turEkleForm.tehlikeSinifi && <Text style={{ color: '#2563eb' }}>✓</Text>}
                </TouchableOpacity>
            ))}
        </View>
    </TouchableOpacity>
</Modal>

            {/* ══ FİRMA SEÇİM MODAL (ekleme formu) ══ */}
            <Modal visible={firmaEkleModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFirmaEkleModal(false)}>
                <SafeAreaView style={styles.modalKapsayici}>
                    <View style={styles.modalUst}>
                        <TouchableOpacity onPress={() => setFirmaEkleModal(false)} style={styles.modalIptalBtn}>
                            <Text style={styles.modalIptalYazi}>İptal</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalBaslik}>🏢 Firma Seç</Text>
                        <View style={{ width: 60 }} />
                    </View>
                    <View style={[styles.aramaKutusu, { marginTop: 8 }]}>
                        <Text style={styles.aramaIkon}>🔍</Text>
                        <TextInput style={styles.aramaInput} value={firmaEkleArama} onChangeText={setFirmaEkleArama} placeholder="Firma ara..." placeholderTextColor="#94a3b8" autoFocus />
                        {firmaEkleArama ? <TouchableOpacity onPress={() => setFirmaEkleArama('')}><Text style={styles.aramaSil}>✕</Text></TouchableOpacity> : null}
                    </View>
                    <FlatList
                        data={filtrelenmisEkleFirma}
                        keyExtractor={item => item._id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.listeItem, item._id === form.firmaId && styles.listeItemSecili]}
                                onPress={() => { setForm(f => ({ ...f, firmaId: item._id })); setFirmaEkleModal(false); }}
                            >
                                <Text style={[styles.listeItemAd, item._id === form.firmaId && { color: '#2563eb' }]}>{item.firmaAdi}</Text>
                                {item._id === form.firmaId && <Text style={{ color: '#2563eb', fontSize: 18 }}>✓</Text>}
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={<Text style={styles.bosListeYazi}>Firma bulunamadı</Text>}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    />
                </SafeAreaView>
            </Modal>

            {/* ══ DURUM SEÇİM MODAL ══ */}
            <Modal visible={durumModal} animationType="fade" transparent onRequestClose={() => setDurumModal(false)}>
                <TouchableOpacity style={styles.durumModalArka} activeOpacity={1} onPress={() => setDurumModal(false)}>
                    <View style={styles.durumModalKutu}>
                        <Text style={styles.durumModalBaslik}>Durum Seç</Text>
                        {DURUM_SECENEKLER.map(d => (
                            <TouchableOpacity
                                key={d.deger}
                                style={[styles.durumSecenekItem, d.deger === detay.durum && styles.durumSecenekSecili]}
                                onPress={() => { setDetay(dd => ({ ...dd, durum: d.deger })); setDurumModal(false); }}
                            >
                                <Text style={[styles.durumSecenekYazi, d.deger === detay.durum && { color: '#2563eb', fontWeight: '700' }]}>{d.etiket}</Text>
                                {d.deger === detay.durum && <Text style={{ color: '#2563eb' }}>✓</Text>}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// ALT BİLEŞENLER
// ═══════════════════════════════════════════════════════════════════════

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

function FormGrup({ etiket, children }) {
    return (
        <View style={styles.formGrup}>
            <Text style={styles.formEtiket}>{etiket}</Text>
            {children}
        </View>
    );
}

function EgitimKart({ egitim, onDetay, durumStil, gunFarki }) {
    const stil = durumStil(egitim.durum, egitim.tarih);
    const g    = egitim.durum === 'PLANLANDI' ? gunFarki(egitim.tarih) : null;

    return (
        <TouchableOpacity style={[styles.kart, g !== null && g < 0 && styles.kartGecmis, g !== null && g >= 0 && g <= 10 && styles.kartKritik]} onPress={onDetay} activeOpacity={0.85}>
            <View style={styles.kartUst}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.kartAd} numberOfLines={1}>{egitim.ad}</Text>
                    {g !== null && (
                        <View style={[styles.sureBadge, { backgroundColor: stil.bg }]}>
                            <Text style={[styles.sureBadgeYazi, { color: stil.renk }]}>
                                {g < 0 ? `${Math.abs(g)} GÜN GECİKTİ` : g === 0 ? 'BUGÜN' : `${g} GÜN`}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={[styles.durumRozet, { backgroundColor: stil.bg }]}>
                    <Text style={[styles.durumRozetYazi, { color: stil.renk }]}>{stil.etiket}</Text>
                </View>
            </View>
            <View style={styles.kartBilgiler}>
                <Text style={styles.kartBilgi} numberOfLines={1}>🏢 {egitim.firma}</Text>
                <Text style={styles.kartBilgi} numberOfLines={1}>👤 {egitim.egitmen}</Text>
            </View>
            <View style={styles.kartAlt}>
                <Text style={styles.kartAltYazi}>📅 {egitim.tarih}</Text>
                <Text style={styles.kartAltYazi}>👥 {egitim.katilimci} Kişi</Text>
                <Text style={styles.kartDetay}>Detay ›</Text>
            </View>
        </TouchableOpacity>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// STİLLER
// ═══════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
    container:  { flex: 1, backgroundColor: '#f8fafc' },
    merkez:     { flex: 1, justifyContent: 'center', alignItems: 'center' },

    ustBar: {
        backgroundColor: '#1e3a8a', padding: 20, paddingTop: 45,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    ustBarBaslik:  { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    ustBarAltyazi: { color: '#bfdbfe', fontSize: 12, marginTop: 2 },
    cikisBtn:      { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    cikisBtnYazi:  { color: '#fff', fontWeight: '600', fontSize: 13 },

    sayfaBaslik: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    sayfaBaslikYazi: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
    ekleBtn:     { backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
    ekleBtnYazi: { color: '#fff', fontWeight: '700', fontSize: 13 },

    // Banner
    banner: { marginHorizontal: 12, marginBottom: 8, padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    bannerKritik: { backgroundColor: '#fce7f3', borderLeftWidth: 4, borderLeftColor: '#9d174d' },
    bannerUyari:  { backgroundColor: '#fee2e2', borderLeftWidth: 4, borderLeftColor: '#dc2626' },
    bannerIkon:   { fontSize: 20 },
    bannerBaslik: { fontSize: 13, fontWeight: '700', color: '#9d174d', marginBottom: 2 },
    bannerMesaj:  { fontSize: 12, color: '#475569' },
    bannerEkstra: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

    // Arama
    aramaKutusu: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
    aramaIkon:   { fontSize: 14, marginRight: 8 },
    aramaInput:  { flex: 1, paddingVertical: 12, fontSize: 14, color: '#0f172a' },
    aramaSil:    { fontSize: 16, color: '#94a3b8', padding: 4 },

    liste: { paddingHorizontal: 12, paddingBottom: 180 },

    // Kart
    kart: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 8, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
    kartGecmis: { borderLeftWidth: 4, borderLeftColor: '#9d174d', backgroundColor: '#fdf2f8' },
    kartKritik: { borderLeftWidth: 4, borderLeftColor: '#dc2626', backgroundColor: '#fff5f5' },
    kartUst:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
    kartAd:     { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
    sureBadge:  { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    sureBadgeYazi: { fontSize: 10, fontWeight: '700' },
    durumRozet: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
    durumRozetYazi: { fontSize: 10, fontWeight: '700' },
    kartBilgiler: { gap: 3, marginBottom: 8 },
    kartBilgi:  { fontSize: 12, color: '#475569' },
    kartAlt:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
    kartAltYazi:{ fontSize: 11, color: '#94a3b8' },
    kartDetay:  { marginLeft: 'auto', fontSize: 12, color: '#2563eb', fontWeight: '600' },

    // Boş
    bosKart:     { margin: 16, padding: 32, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    bosIkon:     { fontSize: 48, marginBottom: 8 },
    bosBaslik:   { fontSize: 16, fontWeight: 'bold', color: '#475569', marginBottom: 4 },
    bosAciklama: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },

    // Modal genel
    modalKapsayici: { flex: 1, backgroundColor: '#f8fafc' },
    modalUst: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    modalBaslik:    { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
    modalIptalBtn:  { padding: 4 },
    modalIptalYazi: { fontSize: 15, color: '#64748b' },
    modalKaydetBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, minWidth: 60, alignItems: 'center' },
    modalKaydetYazi:{ color: '#fff', fontWeight: '700', fontSize: 14 },
    modalIcerik:    { flex: 1, padding: 16 },

    formHataKutu: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#fecaca' },
    formHataYazi: { color: '#dc2626', fontSize: 13 },
    formGrup:     { marginBottom: 16 },
    formEtiket:   { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
    formInput:    { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0f172a' },
    seciciBtn:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    seciciYazi:   { fontSize: 15, color: '#0f172a', flex: 1 },
    seciciPlaceholder: { fontSize: 15, color: '#94a3b8', flex: 1 },

    // Checkbox
    checkboxSatir: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#eff6ff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 16 },
    checkbox:      { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
    checkboxSecili:{ backgroundColor: '#2563eb' },
    checkboxYazi:  { fontSize: 13, color: '#1e40af', fontWeight: '600' },

    // Detay durum badge
    detayDurumBadge: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginBottom: 16 },
    detayDurumYazi:  { fontSize: 14, fontWeight: '700' },

    // Sil butonu
    silBtn:    { backgroundColor: '#fee2e2', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#fecaca' },
    silBtnYazi:{ color: '#dc2626', fontWeight: '700', fontSize: 14 },

    // Liste item (modal seçim)
    listeItem:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
    listeItemSecili:{ backgroundColor: '#eff6ff' },
    listeItemAd:    { fontSize: 15, color: '#0f172a' },
    listeItemAlt:   { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    bosListeYazi:   { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },

    // Durum seçim modal
    durumModalArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    durumModalKutu: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 30 },
    durumModalBaslik: { fontSize: 16, fontWeight: '700', color: '#0f172a', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    durumSecenekItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    durumSecenekSecili: { backgroundColor: '#eff6ff' },
    durumSecenekYazi: { fontSize: 15, color: '#0f172a' },

    yeniTurBtn:     { backgroundColor: '#10b981', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
yeniTurBtnYazi: { color: '#fff', fontWeight: '700', fontSize: 10 },
ipucuKutu:      { marginHorizontal: 12, marginBottom: 8, padding: 10, backgroundColor: '#fef3c7', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
ipucuYazi:      { fontSize: 12, color: '#92400e' },

toast: {
    position: 'absolute',
    top: 95,
    left: 12,
    right: 12,
    padding: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    zIndex: 9999,
},
toastBasari: { backgroundColor: '#16a34a' },
toastHata:   { backgroundColor: '#dc2626' },
toastYazi:   { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1, marginRight: 8 },
toastKapat:  { color: '#fff', fontSize: 16, fontWeight: '700' },
});