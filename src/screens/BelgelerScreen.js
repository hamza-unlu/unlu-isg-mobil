// ═══════════════════════════════════════════════════════════════════════
// KATEGORİ BELGELERİ EKRANI
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView, FlatList,
    ActivityIndicator, RefreshControl, Alert, Platform,
    TextInput, ScrollView, Switch, Modal,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { api } from '../services/api';

// ─── Sabitler ──────────────────────────────────────────────────────────
const SADECE_KAYIT_KATEGORILERI    = ['olcum'];
const PERSONEL_KAYIT_KATEGORILERI  = ['muayene', 'egitim', 'ilkyardim'];

const PK_PERIYOT_YIL = {
    muayene:   { 'cok-tehlikeli': 1, 'tehlikeli': 3, 'az-tehlikeli': 5, '': 5 },
    egitim:    { 'cok-tehlikeli': 1, 'tehlikeli': 2, 'az-tehlikeli': 3, '': 3 },
    ilkyardim: { 'cok-tehlikeli': 3, 'tehlikeli': 3, 'az-tehlikeli': 3, '': 3 },
};

const ILKYARDIM_ORAN = {
    'cok-tehlikeli': 10, 'tehlikeli': 15, 'az-tehlikeli': 20, '': 20,
};

const PK_META = {
    muayene: {
        baslik: 'Periyodik Sağlık Muayenesi', ikon: '🩺',
        tarih1Label: 'Son Muayene', tarih2Label: 'Sonraki Tarih',
        tarih1Field: 'muayeneTarih', tarih2Field: 'gecerliTarih',
        anahtarPrefix: 'muayene_verileri_',
        gorButon: 'Personel Muayene Durumunu Görüntüle',
        belgeBaslik: '📁 Muayene Raporları',
    },
    egitim: {
        baslik: 'Temel İSG Eğitimi', ikon: '🎓',
        tarih1Label: 'Son Eğitim', tarih2Label: 'Sonraki Tarih',
        tarih1Field: 'egitimTarih', tarih2Field: 'gecerliTarih',
        anahtarPrefix: 'egitim_verileri_',
        gorButon: 'Personel Eğitim Durumunu Görüntüle',
        belgeBaslik: '📁 Eğitim Belgeleri',
    },
    ilkyardim: {
        baslik: 'İlkyardımcı Eğitimi', ikon: '⛑️',
        tarih1Label: 'Son Eğitim', tarih2Label: 'Sonraki Tarih (3 yıl)',
        tarih1Field: 'egitimTarih', tarih2Field: 'gecerliTarih',
        anahtarPrefix: 'ilkyardim_verileri_',
        gorButon: 'İlkyardımcı Eğitim Durumunu Görüntüle',
        belgeBaslik: '📁 Sertifikalar',
    },
};

const TARIH_BELGE_KATEGORILERI = ['rv', 'adp', 'tatbikat', 'denetim', 'kkd'];

function _rvAdpYil(sinif) {
    if (sinif === 'cok-tehlikeli') return 2;
    if (sinif === 'tehlikeli')     return 4;
    return 6;
}

// TB_META: tarih1Field/tarih2Field = firma.isg.* alanı (backend ile birebir)
const TB_META = {
    rv: {
        baslik: 'Risk Değerlendirmesi', ikon: '⚠️',
        tarih1Label: 'Yapılma Tarihi', tarih1Field: 'rvTarih',
        tarih2Label: 'Revizyon',       tarih2Field: 'rvRevizyon',
        tarih2Oto: true, periyotYil: _rvAdpYil,
        belgeBaslik: '📁 Risk Analiz Dosyaları', renk: '#dc2626',
    },
    adp: {
        baslik: 'Acil Durum Planı', ikon: '🚨',
        tarih1Label: 'Hazırlanma',   tarih1Field: 'adpTarih',
        tarih2Label: 'Revizyon',     tarih2Field: 'adpRevizyon',
        tarih2Oto: true, periyotYil: _rvAdpYil,
        belgeBaslik: '📁 Plan Dosyaları', renk: '#ea580c',
    },
    tatbikat: {
        baslik: 'Acil Durum Tatbikatı', ikon: '🧯',
        tarih1Label: 'Son Tatbikat',    tarih1Field: 'tatbikatSon',
        tarih2Label: 'Sonraki (1 yıl)', tarih2Field: 'tatbikatSonraki',
        tarih2Oto: true, periyotYil: () => 1,
        belgeBaslik: '📁 Tatbikat Raporları', renk: '#dc2626',
    },
    denetim: {
        baslik: 'DİF/DÖF Takibi', ikon: '📋',
        tarih1Label: 'Hazırlanma Tarihi',       tarih1Field: 'denetimTarih',
        tarih2Label: 'Son Geçerlilik Tarihi',   tarih2Field: 'denetimGecerlilik',
        tarih2Oto: false, periyotYil: null, ekstra: 'mailAt',
        belgeBaslik: '📁 DİF/DÖF Belgeleri', renk: '#7c3aed',
    },
    kkd: {
        baslik: 'KKD Takibi', ikon: '🦺',
        tarih1Label: 'Teslim Tarihi',           tarih1Field: 'kkdTarih',
        tarih2Label: 'Son Geçerlilik Tarihi',   tarih2Field: 'kkdGecerlilik',
        tarih2Oto: false, periyotYil: null,
        belgeBaslik: '📁 KKD Belgeleri', renk: '#0284c7',
    },
};

const OLCUM_PERIYOTLAR = [
    { kod: '6ay',   etiket: '6 Aylık',   deger: 6,  birim: 'ay'  },
    { kod: '1yil',  etiket: 'Yıllık',    deger: 1,  birim: 'yil' },
    { kod: '3yil',  etiket: '3 Yıllık',  deger: 3,  birim: 'yil' },
    { kod: '5yil',  etiket: '5 Yıllık',  deger: 5,  birim: 'yil' },
    { kod: '10yil', etiket: '10 Yıllık', deger: 10, birim: 'yil' },
];

const KURUL_PERIYOT_AY = {
    'cok-tehlikeli': 1, 'tehlikeli': 2, 'az-tehlikeli': 3,
};
const KURUL_SINIF_BILGI = {
    'cok-tehlikeli': { yazi: '🔴 Çok Tehlikeli — Ayda 1 toplantı zorunlu',  renk: '#991b1b', bg: '#fee2e2', bd: '#fecaca' },
    'tehlikeli':     { yazi: '🟠 Tehlikeli — 2 ayda 1 toplantı zorunlu',    renk: '#92400e', bg: '#fef3c7', bd: '#fde68a' },
    'az-tehlikeli':  { yazi: '🟢 Az Tehlikeli — 3 ayda 1 toplantı zorunlu', renk: '#166534', bg: '#dcfce7', bd: '#bbf7d0' },
    '':              { yazi: 'ℹ️ Firmaya tehlike sınıfı atanmamış',         renk: '#475569', bg: '#f1f5f9', bd: '#e2e8f0' },
};

function _tehlikeSinifiNormalize(deger) {
    if (!deger) return '';
    const s = String(deger).toLowerCase().trim();
    if (s.includes('çok') || s.includes('cok') || s === 'a' || s === 'cok-tehlikeli') return 'cok-tehlikeli';
    if (s.includes('az')  || s === 'c' || s === 'az-tehlikeli') return 'az-tehlikeli';
    if (s.includes('tehl') || s === 'b' || s === 'tehlikeli') return 'tehlikeli';
    return '';
}

function _personelKey(personel) {
    const ad = ((personel.adSoyad || personel.ad || '')).replace(/\s+/g, '_');
    const tc = (personel.tcKimlik || personel.tc || String(personel.id || personel._id || '')).trim();
    return (ad + '_' + tc).replace(/[^a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]/g, '');
}

function _durumHesapla(gecerliTarih) {
    if (!gecerliTarih) return { tip: 'yok',     renk: '#94a3b8', bg: '#f1f5f9', metin: '— Tarih Yok' };
    const gun = farkGunHesapla(gecerliTarih);
    if (gun === null)  return { tip: 'yok',     renk: '#94a3b8', bg: '#f1f5f9', metin: '— Tarih Yok' };
    if (gun <= 0)      return { tip: 'kritik',  renk: '#991b1b', bg: '#fee2e2', metin: '✗ Süresi Doldu' };
    if (gun <= 10)     return { tip: 'kritik',  renk: '#991b1b', bg: '#fee2e2', metin: `🔴 ${gun} Gün` };
    if (gun <= 30)     return { tip: 'uyari',   renk: '#92400e', bg: '#fef3c7', metin: `🟠 ${gun} Gün` };
    return                    { tip: 'gecerli', renk: '#166534', bg: '#dcfce7', metin: `✓ ${gun} Gün` };
}

const DESTEK_EKIPLER = [
    { key: 'koruma',    label: 'Koruma Ekibi',    ikon: '🛡️', renk: '#1d4ed8', bg: '#dbeafe' },
    { key: 'kurtarma',  label: 'Kurtarma Ekibi',  ikon: '🏊',  renk: '#0369a1', bg: '#e0f2fe' },
    { key: 'sondurme',  label: 'Söndürme Ekibi',  ikon: '🧯',  renk: '#b45309', bg: '#fef3c7' },
    { key: 'ilkyardim', label: 'İlkyardım Ekibi', ikon: '🩺',  renk: '#dc2626', bg: '#fee2e2' },
];

function _destekPersonelKey(p) {
    const ad    = p.adSoyad || p.ad || '';
    const gorev = p.gorev   || p.pozisyon || '';
    return (ad + '_' + gorev).replace(/\s+/g, '_').toLowerCase();
}

// ═══════════════════════════════════════════════════════════════════════
// ANA EKRAN
// ═══════════════════════════════════════════════════════════════════════
export default function BelgelerScreen({ route, navigation }) {
    const { firmaId, firmaAdi, kategori, kategoriAd, kategoriIkon } = route.params;

    const UZMAN_MODU          = kategori === 'uzman';
    const TEMSILCI_MODU       = kategori === 'temsilci';
    const KURUL_MODU          = kategori === 'kurul';
    const DESTEK_MODU         = kategori === 'destek';
    const ILKYARDIM_MODU      = kategori === 'ilkyardim';
    const PERSONEL_KAYIT_MODU = PERSONEL_KAYIT_KATEGORILERI.includes(kategori);
    const TARIH_BELGE_MODU    = TARIH_BELGE_KATEGORILERI.includes(kategori);
    const OLCUM_MODU          = kategori === 'olcum';
    const SADECE_KAYIT        = SADECE_KAYIT_KATEGORILERI.includes(kategori);
    const BELGE_YUKLE_AKTIF   = !UZMAN_MODU && !SADECE_KAYIT;

    // ── State ────────────────────────────────────────────────────────
    const [belgeler,        setBelgeler]        = useState([]);
    const [yukleniyor,      setYukleniyor]      = useState(true);
    const [yenileniyor,     setYenileniyor]     = useState(false);
    const [hata,            setHata]            = useState('');
    const [aciliyor,        setAciliyor]        = useState(null);
    const [yukleniyorBelge, setYukleniyorBelge] = useState(false);
    // Seçilen ama henüz yüklenmeyen dosya — Kaydet butonuna basınca yüklenir
    const [secilenDosya,    setSecilenDosya]    = useState(null);

    const [personeller,          setPersoneller]          = useState([]);
    const [temsilciSecimi,       setTemsilciSecimi]       = useState('');
    const [temsilciTarih,        setTemsilciTarih]        = useState('');
    const [temsilciKaydediyor,   setTemsilciKaydediyor]   = useState(false);

    const [uzmanForm, setUzmanForm] = useState({
        igu: { ad: '', atamaTarihi: '' }, hekim: { ad: '', atamaTarihi: '' }, dsp: { ad: '', atamaTarihi: '' },
    });
    const [uzmanKaydediyor, setUzmanKaydediyor] = useState(false);

    const [kurulState, setKurulState] = useState({
        zorunluDegil: false, planTarih: '', gecmis: [], tehlikeSinifi: '',
    });
    const [kurulKaydediyor, setKurulKaydediyor] = useState(false);

    const [pkFirmaPersonelleri, setPkFirmaPersonelleri] = useState([]);
    const [pkKayitlar,          setPkKayitlar]          = useState({});
    const [pkSeciliPersonel,    setPkSeciliPersonel]    = useState('');
    const [pkTarih1,            setPkTarih1]            = useState('');
    const [pkTarih2,            setPkTarih2]            = useState('');
    const [pkKaydediyor,        setPkKaydediyor]        = useState(false);
    const [pkModalGoster,       setPkModalGoster]       = useState(false);
    const [pkSeciciGoster,      setPkSeciciGoster]      = useState(false);

    const [firmaTehlikeSinifi, setFirmaTehlikeSinifi] = useState('');

    const [tbTarih1,        setTbTarih1]        = useState('');
    const [tbTarih2,        setTbTarih2]        = useState('');
    const [tbMailAt,        setTbMailAt]        = useState(false);
    const [tbKaydediyor,    setTbKaydediyor]    = useState(false);

    const [olcumForm, setOlcumForm] = useState({
        ekipmanAdi: '', seriNo: '', raporNo: '', kontrolFirma: '',
        raporTarihi: '', kontrolPeriyodu: '1yil', gecerlilikTarihi: '',
    });
    const [olcumListesi,              setOlcumListesi]              = useState([]);
    const [olcumKaydediyor,           setOlcumKaydediyor]           = useState(false);
    const [olcumModalGoster,          setOlcumModalGoster]          = useState(false);
    const [olcumPeriyotSeciciGoster,  setOlcumPeriyotSeciciGoster]  = useState(false);

    const [destekData,       setDestekData]       = useState({});
    const [destekSecimler,   setDestekSecimler]   = useState({});
    const [destekTarihler,   setDestekTarihler]   = useState({});
    const [destekKaydediyor, setDestekKaydediyor] = useState({});
    const [destekModalAcik,  setDestekModalAcik]  = useState(false);
    const [personelModal,    setPersonelModal]     = useState({ acik: false, ekip: null });
    const [aramaMetni,       setAramaMetni]        = useState('');

    // Belge işlem modalı (sil / tarih güncelle)
    const [belgeIslemModal,  setBelgeIslemModal]  = useState({ acik: false, belge: null });
    const [belgeYeniTarih,   setBelgeYeniTarih]   = useState('');
    const [belgeIslemYukleniyor, setBelgeIslemYukleniyor] = useState(false);

    const [toast, setToast] = useState({ goster: false, mesaj: '', tip: 'basari' });
    const toastGoster = useCallback((mesaj, tip = 'basari') => {
        setToast({ goster: true, mesaj, tip });
        setTimeout(() => setToast({ goster: false, mesaj: '', tip: 'basari' }), 3500);
    }, []);

    const flatListRef    = useRef(null);
    const belgelereScroll = useCallback(() => {
        if (flatListRef.current && belgeler.length > 0) {
            try { flatListRef.current.scrollToEnd({ animated: true }); } catch {}
        }
    }, [belgeler.length]);

    // ── Belge listesi ─────────────────────────────────────────────────
    const verileriYukle = useCallback(async () => {
        try {
            setHata('');
            const yanit = await api.get(`/api/dokumanlar/mobil-kategori/${firmaId}/${kategori}`);
            setBelgeler(yanit.belgeler || []);
        } catch (err) {
            setHata(err.message || 'Belgeler yüklenemedi');
        } finally {
            setYukleniyor(false);
            setYenileniyor(false);
        }
    }, [firmaId, kategori]);

    // ── Uzman ─────────────────────────────────────────────────────────
    const uzmanVerileriYukle = useCallback(async () => {
        if (!UZMAN_MODU) return;
        try {
            const yanit = await api.get(`/api/dokumanlar/uzman/${encodeURIComponent(firmaAdi)}`);
            setUzmanForm({
                igu:   yanit?.igu   || { ad: '', atamaTarihi: '' },
                hekim: yanit?.hekim || { ad: '', atamaTarihi: '' },
                dsp:   yanit?.dsp   || { ad: '', atamaTarihi: '' },
            });
        } catch (err) { console.log('Uzman verisi:', err.message); }
    }, [firmaAdi, UZMAN_MODU]);

    // ── Personel listesi ──────────────────────────────────────────────
    const personelleriYukle = useCallback(async () => {
        if (!TEMSILCI_MODU && !PERSONEL_KAYIT_MODU && !DESTEK_MODU) return;
        try {
            const yanit = await api.get(`/api/personel?firmaId=${firmaId}`);
            const liste = yanit.veri || yanit;
            const arr   = Array.isArray(liste) ? liste : [];
            setPersoneller(arr);
            setPkFirmaPersonelleri(arr);
        } catch (err) { console.log('Personel:', err.message); }
    }, [firmaId, TEMSILCI_MODU, PERSONEL_KAYIT_MODU, DESTEK_MODU]);

    // ── Firma detayı (tehlike sınıfı + isg alanları) ─────────────────
    const firmaDetayiYukle = useCallback(async () => {
        if (!KURUL_MODU && !PERSONEL_KAYIT_MODU && !TARIH_BELGE_MODU) return;
        try {
            const detay = await api.get(`/api/dokumanlar/mobil-firma-detay/${firmaId}`);
            const firma = detay?.firma || {};
            const sinif = _tehlikeSinifiNormalize(firma.tehlikeSinifi);
            setFirmaTehlikeSinifi(sinif);

            if (TARIH_BELGE_MODU) {
                const meta    = TB_META[kategori];
                const isgData = firma.isg || {};
                if (meta) {
                    setTbTarih1(isgData[meta.tarih1Field] || '');
                    setTbTarih2(isgData[meta.tarih2Field] || '');
                    if (kategori === 'denetim') setTbMailAt(!!isgData.denetimMailAt);
                }
            }
            if (KURUL_MODU) {
                const isgData = firma.isg || {};
                setKurulState({
                    zorunluDegil:  !!isgData.kurulZorunluDegil,
                    planTarih:     isgData.kurulToplanti || '',
                    gecmis:        Array.isArray(isgData.kurulGecmisToplantılar) ? isgData.kurulGecmisToplantılar : [],
                    tehlikeSinifi: sinif,
                });
            }
        } catch (err) { console.log('[firmaDetayi]', err.message); }
    }, [firmaId, kategori, KURUL_MODU, PERSONEL_KAYIT_MODU, TARIH_BELGE_MODU]);

    // ── Personel Kayıt ─────────────────────────────────────────────────
    const pkVerileriniYukle = useCallback(async () => {
        if (!PERSONEL_KAYIT_MODU) return;
        const meta = PK_META[kategori];
        if (!meta) return;
        try {
            const anahtar = encodeURIComponent(meta.anahtarPrefix + firmaAdi);
            const veri    = await api.get(`/api/veri/${anahtar}`);
            setPkKayitlar(veri && typeof veri === 'object' ? veri : {});
        } catch { setPkKayitlar({}); }
    }, [firmaAdi, kategori, PERSONEL_KAYIT_MODU]);

    // ── Ölçüm ──────────────────────────────────────────────────────────
    const olcumVerisiniYukle = useCallback(async () => {
        if (!OLCUM_MODU) return;
        try {
            const anahtar = encodeURIComponent('olcum_ekipman_verileri_' + firmaAdi);
            const veri    = await api.get(`/api/veri/${anahtar}`);
            setOlcumListesi(Array.isArray(veri) ? veri : []);
        } catch { setOlcumListesi([]); }
    }, [firmaAdi, OLCUM_MODU]);

    // ── Destek ─────────────────────────────────────────────────────────
    const destekVerileriniYukle = useCallback(async () => {
        if (!DESTEK_MODU) return;
        try {
            const storageKey = encodeURIComponent('destek_verileri_' + firmaAdi);
            const dd = await api.get(`/api/veri/${storageKey}`);
            setDestekData(dd && typeof dd === 'object' ? dd : {});
        } catch { setDestekData({}); }
    }, [firmaAdi, DESTEK_MODU]);

    useEffect(() => { verileriYukle(); },         [verileriYukle]);
    useEffect(() => { uzmanVerileriYukle(); },    [uzmanVerileriYukle]);
    useEffect(() => { personelleriYukle(); },     [personelleriYukle]);
    useEffect(() => { firmaDetayiYukle(); },      [firmaDetayiYukle]);
    useEffect(() => { pkVerileriniYukle(); },     [pkVerileriniYukle]);
    useEffect(() => { olcumVerisiniYukle(); },    [olcumVerisiniYukle]);
    useEffect(() => { destekVerileriniYukle(); }, [destekVerileriniYukle]);

    const yenile = useCallback(() => {
        setYenileniyor(true);
        verileriYukle();
        firmaDetayiYukle();
        if (PERSONEL_KAYIT_MODU) pkVerileriniYukle();
        if (OLCUM_MODU)          olcumVerisiniYukle();
        if (DESTEK_MODU)         destekVerileriniYukle();
    }, [verileriYukle, firmaDetayiYukle, pkVerileriniYukle,
        olcumVerisiniYukle, destekVerileriniYukle,
        PERSONEL_KAYIT_MODU, OLCUM_MODU, DESTEK_MODU]);

    // ── Uzman kaydet ──────────────────────────────────────────────────
    const uzmanKaydet = async () => {
        const igu   = (uzmanForm.igu.ad || '').trim();
        const hekim = (uzmanForm.hekim.ad || '').trim();
        const dsp   = (uzmanForm.dsp.ad || '').trim();
        if (!igu && !hekim && !dsp)
            return Alert.alert('Eksik Bilgi', 'Lütfen en az bir kişi için ad giriniz.');
        try {
            setUzmanKaydediyor(true);
            await api.post(`/api/dokumanlar/uzman/${encodeURIComponent(firmaAdi)}`, {
                igu: { ad: igu, atamaTarihi: uzmanForm.igu.atamaTarihi || null },
                hekim: { ad: hekim, atamaTarihi: uzmanForm.hekim.atamaTarihi || null },
                dsp: { ad: dsp, atamaTarihi: uzmanForm.dsp.atamaTarihi || null },
            });
            toastGoster('✅ Uzman/Hekim/DSP bilgileri kaydedildi.');
        } catch (err) {
            Alert.alert('Hata', err.message || 'Kaydedilemedi.');
        } finally { setUzmanKaydediyor(false); }
    };

    // ── Temsilci kaydet ───────────────────────────────────────────────
    const temsilciKaydet = async () => {
        if (!temsilciSecimi) return Alert.alert('Eksik Bilgi', 'Lütfen bir personel seçiniz.');
        if (!temsilciTarih)  return Alert.alert('Eksik Bilgi', 'Atama tarihi giriniz.');
        try {
            setTemsilciKaydediyor(true);
            const secilen    = personeller.find(p => p._id === temsilciSecimi);
            const personelAd = secilen?.adSoyad || 'Personel';
            const key        = `${personelAd}_${Date.now()}`;
            const anahtar    = encodeURIComponent('temsilci_verileri_' + firmaAdi);
            let mevcut = {};
            try { mevcut = await api.get(`/api/veri/${anahtar}`) || {}; } catch {}
            mevcut[key] = { atamaTarih: temsilciTarih, personelAd };
            await api.post(`/api/veri/${anahtar}`, mevcut);
            toastGoster('✅ Çalışan temsilcisi başarıyla atandı.');
            setTemsilciSecimi(''); setTemsilciTarih('');
            await verileriYukle();
        } catch (err) {
            Alert.alert('Hata', err.message || 'Temsilci atanamadı.');
        } finally { setTemsilciKaydediyor(false); }
    };

    // ── İSG Kurulu ────────────────────────────────────────────────────
    const _kurulSunucuyaYaz = async (yeniState) => {
        await api.put(`/api/firmalar/${firmaId}`, {
            isg: {
                kurulZorunluDegil:      yeniState.zorunluDegil,
                kurulToplanti:          yeniState.planTarih,
                kurulGecmisToplantılar: [...yeniState.gecmis],
            }
        });
    };

    const kurulKaydet = async (sessiz = false) => {
        try {
            setKurulKaydediyor(true);
            await _kurulSunucuyaYaz(kurulState);
            await belgeYukleGercek(); // seçili belge varsa yükle
            if (!sessiz) toastGoster('✅ Kurul bilgileri kaydedildi.');
        } catch (err) {
            Alert.alert('Hata', err.message || 'Kaydedilemedi.');
        } finally { setKurulKaydediyor(false); }
    };

    const kurulTamamlandi = async () => {
        if (!kurulState.planTarih)
            return Alert.alert('Eksik Bilgi', 'Önce planlanan toplantı tarihi giriniz.');
        const periyot    = KURUL_PERIYOT_AY[kurulState.tehlikeSinifi];
        const yeniGecmis = [...kurulState.gecmis, kurulState.planTarih];
        let yeniPlan = '';
        if (periyot) {
            const d = new Date(kurulState.planTarih);
            d.setMonth(d.getMonth() + periyot);
            yeniPlan = d.toISOString().split('T')[0];
        }
        const yeniState = { ...kurulState, gecmis: yeniGecmis, planTarih: yeniPlan };
        setKurulState(yeniState);
        try {
            setKurulKaydediyor(true);
            await _kurulSunucuyaYaz(yeniState);
            toastGoster('✅ Toplantı tamamlandı olarak işaretlendi.');
        } catch (err) {
            Alert.alert('Hata', err.message || 'Kaydedilemedi.');
        } finally { setKurulKaydediyor(false); }
    };

    const kurulGecmisSil = (tarih, idx) => {
        Alert.alert('Geçmiş Toplantıyı Sil',
            `${formatTarih(tarih)} tarihli kaydı silmek istiyor musunuz?`, [
            { text: 'Vazgeç', style: 'cancel' },
            {
                text: 'Sil', style: 'destructive',
                onPress: async () => {
                    const yeniGecmis = kurulState.gecmis.filter((_, i) => i !== idx);
                    const yeniState  = { ...kurulState, gecmis: yeniGecmis };
                    setKurulState(yeniState);
                    try {
                        setKurulKaydediyor(true);
                        await _kurulSunucuyaYaz(yeniState);
                        toastGoster('🗑️ Toplantı kaydı silindi.');
                    } catch (err) {
                        Alert.alert('Hata', err.message || 'Silinemedi.');
                    } finally { setKurulKaydediyor(false); }
                },
            },
        ]);
    };

    // ── Personel Kayıt ────────────────────────────────────────────────
    const pkPersonelSec = (key) => {
        setPkSeciliPersonel(key);
        setPkSeciciGoster(false);
        const meta  = PK_META[kategori];
        if (!meta) return;
        const kayit = pkKayitlar[key] || {};
        setPkTarih1(kayit[meta.tarih1Field] || '');
        setPkTarih2(kayit[meta.tarih2Field] || '');
    };

    const pkTarih1Degisti = (yeniTarih) => {
        setPkTarih1(yeniTarih);
        if (!yeniTarih) return;
        const yil = PK_PERIYOT_YIL[kategori]?.[firmaTehlikeSinifi]
                 ?? PK_PERIYOT_YIL[kategori]?.[''] ?? 3;
        try {
            const d = new Date(yeniTarih);
            d.setFullYear(d.getFullYear() + yil);
            setPkTarih2(d.toISOString().split('T')[0]);
        } catch {}
    };

    const _pkSunucuyaYaz = async (yeniKayitlar) => {
        const meta    = PK_META[kategori];
        const anahtar = encodeURIComponent(meta.anahtarPrefix + firmaAdi);
        await api.post(`/api/veri/${anahtar}`, yeniKayitlar);
    };

    const pkKaydet = async () => {
        const meta = PK_META[kategori];
        if (!meta) return;
        if (!pkSeciliPersonel) return Alert.alert('Eksik Bilgi', 'Lütfen bir personel seçiniz.');
        if (!pkTarih1)         return Alert.alert('Eksik Bilgi', `${meta.tarih1Label} giriniz.`);
        try {
            setPkKaydediyor(true);
            const yeniKayit = { [meta.tarih1Field]: pkTarih1, [meta.tarih2Field]: pkTarih2 };
            if (ILKYARDIM_MODU) {
                const p = pkFirmaPersonelleri.find(pp => _personelKey(pp) === pkSeciliPersonel);
                if (p) {
                    const ad    = p.adSoyad || p.ad || '';
                    const gorev = p.gorev || p.pozisyon || '';
                    yeniKayit.personelAd = ad + (gorev ? ' — ' + gorev : '');
                }
            }
            const yeniKayitlar = { ...pkKayitlar, [pkSeciliPersonel]: yeniKayit };
            await _pkSunucuyaYaz(yeniKayitlar);
            setPkKayitlar(yeniKayitlar);
            await belgeYukleGercek(); // seçili belge varsa yükle
            toastGoster('✅ Kayıt başarıyla güncellendi.');
        } catch (err) {
            Alert.alert('Hata', err.message || 'Kaydedilemedi.');
        } finally { setPkKaydediyor(false); }
    };

    const pkKayitSil = (key) => {
        Alert.alert('Kaydı Sil', 'Bu personelin kaydını silmek istiyor musunuz?', [
            { text: 'Vazgeç', style: 'cancel' },
            {
                text: 'Sil', style: 'destructive',
                onPress: async () => {
                    try {
                        const yeniKayitlar = { ...pkKayitlar };
                        delete yeniKayitlar[key];
                        await _pkSunucuyaYaz(yeniKayitlar);
                        setPkKayitlar(yeniKayitlar);
                        if (key === pkSeciliPersonel) { setPkSeciliPersonel(''); setPkTarih1(''); setPkTarih2(''); }
                        toastGoster('🗑️ Kayıt silindi.');
                    } catch (err) { Alert.alert('Hata', err.message || 'Silinemedi.'); }
                },
            },
        ]);
    };

    // ── TB: tarih1 değişince tarih2 otomatik ─────────────────────────
    const tbTarih1Degisti = (yeniTarih) => {
        setTbTarih1(yeniTarih);
        const meta = TB_META[kategori];
        if (!meta?.tarih2Oto || !yeniTarih) return;
        const yil = meta.periyotYil(firmaTehlikeSinifi);
        try {
            const d = new Date(yeniTarih);
            d.setFullYear(d.getFullYear() + yil);
            setTbTarih2(d.toISOString().split('T')[0]);
        } catch {}
    };

    // ── tbKaydet — Firma.isg'e yazar + seçili belgeyi yükler ─────────
    const tbKaydet = async () => {
    const meta = TB_META[kategori];
    if (!meta) return;
      console.log('[tbKaydet] secilenDosya:', secilenDosya ? secilenDosya.name : 'NULL');
    console.log('[tbKaydet] tbMailAt:', tbMailAt);
    try {
        setTbKaydediyor(true);
        const isgGuncelleme = {
            [meta.tarih1Field]: tbTarih1,
            [meta.tarih2Field]: tbTarih2,
        };
        if (kategori === 'denetim') isgGuncelleme.denetimMailAt = tbMailAt;
        await api.put(`/api/firmalar/${firmaId}`, { isg: isgGuncelleme });

        // ✅ Dosyayı ÖNCE oku (belgeYukleGercek secilenDosya'yı null yapmadan önce)
        let attachments = [];
        if (kategori === 'denetim' && tbMailAt && secilenDosya) {
            try {
                const base64 = await FileSystem.readAsStringAsync(secilenDosya.uri, {
                    encoding: 'base64',
                });
                attachments = [{
                    filename:    secilenDosya.name,
                    content:     base64,
                    encoding:    'base64',
                    contentType: secilenDosya.mimeType || 'application/pdf',
                }];
            } catch (readErr) {
                console.log('[tbKaydet] Dosya okunamadı:', readErr.message);
            }
        }

        // Belgeyi yükle (bu secilenDosya'yı null yapar)
        await belgeYukleGercek();

        // ✅ Mail gönder (attachments zaten hazır)
        if (kategori === 'denetim' && tbMailAt) {
    try {
        await api.post('/api/dokumanlar/mail-gonder', {
            firmaId,
            hazirlanmaTarihi:    tbTarih1,
            sonGecerlilikTarihi: tbTarih2,
            dokumanIdleri:       [],
            // attachment yok — backend VeriDepo'dan okusun
            kaynakFirmaAdi:      firmaAdi,
            kaynakKategori:      'denetim',
        });
    } catch (mailErr) {
        Alert.alert('Mail Hatası', mailErr.message || 'Mail gönderilemedi.');
    }
}

        toastGoster('✅ Kayıt başarıyla güncellendi.');
    } catch (err) {
        Alert.alert('Hata', err.message || 'Kaydedilemedi.');
    } finally { setTbKaydediyor(false); }
};
    // ── Ölçüm ──────────────────────────────────────────────────────────
    const _olcumGecerlilikHesapla = (raporTarihi, periyotKodu) => {
        if (!raporTarihi) return '';
        const p = OLCUM_PERIYOTLAR.find(x => x.kod === periyotKodu);
        if (!p) return '';
        try {
            const d = new Date(raporTarihi);
            if (p.birim === 'ay') d.setMonth(d.getMonth() + p.deger);
            else                  d.setFullYear(d.getFullYear() + p.deger);
            return d.toISOString().split('T')[0];
        } catch { return ''; }
    };

    const olcumFormGuncelle = (alan, deger) => {
        setOlcumForm(prev => {
            const yeni = { ...prev, [alan]: deger };
            if (alan === 'raporTarihi' || alan === 'kontrolPeriyodu') {
                yeni.gecerlilikTarihi = _olcumGecerlilikHesapla(
                    alan === 'raporTarihi'     ? deger : yeni.raporTarihi,
                    alan === 'kontrolPeriyodu' ? deger : yeni.kontrolPeriyodu,
                );
            }
            return yeni;
        });
    };

    const olcumEkle = async () => {
        if (!olcumForm.ekipmanAdi)  return Alert.alert('Eksik Bilgi', 'Ekipman adı zorunludur.');
        if (!olcumForm.raporTarihi) return Alert.alert('Eksik Bilgi', 'Rapor tarihi zorunludur.');
        try {
            setOlcumKaydediyor(true);
            const periyot   = OLCUM_PERIYOTLAR.find(p => p.kod === olcumForm.kontrolPeriyodu);
            const yeniKayit = {
                id: Date.now(), ekipmanAdi: olcumForm.ekipmanAdi, seriNo: olcumForm.seriNo,
                raporNo: olcumForm.raporNo, kontrolFirma: olcumForm.kontrolFirma,
                raporTarihi: olcumForm.raporTarihi, gecerlilikTarihi: olcumForm.gecerlilikTarihi,
                kontrolPeriyodu: olcumForm.kontrolPeriyodu, periyotEtiket: periyot?.etiket || 'Yıllık',
                kayitTarihi: new Date().toISOString(),
            };
            const yeniListe = [...olcumListesi, yeniKayit];
            const anahtar   = encodeURIComponent('olcum_ekipman_verileri_' + firmaAdi);
            await api.post(`/api/veri/${anahtar}`, yeniListe);
            setOlcumListesi(yeniListe);
            setOlcumForm({ ekipmanAdi: '', seriNo: '', raporNo: '', kontrolFirma: '', raporTarihi: '', kontrolPeriyodu: '1yil', gecerlilikTarihi: '' });
            toastGoster('✅ Ekipman kaydı eklendi.');
        } catch (err) {
            Alert.alert('Hata', err.message || 'Eklenemedi.');
        } finally { setOlcumKaydediyor(false); }
    };

    const olcumSil = (id) => {
        Alert.alert('Ekipmanı Sil', 'Bu ekipman kaydını silmek istiyor musunuz?', [
            { text: 'Vazgeç', style: 'cancel' },
            {
                text: 'Sil', style: 'destructive',
                onPress: async () => {
                    try {
                        const yeniListe = olcumListesi.filter(e => e.id !== id);
                        const anahtar   = encodeURIComponent('olcum_ekipman_verileri_' + firmaAdi);
                        await api.post(`/api/veri/${anahtar}`, yeniListe);
                        setOlcumListesi(yeniListe);
                        toastGoster('🗑️ Ekipman silindi.');
                    } catch (err) { Alert.alert('Hata', err.message || 'Silinemedi.'); }
                },
            },
        ]);
    };

    // ── Destek ─────────────────────────────────────────────────────────
    const _destekStorageKey = encodeURIComponent('destek_verileri_' + firmaAdi);

    function destekPersonelSec(ekip, key) {
        setDestekSecimler(s => ({ ...s, [ekip]: key }));
        const mevcutTarih = destekData[ekip]?.[key]?.atamaTarih || '';
        setDestekTarihler(t => ({ ...t, [ekip]: mevcutTarih }));
        setPersonelModal({ acik: false, ekip: null });
        setAramaMetni('');
    }

    async function destekKaydet(ekip) {
        const key = destekSecimler[ekip];
        if (!key) return Alert.alert('Eksik Bilgi', 'Lütfen bir personel seçin.');
        const personelObj = personeller.find(p => _destekPersonelKey(p) === key);
        const ad          = personelObj ? (personelObj.adSoyad || personelObj.ad || '') : key.replace(/_/g, ' ');
        const gorev       = personelObj ? (personelObj.gorev || personelObj.pozisyon || '') : '';
        const personelAd  = ad + (gorev ? ' — ' + gorev : '');
        const atamaTarih  = destekTarihler[ekip] || '';
        try {
            setDestekKaydediyor(k => ({ ...k, [ekip]: true }));
            const yeniData = { ...destekData, [ekip]: { ...(destekData[ekip] || {}), [key]: { atamaTarih, personelAd } } };
            await api.post(`/api/veri/${_destekStorageKey}`, yeniData);
            setDestekData(yeniData);
            toastGoster(`✅ ${DESTEK_EKIPLER.find(e => e.key === ekip)?.label} kaydedildi.`);
        } catch (err) {
            Alert.alert('Hata', err.message || 'Kaydedilemedi.');
        } finally { setDestekKaydediyor(k => ({ ...k, [ekip]: false })); }
    }

    async function destekModalTarihGuncelle(ekip, key, deger) {
        try {
            const yeniData = { ...destekData, [ekip]: { ...(destekData[ekip] || {}), [key]: { ...(destekData[ekip]?.[key] || {}), atamaTarih: deger } } };
            await api.post(`/api/veri/${_destekStorageKey}`, yeniData);
            setDestekData(yeniData);
        } catch (err) { Alert.alert('Hata', err.message || 'Tarih güncellenemedi.'); }
    }

    function destekSil(ekip, key, adHam) {
        Alert.alert('Kaydı Sil', `"${adHam.split(' — ')[0]}" kişisini kaldırmak istiyor musunuz?`, [
            { text: 'Vazgeç', style: 'cancel' },
            {
                text: 'Sil', style: 'destructive',
                onPress: async () => {
                    try {
                        const yeniEkip = { ...(destekData[ekip] || {}) };
                        delete yeniEkip[key];
                        const yeniData = { ...destekData, [ekip]: yeniEkip };
                        await api.post(`/api/veri/${_destekStorageKey}`, yeniData);
                        setDestekData(yeniData);
                        toastGoster('🗑️ Kayıt silindi.');
                    } catch (err) { Alert.alert('Hata', err.message || 'Silinemedi.'); }
                },
            },
        ]);
    }

    const destekToplamAtanan = DESTEK_EKIPLER.reduce(
        (acc, e) => acc + Object.keys(destekData[e.key] || {}).length, 0
    );

    // ══════════════════════════════════════════════════════════════════
    // DOSYA SEÇ — sadece picker açar, dosyayı state'e koyar (yüklemez)
    // Yükleme Kaydet butonuna basılınca belgeYukleGercek ile yapılır
    // ══════════════════════════════════════════════════════════════════
    const belgeSec = async () => {
        try {
            const sonuc = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*',
                       'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                copyToCacheDirectory: true,
            });
            if (sonuc.canceled || !sonuc.assets?.length) return;
            setSecilenDosya(sonuc.assets[0]);
        } catch (err) {
            Alert.alert('Seçim Hatası', err.message || 'Dosya seçilemedi.');
        }
    };

    // Kaydet butonuna basılınca çağrılır — seçili dosya yoksa sessizce atlar
    // Kaydet butonuna basılınca çağrılır — seçili dosya yoksa sessizce atlar
const belgeYukleGercek = async () => {
    if (!secilenDosya) return;
    
    // Tarih kontrolü - TARIH_BELGE_MODU ise tarihler zorunlu
    if (TARIH_BELGE_MODU && (!tbTarih1 || !tbTarih2)) {
        Alert.alert('Tarih Zorunlu', 'Lütfen önce tarihleri girin.');
        return;
    }
    
    try {
        setYukleniyorBelge(true);
        const dosya    = secilenDosya;
        const base64   = await FileSystem.readAsStringAsync(dosya.uri, { encoding: 'base64' });
        const mimeType = dosya.mimeType || 'application/pdf';
        const dataUrl  = `data:${mimeType};base64,${base64}`;
        const uzanti   = (dosya.name.split('.').pop() || '').toUpperCase();
        const uzantiMap = { DOC: 'DOCX', JPEG: 'JPG' };
        const tur = uzantiMap[uzanti] || uzanti || 'PDF';

        console.log('🟦 GÖNDERİLEN:', {
    belgeTarihi: tbTarih1,
    gecerlilikTarihi: tbTarih2,
});

        // TEK endpoint - mobil-belge-ekle (sadece VeriDepo'ya yazar)
        await api.post('/api/dokumanlar/mobil-belge-ekle', {
    firmaId, kategori,
    dosyaAdi:         dosya.name,
    dosyaBoyut:       dosya.size || 0,
    dosyaTur:         tur,
    belgeTarihi:      tbTarih1 || new Date().toISOString().split('T')[0],
    gecerlilikTarihi: tbTarih2 || null,  // ← BUNU EKLE
    dataUrl,
});
        setSecilenDosya(null);
        await verileriYukle();
    } catch (err) {
        Alert.alert('Yükleme Hatası', err.message || 'Belge yüklenemedi.');
    } finally { 
        setYukleniyorBelge(false); 
    }
};
    // ── Belgeyi aç ────────────────────────────────────────────────────
    async function belgeyiAc(belge) {
        if (belge.tur === 'KAYIT') { Alert.alert('Bilgi', 'Bu kayıt türü doküman görüntülenemez.'); return; }
        try {
            setAciliyor(belge.ad);
            const yanit = await api.get(
                `/api/dokumanlar/mobil-belge/${firmaId}/${kategori}/${encodeURIComponent(belge.ad)}`
            );
            if (!yanit.dataUrl) throw new Error('Belge içeriği bulunamadı');
            const base64Veri = yanit.dataUrl.split(',')[1];
            if (!base64Veri) throw new Error('Belge formatı hatalı');
            const dosyaYolu = FileSystem.cacheDirectory + belge.ad;
            await FileSystem.writeAsStringAsync(dosyaYolu, base64Veri, { encoding: 'base64' });
            const paylasilabilir = await Sharing.isAvailableAsync();
            if (!paylasilabilir) { Alert.alert('Hata', 'Dosya açma desteği bulunamadı.'); return; }
            const mimeMap = {
                'PDF': 'application/pdf',
                'DOCX': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'DOC': 'application/msword', 'XLSX': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'XLS': 'application/vnd.ms-excel', 'JPG': 'image/jpeg', 'JPEG': 'image/jpeg', 'PNG': 'image/png',
            };
            const mimeTipi = mimeMap[belge.tur?.toUpperCase()] || '*/*';
            if (Platform.OS === 'android') {
                const contentUri = await FileSystem.getContentUriAsync(dosyaYolu);
                await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: contentUri, flags: 1, type: mimeTipi });
            } else {
                await Sharing.shareAsync(dosyaYolu, { mimeType: mimeTipi, dialogTitle: belge.ad });
            }
        } catch (err) {
            Alert.alert('Belge Açılamadı', err.message || 'Bilinmeyen hata oluştu');
        } finally { setAciliyor(null); }
    }

    // ── Belge İşlem Modalı — sil + tarih güncelle ────────────────────
    function belgIslemAc(belge) {
        setBelgeYeniTarih(belge.tarih || '');
        setBelgeIslemModal({ acik: true, belge });
    }

    async function belgeTarihGuncelle() {
        const belge = belgeIslemModal.belge;
        if (!belge) return;
        try {
            setBelgeIslemYukleniyor(true);
            const isgKey    = encodeURIComponent('isg_dosyalar_' + firmaAdi);
            let isgDosyalar = {};
            try { isgDosyalar = await api.get(`/api/veri/${isgKey}`) || {}; } catch {}
            const dosyalar = isgDosyalar[kategori] || [];
            const idx      = dosyalar.findIndex(d => d.ad === belge.ad || d._id === belge._id);
            if (idx !== -1) {
                dosyalar[idx] = { ...dosyalar[idx], tarih: belgeYeniTarih };
                isgDosyalar[kategori] = dosyalar;
                await api.post(`/api/veri/${isgKey}`, isgDosyalar);
            }
            setBelgeIslemModal({ acik: false, belge: null });
            await verileriYukle();
            toastGoster('✅ Belge tarihi güncellendi.');
        } catch (err) {
            Alert.alert('Hata', err.message || 'Güncellenemedi.');
        } finally { setBelgeIslemYukleniyor(false); }
    }

    function belgeSil(belge) {
        Alert.alert('Belgeyi Sil', `"${belge.ad}" dosyasını silmek istiyor musunuz?`, [
            { text: 'Vazgeç', style: 'cancel' },
            {
                text: 'Sil', style: 'destructive',
                onPress: async () => {
                    try {
                        setBelgeIslemModal({ acik: false, belge: null });
                        // isg_dosyalar_ key'inden sil
                        const isgKey    = encodeURIComponent('isg_dosyalar_' + firmaAdi);
                        let isgDosyalar = {};
                        try { isgDosyalar = await api.get(`/api/veri/${isgKey}`) || {}; } catch {}
                        if (isgDosyalar[kategori]) {
                            isgDosyalar[kategori] = isgDosyalar[kategori].filter(
                                d => d.ad !== belge.ad && d._id !== belge._id
                            );
                            await api.post(`/api/veri/${isgKey}`, isgDosyalar);
                        }
                        await verileriYukle();
                        toastGoster('🗑️ Belge silindi.');
                    } catch (err) { Alert.alert('Hata', err.message || 'Silinemedi.'); }
                },
            },
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════
    return (
        <SafeAreaView style={styles.container}>
            {/* Toast */}
            {toast.goster && (
                <View style={[ek.toast, toast.tip === 'basari' ? ek.toastBasari : ek.toastHata]}>
                    <Text style={ek.toastYazi}>{toast.mesaj}</Text>
                    <TouchableOpacity onPress={() => setToast({ goster: false, mesaj: '', tip: 'basari' })}>
                        <Text style={ek.toastKapat}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Üst Bar */}
            <View style={styles.ustBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.geriBtn}>
                    <Text style={styles.geriBtnYazi}>‹</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.ustBarBaslik} numberOfLines={1}>{kategoriIkon} {kategoriAd}</Text>
                    <Text style={styles.ustBarAltyazi} numberOfLines={1}>{firmaAdi}</Text>
                </View>
                {DESTEK_MODU && destekToplamAtanan > 0 ? (
                    <TouchableOpacity style={ek.goruntuleBtn} onPress={() => setDestekModalAcik(true)}>
                        <Text style={ek.goruntulebtnYazi}>Listele</Text>
                        <View style={ek.goruntuleBadge}>
                            <Text style={ek.goruntuleBadgeYazi}>{destekToplamAtanan}</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            {yukleniyor && <View style={styles.merkez}><ActivityIndicator size="large" color="#2563eb" /></View>}
            {!yukleniyor && hata ? <View style={styles.merkez}><Text style={styles.hataYazi}>⚠️ {hata}</Text></View> : null}

            {/* UZMAN FORMU */}
            {!yukleniyor && !hata && UZMAN_MODU && (
                <ScrollView style={ek.formAlan} contentContainerStyle={{ paddingBottom: 40 }}>
                    <Text style={ek.formBaslik}>👨‍⚕️ Uzman / Hekim / DSP Ataması</Text>
                    {[
                        { key: 'igu',   label: 'İş Güvenliği Uzmanı',         ikon: '🛡️' },
                        { key: 'hekim', label: 'İşyeri Hekimi',                ikon: '🩺' },
                        { key: 'dsp',   label: 'Diğer Sağlık Personeli (DSP)', ikon: '👤' },
                    ].map(({ key, label, ikon }) => (
                        <View key={key} style={ek.formKart}>
                            <Text style={ek.formKartBaslik}>{ikon} {label}</Text>
                            <TextInput style={ek.formInput} placeholder="Ad Soyad" placeholderTextColor="#94a3b8"
                                value={uzmanForm[key]?.ad || ''}
                                onChangeText={v => setUzmanForm(f => ({ ...f, [key]: { ...f[key], ad: v } }))} />
                            <Text style={ek.formMiniEtiket}>Atama Tarihi (opsiyonel)</Text>
                            <TextInput style={ek.formInput} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8"
                                value={uzmanForm[key]?.atamaTarihi || ''}
                                onChangeText={v => setUzmanForm(f => ({ ...f, [key]: { ...f[key], atamaTarihi: v } }))}
                                keyboardType="numbers-and-punctuation" />
                        </View>
                    ))}
                    <TouchableOpacity style={[ek.kaydetBtn, uzmanKaydediyor && { opacity: 0.6 }]}
                        onPress={uzmanKaydet} disabled={uzmanKaydediyor}>
                        {uzmanKaydediyor ? <ActivityIndicator size="small" color="#fff" />
                                         : <Text style={ek.kaydetBtnYazi}>💾 Kaydet</Text>}
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* ANA LİSTE */}
            {!yukleniyor && !hata && !UZMAN_MODU && (
                <FlatList
                    ref={flatListRef}
                    data={belgeler}
                    keyExtractor={(item, idx) => item._id || `${item.ad}-${idx}`}
                    renderItem={({ item }) => (
                        <BelgeKart
                            belge={item}
                            aciliyor={aciliyor === item.ad}
                            onPress={() => belgeyiAc(item)}
                            onIslem={() => belgIslemAc(item)}
                        />
                    )}
                    refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={yenile} colors={['#2563eb']} />}
                    ListHeaderComponent={
                        <View>
                            {KURUL_MODU && (
                                <KurulFormu state={kurulState} setState={setKurulState}
                                    kaydediyor={kurulKaydediyor}
                                    onKaydet={() => kurulKaydet(false)}
                                    onTamamlandi={kurulTamamlandi}
                                    onGecmisSil={kurulGecmisSil} />
                            )}

                            {PERSONEL_KAYIT_MODU && (
                                <PersonelKayitKart
                                    kategori={kategori} firmaPersonelleri={pkFirmaPersonelleri}
                                    kayitlar={pkKayitlar} seciliPersonel={pkSeciliPersonel}
                                    tarih1={pkTarih1} tarih2={pkTarih2} setTarih2={setPkTarih2}
                                    onTarih1Degisti={pkTarih1Degisti}
                                    onPersonelSecmeAc={() => setPkSeciciGoster(true)}
                                    onKaydet={pkKaydet} onModalAc={() => setPkModalGoster(true)}
                                    kaydediyor={pkKaydediyor} tehlikeSinifi={firmaTehlikeSinifi}
                                    belgeSayisi={belgeler.length} onBelgelereGit={belgelereScroll} />
                            )}

                            {TARIH_BELGE_MODU && (
                                <TarihBelgeKart
                                    kategori={kategori}
                                    tarih1={tbTarih1} tarih2={tbTarih2} mailAt={tbMailAt}
                                    tehlikeSinifi={firmaTehlikeSinifi}
                                    onTarih1Degisti={tbTarih1Degisti}
                                    setTarih2={setTbTarih2} setMailAt={setTbMailAt}
                                    onKaydet={tbKaydet} kaydediyor={tbKaydediyor || yukleniyorBelge}
                                    secilenDosya={secilenDosya}
                                    onBelgeSec={belgeSec}
                                    onBelgeIptal={() => setSecilenDosya(null)}
                                    belgeSayisi={belgeler.length} onBelgelereGit={belgelereScroll} />
                            )}

                            {OLCUM_MODU && (
                                <OlcumKart form={olcumForm} onFormGuncelle={olcumFormGuncelle}
                                    listesi={olcumListesi} onEkle={olcumEkle}
                                    onModalAc={() => setOlcumModalGoster(true)}
                                    onPeriyotSec={() => setOlcumPeriyotSeciciGoster(true)}
                                    kaydediyor={olcumKaydediyor} />
                            )}

                            {TEMSILCI_MODU && (
                                <View style={ek.formKapsayici}>
                                    <Text style={ek.formBaslik}>🤝 Yeni Çalışan Temsilcisi Ata</Text>
                                    <View style={ek.formKart}>
                                        <Text style={ek.formEtiket}>Personel Seç ({personeller.length} kişi)</Text>
                                        <View style={ek.personelListe}>
                                            {personeller.length === 0 ? (
                                                <Text style={ek.bosPersonel}>Bu firmada personel yok</Text>
                                            ) : personeller.map(p => (
                                                <TouchableOpacity key={p._id}
                                                    style={[ek.personelSatir, temsilciSecimi === p._id && ek.personelSatirSecili]}
                                                    onPress={() => setTemsilciSecimi(p._id)}>
                                                    <Text style={[ek.personelAdi, temsilciSecimi === p._id && { color: '#2563eb', fontWeight: '700' }]}>
                                                        {p.adSoyad} {p.gorev ? `— ${p.gorev}` : ''}
                                                    </Text>
                                                    {temsilciSecimi === p._id && <Text style={{ color: '#2563eb' }}>✓</Text>}
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        <Text style={[ek.formEtiket, { marginTop: 10 }]}>Atama Tarihi</Text>
                                        <TextInput style={ek.formInput} placeholder="YYYY-MM-DD"
                                            placeholderTextColor="#94a3b8" value={temsilciTarih}
                                            onChangeText={setTemsilciTarih} keyboardType="numbers-and-punctuation" />
                                        <TouchableOpacity
                                            style={[ek.kaydetBtn, { marginTop: 10 }, temsilciKaydediyor && { opacity: 0.6 }]}
                                            onPress={temsilciKaydet} disabled={temsilciKaydediyor}>
                                            {temsilciKaydediyor ? <ActivityIndicator size="small" color="#fff" />
                                                                 : <Text style={ek.kaydetBtnYazi}>💾 Temsilci Olarak Ata</Text>}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {DESTEK_MODU && (
                                <DestekFormu personeller={personeller} destekData={destekData}
                                    secimler={destekSecimler} tarihler={destekTarihler}
                                    kaydediyor={destekKaydediyor}
                                    onPersonelModalAc={(ekip) => { setPersonelModal({ acik: true, ekip }); setAramaMetni(''); }}
                                    onTarihDegis={(ekip, v) => setDestekTarihler(t => ({ ...t, [ekip]: v }))}
                                    onKaydet={destekKaydet} />
                            )}

                            {/* Dosya seç butonu — KURUL, PK, DESTEK modları için (TB ayrı kart içinde) */}
                            {BELGE_YUKLE_AKTIF && !TARIH_BELGE_MODU && (!KURUL_MODU || !kurulState.zorunluDegil) && (
                                <>
                                    {KURUL_MODU    && <Text style={ek.tutanakBaslik}>📁 Toplantı Tutanakları</Text>}
                                    {DESTEK_MODU   && <Text style={ek.tutanakBaslik}>📁 Belgeler</Text>}
                                    {PERSONEL_KAYIT_MODU && PK_META[kategori] && (
                                        <Text style={ek.tutanakBaslik}>{PK_META[kategori].belgeBaslik}</Text>
                                    )}

                                    {/* Dosya Seç */}
                                    <TouchableOpacity
                                        style={[ek.yukleBtn, { backgroundColor: secilenDosya ? '#0369a1' : '#2563eb' }]}
                                        onPress={belgeSec} disabled={yukleniyorBelge}>
                                        <Text style={ek.yukleBtnYazi}>
                                            {secilenDosya
                                                ? `📄 ${secilenDosya.name.length > 28 ? secilenDosya.name.substring(0, 25) + '...' : secilenDosya.name}`
                                                : '📎 Dosya Seç'}
                                        </Text>
                                    </TouchableOpacity>
                                    {secilenDosya && (
                                        <TouchableOpacity style={ek.dosyaIptalBtn} onPress={() => setSecilenDosya(null)}>
                                            <Text style={ek.dosyaIptalBtnYazi}>✕ Seçimi İptal Et</Text>
                                        </TouchableOpacity>
                                    )}
                                    {/* Not: Bu modlarda belge yüklemesi ilgili Kaydet butonu içinde tetiklenir */}
                                </>
                            )}

                            <View style={styles.bilgiBar}>
                                <Text style={styles.bilgiBarYazi}>
                                    {belgeler.length} {TEMSILCI_MODU ? 'kayıt' : 'belge'} bulundu
                                </Text>
                            </View>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.bosKart}>
                            <Text style={styles.bosIkon}>📂</Text>
                            <Text style={styles.bosBaslik}>
                                {TEMSILCI_MODU ? 'Henüz atanmış kayıt yok' : 'Bu kategoride belge yok'}
                            </Text>
                            <Text style={styles.bosAciklama}>
                                {BELGE_YUKLE_AKTIF
                                    ? 'Yukarıdan dosya seçip kaydedebilirsiniz.'
                                    : 'Web arayüzünden veya AI sekmesinden belge yükleyebilirsiniz.'}
                            </Text>
                        </View>
                    }
                    contentContainerStyle={styles.liste}
                />
            )}

            {/* ══ Personel Seçici Modal ══ */}
            {PERSONEL_KAYIT_MODU && (
                <Modal visible={pkSeciciGoster} transparent animationType="slide"
                    onRequestClose={() => setPkSeciciGoster(false)}>
                    <View style={pkSt.modalArka}>
                        <View style={pkSt.modalKutu}>
                            <View style={pkSt.modalBaslikSatir}>
                                <Text style={pkSt.modalBaslik}>👤 Personel Seç</Text>
                                <TouchableOpacity onPress={() => setPkSeciciGoster(false)}>
                                    <Text style={pkSt.modalKapatYazi}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={{ maxHeight: 400 }}>
                                {pkFirmaPersonelleri.length === 0 ? (
                                    <Text style={pkSt.bosListeYazi}>Bu firmada personel bulunamadı.</Text>
                                ) : pkFirmaPersonelleri.map(p => {
                                    const key   = _personelKey(p);
                                    const ad    = p.adSoyad || p.ad || '';
                                    const gorev = p.gorev || p.pozisyon || '';
                                    const kayit = pkKayitlar[key];
                                    const meta  = PK_META[kategori];
                                    const durum = kayit ? _durumHesapla(kayit?.[meta?.tarih2Field]) : null;
                                    return (
                                        <TouchableOpacity key={key} style={pkSt.personelSatir} onPress={() => pkPersonelSec(key)}>
                                            <View style={pkSt.avatar}><Text style={pkSt.avatarYazi}>{ad.substring(0,2).toUpperCase()}</Text></View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={pkSt.personelAd}>{ad}</Text>
                                                {gorev ? <Text style={pkSt.personelGorev}>{gorev}</Text> : null}
                                            </View>
                                            {durum && (
                                                <View style={[pkSt.miniRozet, { backgroundColor: durum.bg }]}>
                                                    <Text style={[pkSt.miniRozetYazi, { color: durum.renk }]}>{durum.metin}</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            )}

            {/* ══ Durum Görüntüle Modal ══ */}
            {PERSONEL_KAYIT_MODU && (
                <Modal visible={pkModalGoster} transparent animationType="slide"
                    onRequestClose={() => setPkModalGoster(false)}>
                    <View style={pkSt.modalArka}>
                        <View style={pkSt.modalKutu}>
                            <View style={pkSt.modalBaslikSatir}>
                                <Text style={pkSt.modalBaslik}>{PK_META[kategori]?.gorButon || 'Durum'}</Text>
                                <TouchableOpacity onPress={() => setPkModalGoster(false)}>
                                    <Text style={pkSt.modalKapatYazi}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            <DurumOzeti kategori={kategori} kayitlar={pkKayitlar} firmaPersonelleri={pkFirmaPersonelleri} />
                            <ScrollView style={{ maxHeight: 450 }}>
                                {Object.keys(pkKayitlar).length === 0 ? (
                                    <Text style={pkSt.bosListeYazi}>Henüz kayıt yok.</Text>
                                ) : Object.entries(pkKayitlar).map(([key, kayit]) => {
                                    const meta  = PK_META[kategori];
                                    const p     = pkFirmaPersonelleri.find(pp => _personelKey(pp) === key);
                                    const ad    = p?.adSoyad || p?.ad || kayit.personelAd || key.replace(/_/g,' ');
                                    const gorev = p?.gorev || p?.pozisyon || '';
                                    const t1    = kayit[meta?.tarih1Field];
                                    const t2    = kayit[meta?.tarih2Field];
                                    const durum = _durumHesapla(t2);
                                    return (
                                        <TouchableOpacity key={key} style={pkSt.kayitSatir}
                                            onLongPress={() => pkKayitSil(key)} delayLongPress={500} activeOpacity={0.7}>
                                            <View style={pkSt.avatar}><Text style={pkSt.avatarYazi}>{String(ad).substring(0,2).toUpperCase()}</Text></View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={pkSt.personelAd}>{ad}</Text>
                                                {gorev ? <Text style={pkSt.personelGorev}>{gorev}</Text> : null}
                                                <Text style={pkSt.tarihKucuk}>{meta?.tarih1Label}: {formatTarih(t1) || '—'}</Text>
                                                <Text style={pkSt.tarihKucuk}>Geçerlilik: {formatTarih(t2) || '—'}</Text>
                                            </View>
                                            <View style={[pkSt.miniRozet, { backgroundColor: durum.bg }]}>
                                                <Text style={[pkSt.miniRozetYazi, { color: durum.renk }]}>{durum.metin}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                            <Text style={pkSt.modalIpucu}>💡 Bir kaydı silmek için satırı uzun bas.</Text>
                        </View>
                    </View>
                </Modal>
            )}

            {/* ══ Ölçüm Periyot Modal ══ */}
            {OLCUM_MODU && (
                <Modal visible={olcumPeriyotSeciciGoster} transparent animationType="fade"
                    onRequestClose={() => setOlcumPeriyotSeciciGoster(false)}>
                    <View style={pkSt.modalArka}>
                        <View style={[pkSt.modalKutu, { maxHeight: '60%' }]}>
                            <View style={pkSt.modalBaslikSatir}>
                                <Text style={pkSt.modalBaslik}>📅 Kontrol Periyodu</Text>
                                <TouchableOpacity onPress={() => setOlcumPeriyotSeciciGoster(false)}>
                                    <Text style={pkSt.modalKapatYazi}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            {OLCUM_PERIYOTLAR.map(p => {
                                const secili = olcumForm.kontrolPeriyodu === p.kod;
                                return (
                                    <TouchableOpacity key={p.kod}
                                        style={[pkSt.personelSatir, secili && { backgroundColor: '#eff6ff' }]}
                                        onPress={() => { olcumFormGuncelle('kontrolPeriyodu', p.kod); setOlcumPeriyotSeciciGoster(false); }}>
                                        <Text style={[pkSt.personelAd, secili && { color: '#2563eb', fontWeight: '800' }]}>{p.etiket}</Text>
                                        {secili && <Text style={{ color: '#2563eb', fontWeight: '700' }}>✓</Text>}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </Modal>
            )}

            {/* ══ Ölçüm Durum Modal ══ */}
            {OLCUM_MODU && (
                <Modal visible={olcumModalGoster} transparent animationType="slide"
                    onRequestClose={() => setOlcumModalGoster(false)}>
                    <View style={pkSt.modalArka}>
                        <View style={pkSt.modalKutu}>
                            <View style={pkSt.modalBaslikSatir}>
                                <Text style={pkSt.modalBaslik}>📊 İş Ekipmanları Durumu</Text>
                                <TouchableOpacity onPress={() => setOlcumModalGoster(false)}>
                                    <Text style={pkSt.modalKapatYazi}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            <OlcumOzeti listesi={olcumListesi} />
                            <ScrollView style={{ maxHeight: 450 }}>
                                {olcumListesi.length === 0 ? (
                                    <Text style={pkSt.bosListeYazi}>Henüz ekipman kaydı yok.</Text>
                                ) : olcumListesi.map(e => {
                                    const durum = _durumHesapla(e.gecerlilikTarihi);
                                    return (
                                        <TouchableOpacity key={e.id} style={pkSt.kayitSatir}
                                            onLongPress={() => olcumSil(e.id)} delayLongPress={500} activeOpacity={0.7}>
                                            <View style={[pkSt.avatar, { backgroundColor: '#0ea5e9' }]}>
                                                <Text style={pkSt.avatarYazi}>{String(e.ekipmanAdi || '').substring(0,2).toUpperCase()}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={pkSt.personelAd}>{e.ekipmanAdi}</Text>
                                                {e.seriNo ? <Text style={pkSt.personelGorev}>SN: {e.seriNo}</Text> : null}
                                                {e.kontrolFirma ? <Text style={pkSt.personelGorev}>{e.kontrolFirma}</Text> : null}
                                                <Text style={pkSt.tarihKucuk}>📅 Rapor: {formatTarih(e.raporTarihi) || '—'}{e.periyotEtiket ? `  •  ${e.periyotEtiket}` : ''}</Text>
                                                <Text style={pkSt.tarihKucuk}>Geçerlilik: {formatTarih(e.gecerlilikTarihi) || '—'}</Text>
                                            </View>
                                            <View style={[pkSt.miniRozet, { backgroundColor: durum.bg }]}>
                                                <Text style={[pkSt.miniRozetYazi, { color: durum.renk }]}>{durum.metin}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                            <Text style={pkSt.modalIpucu}>💡 Bir kaydı silmek için satırı uzun bas.</Text>
                        </View>
                    </View>
                </Modal>
            )}

            {/* ══ Destek Personel Seçici Modal ══ */}
            <Modal visible={personelModal.acik} animationType="slide" transparent
                onRequestClose={() => setPersonelModal({ acik: false, ekip: null })}>
                <View style={destekSt.modalOverlay}>
                    <View style={destekSt.personelModalKart}>
                        <View style={destekSt.personelModalHeader}>
                            <Text style={destekSt.personelModalBaslik}>
                                {DESTEK_EKIPLER.find(e => e.key === personelModal.ekip)?.label || 'Personel Seç'}
                            </Text>
                            <TouchableOpacity onPress={() => setPersonelModal({ acik: false, ekip: null })}>
                                <Text style={destekSt.modalKapat}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput style={destekSt.aramaInput} placeholder="Ad veya görev ara..."
                            placeholderTextColor="#94a3b8" value={aramaMetni} onChangeText={setAramaMetni} />
                        {personeller.length === 0 ? (
                            <Text style={destekSt.bosPersonelYazi}>Bu firmada kayıtlı personel yok.</Text>
                        ) : (
                            <FlatList
                                data={personeller.filter(p => {
                                    const ad    = (p.adSoyad || p.ad || '').toLowerCase();
                                    const gorev = (p.gorev || p.pozisyon || '').toLowerCase();
                                    return ad.includes(aramaMetni.toLowerCase()) || gorev.includes(aramaMetni.toLowerCase());
                                })}
                                keyExtractor={(p, i) => _destekPersonelKey(p) + i}
                                renderItem={({ item }) => {
                                    const key    = _destekPersonelKey(item);
                                    const ad     = item.adSoyad || item.ad || '';
                                    const gorev  = item.gorev   || item.pozisyon || '';
                                    const secili = destekSecimler[personelModal.ekip] === key;
                                    return (
                                        <TouchableOpacity
                                            style={[destekSt.personelSatir, secili && destekSt.personelSatirSecili]}
                                            onPress={() => destekPersonelSec(personelModal.ekip, key)}>
                                            <View style={destekSt.personelAvatar}><Text style={destekSt.personelAvatarYazi}>{ad.substring(0,2).toUpperCase()}</Text></View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[destekSt.personelAdYazi, secili && { color: '#1d4ed8', fontWeight: '700' }]}>{ad}</Text>
                                                {gorev ? <Text style={destekSt.personelGorevYazi}>{gorev}</Text> : null}
                                            </View>
                                            {secili && <Text style={{ color: '#1d4ed8', fontSize: 18 }}>✓</Text>}
                                        </TouchableOpacity>
                                    );
                                }}
                                style={{ maxHeight: 380 }}
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* ══ Destek Durum Tablosu Modal ══ */}
            <Modal visible={destekModalAcik} animationType="slide" transparent
                onRequestClose={() => setDestekModalAcik(false)}>
                <View style={destekSt.modalOverlay}>
                    <View style={destekSt.tabloModalKart}>
                        <View style={destekSt.tabloModalHeader}>
                            <View>
                                <Text style={destekSt.tabloModalBaslik}>Destek Elemanları Durumu</Text>
                                <Text style={destekSt.tabloModalAltyazi}>{firmaAdi}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setDestekModalAcik(false)}>
                                <Text style={destekSt.modalKapat}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={destekSt.ozetSatir}>
                            <View style={destekSt.ozetChip}><Text style={destekSt.ozetChipYazi}>Toplam: {destekToplamAtanan}</Text></View>
                        </View>
                        <ScrollView style={{ flex: 1 }}>
                            {DESTEK_EKIPLER.map(ekip => {
                                const ekipData = destekData[ekip.key] || {};
                                const keys     = Object.keys(ekipData);
                                if (keys.length === 0) return null;
                                return (
                                    <View key={ekip.key} style={destekSt.tabloEkipGrup}>
                                        <View style={[destekSt.tabloEkipBaslik, { backgroundColor: ekip.bg }]}>
                                            <Text style={destekSt.tabloEkipIkon}>{ekip.ikon}</Text>
                                            <Text style={[destekSt.tabloEkipLabel, { color: ekip.renk }]}>{ekip.label}</Text>
                                            <View style={[destekSt.tabloEkipRozet, { backgroundColor: ekip.renk }]}>
                                                <Text style={destekSt.tabloEkipRozetYazi}>{keys.length}</Text>
                                            </View>
                                        </View>
                                        {keys.map(key => {
                                            const kayit  = ekipData[key];
                                            const adHam  = kayit.personelAd || key.replace(/_/g, ' ');
                                            const sepIdx = adHam.indexOf(' — ');
                                            const ad     = sepIdx !== -1 ? adHam.substring(0, sepIdx).trim() : adHam;
                                            const gorev  = sepIdx !== -1 ? adHam.substring(sepIdx + 3).trim() : '';
                                            return (
                                                <DestekTabloSatiri key={key}
                                                    baslarf={ad.substring(0,2).toUpperCase()} ad={ad} gorev={gorev}
                                                    atamaTarih={kayit.atamaTarih || ''}
                                                    onTarihDegis={v => destekModalTarihGuncelle(ekip.key, key, v)}
                                                    onSil={() => { setDestekModalAcik(false); setTimeout(() => destekSil(ekip.key, key, adHam), 300); }} />
                                            );
                                        })}
                                    </View>
                                );
                            })}
                            {destekToplamAtanan === 0 && (
                                <View style={destekSt.tabloBosMesaj}>
                                    <Text style={{ fontSize: 32, marginBottom: 8 }}>📋</Text>
                                    <Text style={destekSt.tabloBosMesajYazi}>Henüz atanan destek elemanı yok.</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ══ Belge İşlem Modalı (Sil / Tarih Güncelle) ══ */}
            <Modal visible={belgeIslemModal.acik} transparent animationType="fade"
                onRequestClose={() => setBelgeIslemModal({ acik: false, belge: null })}>
                <View style={styles.islemModalArka}>
                    <View style={styles.islemModalKutu}>
                        <Text style={styles.islemModalBaslik} numberOfLines={2}>
                            📄 {belgeIslemModal.belge?.ad || ''}
                        </Text>

                        {/* Geçerlilik Tarihi Güncelle */}
                        <Text style={styles.islemEtiket}>Geçerlilik Tarihi (opsiyonel)</Text>
                        <TextInput
                            style={styles.islemTarihInput}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#94a3b8"
                            value={belgeYeniTarih}
                            onChangeText={setBelgeYeniTarih}
                            keyboardType="numbers-and-punctuation"
                        />
                        <TouchableOpacity
                            style={[styles.islemBtnTarih, belgeIslemYukleniyor && { opacity: 0.6 }]}
                            onPress={belgeTarihGuncelle}
                            disabled={belgeIslemYukleniyor}>
                            {belgeIslemYukleniyor
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Text style={styles.islemBtnYazi}>💾 Tarihi Kaydet</Text>}
                        </TouchableOpacity>

                        {/* Sil */}
                        <TouchableOpacity
                            style={styles.islemBtnSil}
                            onPress={() => belgeSil(belgeIslemModal.belge)}>
                            <Text style={styles.islemBtnSilYazi}>🗑️ Belgeyi Sil</Text>
                        </TouchableOpacity>

                        {/* Kapat */}
                        <TouchableOpacity
                            style={styles.islemBtnKapat}
                            onPress={() => setBelgeIslemModal({ acik: false, belge: null })}>
                            <Text style={styles.islemBtnKapatYazi}>Kapat</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// DESTEK FORMU
// ═══════════════════════════════════════════════════════════════════════
function DestekFormu({ personeller, destekData, secimler, tarihler, kaydediyor, onPersonelModalAc, onTarihDegis, onKaydet }) {
    return (
        <View style={destekSt.formKapsayici}>
            <Text style={destekSt.formBaslik}>🛡️ Destek Ekibi Atamaları</Text>
            {DESTEK_EKIPLER.map(ekip => {
                const ekipData    = destekData[ekip.key] || {};
                const atananSayi  = Object.keys(ekipData).length;
                const seciliKey   = secimler[ekip.key] || '';
                const seciliTarih = tarihler[ekip.key] || '';
                const personelObj = personeller.find(p => _destekPersonelKey(p) === seciliKey);
                const seciliAd    = personelObj ? (personelObj.adSoyad || personelObj.ad || '') : (seciliKey ? seciliKey.replace(/_/g, ' ') : '');
                const mevcutKayit = seciliKey ? ekipData[seciliKey] : null;
                return (
                    <View key={ekip.key} style={[destekSt.ekipKart, { borderLeftColor: ekip.renk }]}>
                        <View style={destekSt.ekipBaslik}>
                            <View style={[destekSt.ekipIkonKutu, { backgroundColor: ekip.bg }]}>
                                <Text style={destekSt.ekipIkon}>{ekip.ikon}</Text>
                            </View>
                            <Text style={[destekSt.ekipLabel, { color: ekip.renk }]}>{ekip.label}</Text>
                            {atananSayi > 0 && (
                                <View style={[destekSt.ekipRozet, { backgroundColor: ekip.renk }]}>
                                    <Text style={destekSt.ekipRozetYazi}>✓ {atananSayi}</Text>
                                </View>
                            )}
                        </View>
                        <TouchableOpacity style={destekSt.personelSecBtn} onPress={() => onPersonelModalAc(ekip.key)} activeOpacity={0.7}>
                            {seciliAd ? (
                                <View style={destekSt.seciliPersonelSatir}>
                                    <View style={[destekSt.seciliAvatar, { backgroundColor: ekip.renk }]}>
                                        <Text style={destekSt.seciliAvatarYazi}>{seciliAd.substring(0,2).toUpperCase()}</Text>
                                    </View>
                                    <Text style={destekSt.seciliPersonelAd} numberOfLines={1}>{seciliAd}</Text>
                                    <Text style={destekSt.personelDegistir}>↕</Text>
                                </View>
                            ) : (
                                <Text style={destekSt.personelSecBtnYazi}>— Personel Seçin —  ▾</Text>
                            )}
                        </TouchableOpacity>
                        {seciliKey ? (
                            <View style={destekSt.tarihKaydetSatir}>
                                <View style={destekSt.tarihAlan}>
                                    <Text style={destekSt.tarihEtiket}>Atama Tarihi</Text>
                                    <TextInput style={destekSt.tarihInput} placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#94a3b8" value={seciliTarih}
                                        onChangeText={v => onTarihDegis(ekip.key, v)} keyboardType="numbers-and-punctuation" />
                                </View>
                                <TouchableOpacity
                                    style={[destekSt.kaydetBtn, { backgroundColor: ekip.renk }, kaydediyor[ekip.key] && { opacity: 0.6 }]}
                                    onPress={() => onKaydet(ekip.key)} disabled={!!kaydediyor[ekip.key]}>
                                    {kaydediyor[ekip.key] ? <ActivityIndicator size="small" color="#fff" />
                                                          : <Text style={destekSt.kaydetBtnYazi}>💾 Kaydet</Text>}
                                </TouchableOpacity>
                            </View>
                        ) : null}
                        {mevcutKayit && (
                            <View style={destekSt.mevcutBilgi}>
                                <Text style={destekSt.mevcutBilgiYazi}>
                                    ✓ Kayıtlı{mevcutKayit.atamaTarih ? ' — ' + formatTarih(mevcutKayit.atamaTarih) : ''}
                                </Text>
                            </View>
                        )}
                    </View>
                );
            })}
        </View>
    );
}

function DestekTabloSatiri({ baslarf, ad, gorev, atamaTarih, onTarihDegis, onSil }) {
    const [localTarih, setLocalTarih] = useState(atamaTarih);
    function handleChange(v) { setLocalTarih(v); onTarihDegis(v); }
    return (
        <View style={destekSt.tabloSatir}>
            <View style={destekSt.tabloAvatar}><Text style={destekSt.tabloAvatarYazi}>{baslarf}</Text></View>
            <View style={{ flex: 1 }}>
                <Text style={destekSt.tabloAd}>{ad}</Text>
                {gorev ? <Text style={destekSt.tabloGorev}>{gorev}</Text> : null}
                <TextInput style={destekSt.tabloTarihInput} value={localTarih} onChangeText={handleChange}
                    placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" keyboardType="numbers-and-punctuation" />
            </View>
            <TouchableOpacity style={destekSt.tabloSilBtn} onPress={onSil}>
                <Text style={destekSt.tabloSilBtnYazi}>🗑️</Text>
            </TouchableOpacity>
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// İSG KURULU FORMU
// ═══════════════════════════════════════════════════════════════════════
function KurulFormu({ state, setState, kaydediyor, onKaydet, onTamamlandi, onGecmisSil }) {
    const { zorunluDegil, planTarih, gecmis, tehlikeSinifi } = state;
    const sinifBilgi = KURUL_SINIF_BILGI[tehlikeSinifi] || KURUL_SINIF_BILGI[''];
    const geri = planTarih ? geriSayimMetni(planTarih) : null;
    return (
        <View style={kurulSt.kart}>
            <View style={kurulSt.kartBaslik}>
                <Text style={kurulSt.kartBaslikIkon}>👥</Text>
                <Text style={kurulSt.kartBaslikYazi}>İSG Kurulu</Text>
                <View style={[kurulSt.durumRozet,
                    zorunluDegil ? kurulSt.durumRozetMuaf :
                    planTarih    ? kurulSt.durumRozetTamam : kurulSt.durumRozetEksik]}>
                    <Text style={[kurulSt.durumRozetYazi,
                        zorunluDegil ? { color: '#475569' } :
                        planTarih    ? { color: '#15803d' } : { color: '#dc2626' }]}>
                        {zorunluDegil ? 'MUAF' : planTarih ? 'TAMAM' : 'EKSİK'}
                    </Text>
                </View>
            </View>
            <View style={kurulSt.satir}>
                <View style={{ flex: 1 }}>
                    <Text style={kurulSt.satirYazi}>Kurul zorunlu değil</Text>
                    <Text style={kurulSt.satirNot}>İşaretlersen kurul alanı pasifleşir.</Text>
                </View>
                <Switch value={zorunluDegil} onValueChange={v => setState(s => ({ ...s, zorunluDegil: v }))}
                    trackColor={{ false: '#cbd5e1', true: '#86efac' }}
                    thumbColor={zorunluDegil ? '#16a34a' : '#f1f5f9'} />
            </View>
            {!zorunluDegil && (
                <>
                    <View style={[kurulSt.sinifBant, { backgroundColor: sinifBilgi.bg, borderColor: sinifBilgi.bd }]}>
                        <Text style={[kurulSt.sinifBantYazi, { color: sinifBilgi.renk }]}>{sinifBilgi.yazi}</Text>
                    </View>
                    <Text style={kurulSt.miniEtiket}>PLANLANAN TOPLANTI TARİHİ</Text>
                    <TextInput style={kurulSt.tarihInput} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8"
                        value={planTarih} onChangeText={v => setState(s => ({ ...s, planTarih: v }))}
                        keyboardType="numbers-and-punctuation" />
                    {geri && (
                        <View style={[kurulSt.geriBant,
                            geri.tip === 'kritik' ? kurulSt.geriBantKritik :
                            geri.tip === 'uyari'  ? kurulSt.geriBantUyari  : kurulSt.geriBantNormal]}>
                            <Text style={[kurulSt.geriBantYazi,
                                geri.tip === 'kritik' ? { color: '#991b1b' } :
                                geri.tip === 'uyari'  ? { color: '#92400e' } : { color: '#166534' }]}>
                                {geri.metin}
                            </Text>
                        </View>
                    )}
                    <View style={kurulSt.btnSatir}>
                        <TouchableOpacity style={[kurulSt.btnTamamlandi, (kaydediyor || !planTarih) && { opacity: 0.5 }]}
                            onPress={onTamamlandi} disabled={kaydediyor || !planTarih}>
                            <Text style={kurulSt.btnTamamlandiYazi}>✓ Tamamlandı</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[kurulSt.btnKaydet, kaydediyor && { opacity: 0.5 }]}
                            onPress={onKaydet} disabled={kaydediyor}>
                            {kaydediyor ? <ActivityIndicator size="small" color="#fff" />
                                        : <Text style={kurulSt.btnKaydetYazi}>💾 Kaydet</Text>}
                        </TouchableOpacity>
                    </View>
                    {gecmis.length > 0 && (
                        <View style={kurulSt.gecmisAlan}>
                            <Text style={kurulSt.gecmisBaslik}>🗓️ Gerçekleşen Toplantılar ({gecmis.length})</Text>
                            {gecmis.map((tarih, idx) => (
                                <TouchableOpacity key={`${tarih}-${idx}`} style={kurulSt.gecmisSatir}
                                    onLongPress={() => onGecmisSil(tarih, idx)} delayLongPress={500}>
                                    <Text style={kurulSt.gecmisIkon}>✅</Text>
                                    <Text style={kurulSt.gecmisYazi}>{formatTarih(tarih)}</Text>
                                    <Text style={kurulSt.gecmisIpucu}>uzun bas → sil</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </>
            )}
        </View>
    );
}

function geriSayimMetni(tarihStr) {
    const gun    = farkGunHesapla(tarihStr);
    if (gun === null) return null;
    const gorsel = formatTarih(tarihStr);
    if (gun < 0)   return { tip: 'kritik', metin: `⚠️ Toplantı tarihi ${Math.abs(gun)} gün önce geçti! (${gorsel})` };
    if (gun === 0) return { tip: 'kritik', metin: `🔔 Bugün toplantı günü! (${gorsel})` };
    if (gun <= 10) return { tip: 'kritik', metin: `🔴 Toplantıya ${gun} gün kaldı! (${gorsel})` };
    if (gun <= 30) return { tip: 'uyari',  metin: `🟠 Toplantıya ${gun} gün kaldı. (${gorsel})` };
    return           { tip: 'normal', metin: `📅 Toplantıya ${gun} gün kaldı — ${gorsel}` };
}

// ═══════════════════════════════════════════════════════════════════════
// TARİH+BELGE KARTI — tarih inputları + dosya seç + Kaydet tek buton
// ═══════════════════════════════════════════════════════════════════════
function TarihBelgeKart({
    kategori, tarih1, tarih2, mailAt,
    onTarih1Degisti, setTarih2, setMailAt, onKaydet, kaydediyor,
    secilenDosya, onBelgeSec, onBelgeIptal,
    belgeSayisi = 0, onBelgelereGit,
}) {
    const meta  = TB_META[kategori];
    if (!meta) return null;
    const tamam = !!(tarih1 && tarih2);
    const durum = tarih2 ? _durumHesapla(tarih2) : null;
    return (
        <View style={[tbSt.kart, tamam ? tbSt.kartTamam : tbSt.kartEksik, { borderLeftColor: meta.renk }]}>
            {/* Başlık */}
            <View style={tbSt.kartBaslik}>
                <Text style={tbSt.kartBaslikIkon}>{meta.ikon}</Text>
                <Text style={tbSt.kartBaslikYazi}>{meta.baslik}</Text>
                <View style={[tbSt.durumRozet, tamam ? tbSt.durumRozetTamam : tbSt.durumRozetEksik]}>
                    <Text style={[tbSt.durumRozetYazi, { color: tamam ? '#15803d' : '#dc2626' }]}>
                        {tamam ? 'TAMAM' : 'EKSİK'}
                    </Text>
                </View>
            </View>

            {/* Tarih Çifti */}
            <View style={tbSt.tarihSatir}>
                <View style={{ flex: 1 }}>
                    <Text style={tbSt.miniEtiket}>{meta.tarih1Label.toUpperCase()}</Text>
                    <TextInput style={tbSt.tarihInput} value={tarih1} onChangeText={onTarih1Degisti}
                        placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" keyboardType="numbers-and-punctuation" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={tbSt.miniEtiket}>
                        {meta.tarih2Label.toUpperCase()}
                        {meta.tarih2Oto && <Text style={{ color: '#94a3b8', fontWeight: '500' }}> (oto)</Text>}
                    </Text>
                    <TextInput style={[tbSt.tarihInput, meta.tarih2Oto && tbSt.tarihInputOto]}
                        value={tarih2} onChangeText={setTarih2}
                        placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" keyboardType="numbers-and-punctuation" />
                </View>
            </View>

            {/* Durum Bandı */}
            {durum && tarih2 ? (
                <View style={[tbSt.durumBant, { backgroundColor: durum.bg }]}>
                    <Text style={[tbSt.durumBantYazi, { color: durum.renk }]}>
                        {durum.metin} — Geçerlilik: {formatTarih(tarih2)}
                    </Text>
                </View>
            ) : null}

            {/* Denetim: Mail at switch */}
            {meta.ekstra === 'mailAt' && (
                <View style={tbSt.satirCheck}>
                    <Switch value={mailAt} onValueChange={setMailAt}
                        trackColor={{ false: '#cbd5e1', true: '#86efac' }}
                        thumbColor={mailAt ? '#16a34a' : '#f1f5f9'} />
                    <Text style={tbSt.satirCheckYazi}>📧 Firmaya mail at</Text>
                </View>
            )}

            {/* Dosya Seç Bölümü */}
            <View style={tbSt.dosyaAlan}>
                <Text style={tbSt.miniEtiket}>{meta.belgeBaslik} (opsiyonel)</Text>
                <TouchableOpacity
                    style={[tbSt.dosyaSecBtn, secilenDosya && tbSt.dosyaSecBtnSecili]}
                    onPress={onBelgeSec} disabled={kaydediyor}>
                    <Text style={[tbSt.dosyaSecBtnYazi, secilenDosya && { color: '#fff' }]}>
                        {secilenDosya
                            ? `📄 ${secilenDosya.name.length > 26 ? secilenDosya.name.substring(0,23)+'...' : secilenDosya.name}`
                            : '📎 Dosya Seç (PDF/Resim/Word)'}
                    </Text>
                </TouchableOpacity>
                {secilenDosya && (
                    <TouchableOpacity style={tbSt.dosyaIptalBtn} onPress={onBelgeIptal}>
                        <Text style={tbSt.dosyaIptalBtnYazi}>✕ İptal</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Kaydet — tarihleri kaydet + seçili dosyayı yükle (tek buton) */}
            <TouchableOpacity style={[tbSt.kaydetBtn, kaydediyor && { opacity: 0.5 }]}
                onPress={onKaydet} disabled={kaydediyor}>
                {kaydediyor ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={tbSt.kaydetBtnYazi}>Kaydediliyor...</Text>
                    </View>
                ) : (
                    <Text style={tbSt.kaydetBtnYazi}>
                        💾 Kaydet{secilenDosya ? ' + Belge Yükle' : ''}
                    </Text>
                )}
            </TouchableOpacity>

            {/* Tüm Belgeleri Görüntüle */}
            <TouchableOpacity style={[pkSt.goruntuleBtn, { marginTop: 10 }]} onPress={onBelgelereGit}>
                <Text style={pkSt.goruntuleBtnYazi}>📁 Tüm Belgeleri Görüntüle</Text>
                <View style={pkSt.goruntuleSayac}><Text style={pkSt.goruntuleSayacYazi}>{belgeSayisi}</Text></View>
            </TouchableOpacity>
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// PERSONEL KAYIT KARTI
// ═══════════════════════════════════════════════════════════════════════
function PersonelKayitKart({
    kategori, firmaPersonelleri, kayitlar, seciliPersonel,
    tarih1, tarih2, setTarih2, onTarih1Degisti,
    onPersonelSecmeAc, onKaydet, onModalAc, kaydediyor, tehlikeSinifi,
    belgeSayisi = 0, onBelgelereGit,
}) {
    const meta         = PK_META[kategori];
    if (!meta) return null;
    const secilenObj   = firmaPersonelleri.find(p => _personelKey(p) === seciliPersonel);
    const seciliAd     = secilenObj ? (secilenObj.adSoyad || secilenObj.ad || '') + (secilenObj.gorev ? ` — ${secilenObj.gorev}` : '') : '';
    const durum        = tarih2 ? _durumHesapla(tarih2) : null;
    const kayitSayisi  = Object.keys(kayitlar).length;
    const personelSayisi = firmaPersonelleri.length;
    const kartTamam    = kayitSayisi > 0 && kayitSayisi >= personelSayisi;
    const ILKYARDIM_MODU = kategori === 'ilkyardim';
    let ilkyardimUyari = null;
    if (ILKYARDIM_MODU) {
        const oran    = ILKYARDIM_ORAN[tehlikeSinifi] ?? ILKYARDIM_ORAN[''];
        const zorunlu = Math.max(1, Math.ceil((personelSayisi || 1) / oran));
        const mevcut  = kayitSayisi;
        const yeterli = mevcut >= zorunlu;
        const sinifMetin = tehlikeSinifi === 'cok-tehlikeli' ? 'Çok Tehlikeli' :
                           tehlikeSinifi === 'tehlikeli'     ? 'Tehlikeli' :
                           tehlikeSinifi === 'az-tehlikeli'  ? 'Az Tehlikeli' : 'Tanımsız';
        ilkyardimUyari = { zorunlu, mevcut, yeterli, oran, sinifMetin };
    }
    return (
        <View style={[pkSt.kart, kartTamam ? pkSt.kartTamam : pkSt.kartEksik]}>
            <View style={pkSt.kartBaslik}>
                <Text style={pkSt.kartBaslikIkon}>{meta.ikon}</Text>
                <Text style={pkSt.kartBaslikYazi}>{meta.baslik}</Text>
                <View style={[pkSt.durumRozet, kartTamam ? pkSt.durumRozetTamam : pkSt.durumRozetEksik]}>
                    <Text style={[pkSt.durumRozetYazi, { color: kartTamam ? '#15803d' : '#dc2626' }]}>
                        {kartTamam ? 'TAMAM' : 'EKSİK'}
                    </Text>
                </View>
            </View>
            <Text style={pkSt.miniEtiket}>👤 PERSONEL SEÇ</Text>
            <TouchableOpacity style={pkSt.secimBtn} onPress={onPersonelSecmeAc}>
                <Text style={[pkSt.secimBtnYazi, !seciliAd && { color: '#94a3b8' }]} numberOfLines={1}>
                    {seciliAd || '— Personel Seçin —'}
                </Text>
                <Text style={pkSt.secimBtnOk}>▼</Text>
            </TouchableOpacity>
            {seciliPersonel ? (
                <>
                    <View style={pkSt.tarihSatir}>
                        <View style={{ flex: 1 }}>
                            <Text style={pkSt.miniEtiket}>{meta.tarih1Label.toUpperCase()}</Text>
                            <TextInput style={pkSt.tarihInput} placeholder="YYYY-MM-DD"
                                placeholderTextColor="#94a3b8" value={tarih1}
                                onChangeText={onTarih1Degisti} keyboardType="numbers-and-punctuation" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={pkSt.miniEtiket}>{meta.tarih2Label.toUpperCase()} <Text style={{ color: '#94a3b8', fontWeight: '500' }}>(oto)</Text></Text>
                            <TextInput style={[pkSt.tarihInput, pkSt.tarihInputOto]} placeholder="YYYY-MM-DD"
                                placeholderTextColor="#94a3b8" value={tarih2}
                                onChangeText={setTarih2} keyboardType="numbers-and-punctuation" />
                        </View>
                    </View>
                    {durum && tarih2 ? (
                        <View style={[pkSt.durumBant, { backgroundColor: durum.bg }]}>
                            <Text style={[pkSt.durumBantYazi, { color: durum.renk }]}>
                                {durum.metin} — Geçerlilik: {formatTarih(tarih2)}
                            </Text>
                        </View>
                    ) : null}
                    <TouchableOpacity style={[pkSt.kaydetBtn, kaydediyor && { opacity: 0.5 }]}
                        onPress={onKaydet} disabled={kaydediyor}>
                        {kaydediyor ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={pkSt.kaydetBtnYazi}>💾 Kaydet</Text>}
                    </TouchableOpacity>
                </>
            ) : null}
            {ilkyardimUyari && (
                <View style={[pkSt.uyariBant, ilkyardimUyari.yeterli ? pkSt.uyariBantOk : pkSt.uyariBantEksik]}>
                    <Text style={[pkSt.uyariBantYazi, { color: ilkyardimUyari.yeterli ? '#166534' : '#991b1b' }]}>
                        {ilkyardimUyari.yeterli
                            ? `✓ ${ilkyardimUyari.mevcut}/${ilkyardimUyari.zorunlu} ilkyardımcı — Yeterli`
                            : `🔴 ${ilkyardimUyari.sinifMetin} işyeri — Eksik`}
                    </Text>
                    {!ilkyardimUyari.yeterli && (
                        <Text style={pkSt.uyariBantAlt}>
                            Zorunlu: {ilkyardimUyari.zorunlu} kişi ({ilkyardimUyari.oran} kişide 1)  |  Mevcut: {ilkyardimUyari.mevcut} kişi
                        </Text>
                    )}
                </View>
            )}
            {(kayitSayisi > 0 || personelSayisi > 0) && (
                <TouchableOpacity style={pkSt.goruntuleBtn} onPress={onModalAc}>
                    <Text style={pkSt.goruntuleBtnYazi}>👥 {meta.gorButon}</Text>
                    <View style={pkSt.goruntuleSayac}><Text style={pkSt.goruntuleSayacYazi}>{kayitSayisi}</Text></View>
                </TouchableOpacity>
            )}
            <TouchableOpacity style={[pkSt.goruntuleBtn, { marginTop: 8 }]} onPress={onBelgelereGit}>
                <Text style={pkSt.goruntuleBtnYazi}>📁 Tüm Belgeleri Görüntüle</Text>
                <View style={pkSt.goruntuleSayac}><Text style={pkSt.goruntuleSayacYazi}>{belgeSayisi}</Text></View>
            </TouchableOpacity>
        </View>
    );
}

function DurumOzeti({ kategori, kayitlar, firmaPersonelleri }) {
    const meta = PK_META[kategori];
    if (!meta) return null;
    let gecerli = 0, uyari = 0, kritik = 0;
    Object.values(kayitlar).forEach(k => {
        const d = _durumHesapla(k?.[meta.tarih2Field]);
        if (d.tip === 'gecerli') gecerli++;
        else if (d.tip === 'uyari') uyari++;
        else if (d.tip === 'kritik') kritik++;
    });
    const toplam = Object.keys(kayitlar).length;
    return (
        <View style={pkSt.ozetSatir}>
            <View style={[pkSt.ozetChip, { backgroundColor: '#f1f5f9' }]}><Text style={[pkSt.ozetChipYazi, { color: '#475569' }]}>Toplam: {toplam}</Text></View>
            <View style={[pkSt.ozetChip, { backgroundColor: '#dcfce7' }]}><Text style={[pkSt.ozetChipYazi, { color: '#166534' }]}>✓ {gecerli}</Text></View>
            <View style={[pkSt.ozetChip, { backgroundColor: '#fef3c7' }]}><Text style={[pkSt.ozetChipYazi, { color: '#92400e' }]}>⚠ {uyari}</Text></View>
            <View style={[pkSt.ozetChip, { backgroundColor: '#fee2e2' }]}><Text style={[pkSt.ozetChipYazi, { color: '#991b1b' }]}>✗ {kritik}</Text></View>
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// ÖLÇÜM KARTI
// ═══════════════════════════════════════════════════════════════════════
function OlcumKart({ form, onFormGuncelle, listesi, onEkle, onModalAc, onPeriyotSec, kaydediyor }) {
    const tamam         = listesi.length > 0;
    const seciliPeriyot = OLCUM_PERIYOTLAR.find(p => p.kod === form.kontrolPeriyodu);
    return (
        <View style={[tbSt.kart, tamam ? tbSt.kartTamam : tbSt.kartEksik, { borderLeftColor: '#16a34a' }]}>
            <View style={tbSt.kartBaslik}>
                <Text style={tbSt.kartBaslikIkon}>📊</Text>
                <Text style={tbSt.kartBaslikYazi}>Ortam Ölçümleri</Text>
                <View style={[tbSt.durumRozet, tamam ? tbSt.durumRozetTamam : tbSt.durumRozetEksik]}>
                    <Text style={[tbSt.durumRozetYazi, { color: tamam ? '#15803d' : '#dc2626' }]}>{tamam ? 'TAMAM' : 'EKSİK'}</Text>
                </View>
            </View>
            <Text style={tbSt.miniEtiket}>EKİPMAN ADI *</Text>
            <TextInput style={tbSt.tarihInput} placeholder="örn. Gürültü Ölçer, Toz Sayacı"
                placeholderTextColor="#94a3b8" value={form.ekipmanAdi} onChangeText={v => onFormGuncelle('ekipmanAdi', v)} />
            <View style={tbSt.tarihSatir}>
                <View style={{ flex: 1 }}>
                    <Text style={tbSt.miniEtiket}>SERİ NO</Text>
                    <TextInput style={tbSt.tarihInput} placeholder="SN-XXXX" placeholderTextColor="#94a3b8"
                        value={form.seriNo} onChangeText={v => onFormGuncelle('seriNo', v)} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={tbSt.miniEtiket}>RAPOR NO</Text>
                    <TextInput style={tbSt.tarihInput} placeholder="RPR-XXXX" placeholderTextColor="#94a3b8"
                        value={form.raporNo} onChangeText={v => onFormGuncelle('raporNo', v)} />
                </View>
            </View>
            <Text style={tbSt.miniEtiket}>KONTROLÜ YAPAN FİRMA</Text>
            <TextInput style={tbSt.tarihInput} placeholder="Firma/Kurum Adı" placeholderTextColor="#94a3b8"
                value={form.kontrolFirma} onChangeText={v => onFormGuncelle('kontrolFirma', v)} />
            <View style={tbSt.tarihSatir}>
                <View style={{ flex: 1 }}>
                    <Text style={tbSt.miniEtiket}>RAPOR TARİHİ *</Text>
                    <TextInput style={tbSt.tarihInput} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8"
                        value={form.raporTarihi} onChangeText={v => onFormGuncelle('raporTarihi', v)} keyboardType="numbers-and-punctuation" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={tbSt.miniEtiket}>KONTROL PERİYODU</Text>
                    <TouchableOpacity style={pkSt.secimBtn} onPress={onPeriyotSec}>
                        <Text style={pkSt.secimBtnYazi} numberOfLines={1}>{seciliPeriyot?.etiket || 'Yıllık'}</Text>
                        <Text style={pkSt.secimBtnOk}>▼</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <Text style={tbSt.miniEtiket}>GEÇERLİLİK <Text style={{ color: '#94a3b8', fontWeight: '500' }}>(otomatik)</Text></Text>
            <TextInput style={[tbSt.tarihInput, tbSt.tarihInputOto]} placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8" value={form.gecerlilikTarihi} editable={false} />
            <TouchableOpacity style={[tbSt.kaydetBtn, kaydediyor && { opacity: 0.5 }, { marginTop: 10 }]}
                onPress={onEkle} disabled={kaydediyor}>
                {kaydediyor ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={tbSt.kaydetBtnYazi}>💾 Kaydet</Text>}
            </TouchableOpacity>
            {listesi.length > 0 && (
                <TouchableOpacity style={[pkSt.goruntuleBtn, { marginTop: 10 }]} onPress={onModalAc}>
                    <Text style={pkSt.goruntuleBtnYazi}>📊 İş Ekipmanları Durumunu Görüntüle</Text>
                    <View style={pkSt.goruntuleSayac}><Text style={pkSt.goruntuleSayacYazi}>{listesi.length}</Text></View>
                </TouchableOpacity>
            )}
        </View>
    );
}

function OlcumOzeti({ listesi }) {
    let gecerli = 0, uyari = 0, kritik = 0;
    listesi.forEach(e => {
        const d = _durumHesapla(e.gecerlilikTarihi);
        if (d.tip === 'gecerli') gecerli++;
        else if (d.tip === 'uyari') uyari++;
        else if (d.tip === 'kritik') kritik++;
    });
    return (
        <View style={pkSt.ozetSatir}>
            <View style={[pkSt.ozetChip, { backgroundColor: '#f1f5f9' }]}><Text style={[pkSt.ozetChipYazi, { color: '#475569' }]}>Toplam: {listesi.length}</Text></View>
            <View style={[pkSt.ozetChip, { backgroundColor: '#dcfce7' }]}><Text style={[pkSt.ozetChipYazi, { color: '#166534' }]}>✓ {gecerli}</Text></View>
            <View style={[pkSt.ozetChip, { backgroundColor: '#fef3c7' }]}><Text style={[pkSt.ozetChipYazi, { color: '#92400e' }]}>⚠ {uyari}</Text></View>
            <View style={[pkSt.ozetChip, { backgroundColor: '#fee2e2' }]}><Text style={[pkSt.ozetChipYazi, { color: '#991b1b' }]}>✗ {kritik}</Text></View>
        </View>
    );
}

// ─── Yardımcılar ───────────────────────────────────────────────────────
function _kategoridenTur(kat) {
    const map = { rv: 'RV', adp: 'ADP', tatbikat: 'TATBIKAT', denetim: 'DOF', kkd: 'KKD', kurul: 'KURUL', temsilci: 'TEMSILCI', destek: 'DESTEK', uzman: 'UZMAN' };
    return map[kat] || 'DIGER';
}

// ─── BELGE KARTI — işlem butonu eklendi ───────────────────────────────
function BelgeKart({ belge, aciliyor, onPress, onIslem }) {
    const tarihGorsel   = formatTarih(belge.tarih);
    const kayitGorsel   = formatTarih(belge.kayitTarihi);
    const yapilmaGorsel = formatTarih(belge.yapilmaTarihi);
    const gun = belge.tarih ? farkGunHesapla(belge.tarih) : null;
    let durumRenk = '#94a3b8', durumBg = '#f1f5f9', durumYazi = null;
    if (gun !== null) {
        if (gun <= 0)       { durumRenk = '#dc2626'; durumBg = '#fee2e2'; durumYazi = 'SÜRESİ DOLDU'; }
        else if (gun <= 10) { durumRenk = '#dc2626'; durumBg = '#fee2e2'; durumYazi = `${gun} GÜN`; }
        else if (gun <= 30) { durumRenk = '#d97706'; durumBg = '#fef3c7'; durumYazi = `${gun} GÜN`; }
        else                { durumRenk = '#16a34a'; durumBg = '#dcfce7'; durumYazi = `${gun} GÜN`; }
    }
    const turIkon = belge.tur === 'PDF' ? '📄' : belge.tur === 'DOCX' ? '📝' :
                    (belge.tur === 'JPG' || belge.tur === 'PNG') ? '🖼️' :
                    belge.tur === 'XLSX' ? '📊' : belge.tur === 'KAYIT' ? '📋' : '📄';
    const tiklanabilir = belge.tur !== 'KAYIT';

    return (
        <View style={styles.belgeKartSarir}>
            <TouchableOpacity style={[styles.belgeKart, { flex: 1, marginBottom: 0, borderRightWidth: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                onPress={onPress} activeOpacity={tiklanabilir ? 0.7 : 1} disabled={aciliyor}>
                <View style={styles.belgeIkon}>
                    {aciliyor ? <ActivityIndicator size="small" color="#2563eb" />
                              : <Text style={{ fontSize: 24 }}>{turIkon}</Text>}
                </View>
                <View style={styles.belgeIcerik}>
                    <Text style={styles.belgeAd} numberOfLines={2}>{belge.ad}</Text>
                    {tarihGorsel   ? <Text style={styles.belgeTarih}>📅 Geçerlilik: {tarihGorsel}</Text> : null}
                    {yapilmaGorsel ? <Text style={styles.belgeTarih}>🗓️ Yapılma: {yapilmaGorsel}</Text> : null}
                    {kayitGorsel   ? <Text style={styles.belgeKayit}>Yüklenme: {kayitGorsel}</Text> : null}
                    {belge.boyut > 0 ? <Text style={styles.belgeBoyut}>{(belge.boyut / 1024).toFixed(1)} KB · {belge.tur}</Text> : null}
                    {tiklanabilir && !aciliyor && <Text style={styles.belgeAciklama}>👆 Açmak için dokunun</Text>}
                </View>
                {durumYazi && (
                    <View style={[styles.durumRozet, { backgroundColor: durumBg }]}>
                        <Text style={[styles.durumYazi, { color: durumRenk }]}>{durumYazi}</Text>
                    </View>
                )}
            </TouchableOpacity>
            {/* İşlem butonu (sil/tarih güncelle) */}
            <TouchableOpacity style={styles.belgeIslemBtn} onPress={onIslem}>
                <Text style={styles.belgeIslemBtnYazi}>⋮</Text>
            </TouchableOpacity>
        </View>
    );
}

function formatTarih(t) {
    if (!t) return null;
    try {
        if (typeof t === 'string' && t.includes('.') && !t.includes('T')) return t.split(' ')[0];
        const d = new Date(t);
        if (isNaN(d.getTime())) return null;
        const g = String(d.getDate()).padStart(2, '0');
        const a = String(d.getMonth() + 1).padStart(2, '0');
        return `${g}.${a}.${d.getFullYear()}`;
    } catch { return null; }
}

function farkGunHesapla(tarihStr) {
    if (!tarihStr) return null;
    try {
        let bitisDate;
        if (typeof tarihStr === 'string' && tarihStr.includes('.') && !tarihStr.includes('T')) {
            const parcalar = tarihStr.split(' ')[0].split('.');
            if (parcalar.length === 3) {
                const [g, a, y] = parcalar;
                bitisDate = new Date(parseInt(y), parseInt(a) - 1, parseInt(g));
            } else { bitisDate = new Date(tarihStr); }
        } else { bitisDate = new Date(tarihStr); }
        if (isNaN(bitisDate.getTime())) return null;
        const bitis = bitisDate.setHours(0, 0, 0, 0);
        const bugun = new Date().setHours(0, 0, 0, 0);
        return Math.ceil((bitis - bugun) / 86400000);
    } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════
// STİLLER
// ═══════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
    container:     { flex: 1, backgroundColor: '#f8fafc' },
    merkez:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
    hataYazi:      { fontSize: 14, color: '#dc2626', padding: 20, textAlign: 'center' },
    ustBar:        { backgroundColor: '#1e3a8a', padding: 16, paddingTop: 45, flexDirection: 'row', alignItems: 'center' },
    geriBtn:       { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    geriBtnYazi:   { color: '#fff', fontSize: 32, fontWeight: '300' },
    ustBarBaslik:  { color: '#fff', fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
    ustBarAltyazi: { color: '#bfdbfe', fontSize: 11, textAlign: 'center', marginTop: 1 },
    liste:         { padding: 12, paddingBottom: 40 },
    bilgiBar:      { paddingVertical: 8, paddingHorizontal: 4 },
    bilgiBarYazi:  { fontSize: 12, color: '#64748b' },
    // Belge kartı — sağda işlem butonu için sarmalayıcı
    belgeKartSarir:{ flexDirection: 'row', marginBottom: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', backgroundColor: '#fff' },
    belgeKart:     { backgroundColor: '#fff', padding: 14, flexDirection: 'row', alignItems: 'center' },
    belgeIslemBtn: { width: 36, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#e2e8f0' },
    belgeIslemBtnYazi: { fontSize: 20, color: '#475569', fontWeight: '700' },
    belgeIkon:     { width: 44, height: 44, backgroundColor: '#dbeafe', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    belgeIcerik:   { flex: 1 },
    belgeAd:       { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
    belgeTarih:    { fontSize: 12, color: '#475569', marginBottom: 2 },
    belgeKayit:    { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    belgeBoyut:    { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    belgeAciklama: { fontSize: 11, color: '#2563eb', marginTop: 4, fontStyle: 'italic' },
    durumRozet:    { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginLeft: 8, alignItems: 'center', justifyContent: 'center' },
    durumYazi:     { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.3 },
    bosKart:       { margin: 16, padding: 32, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    bosIkon:       { fontSize: 48, marginBottom: 8 },
    bosBaslik:     { fontSize: 16, fontWeight: 'bold', color: '#475569', marginBottom: 4 },
    bosAciklama:   { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
    // Belge işlem modalı
    islemModalArka:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    islemModalKutu:    { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400 },
    islemModalBaslik:  { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 16, lineHeight: 20 },
    islemEtiket:       { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 },
    islemTarihInput:   { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', marginBottom: 10 },
    islemBtnTarih:     { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
    islemBtnYazi:      { color: '#fff', fontWeight: '700', fontSize: 14 },
    islemBtnSil:       { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
    islemBtnSilYazi:   { color: '#dc2626', fontWeight: '700', fontSize: 14 },
    islemBtnKapat:     { padding: 10, alignItems: 'center' },
    islemBtnKapatYazi: { color: '#64748b', fontSize: 14 },
});

const ek = StyleSheet.create({
    yukleBtn:          { backgroundColor: '#2563eb', marginHorizontal: 12, marginTop: 8, marginBottom: 4, padding: 13, borderRadius: 10, alignItems: 'center', elevation: 3 },
    yukleBtnYazi:      { color: '#fff', fontWeight: '700', fontSize: 14 },
    dosyaIptalBtn:     { marginHorizontal: 12, marginTop: 4, padding: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    dosyaIptalBtnYazi: { color: '#64748b', fontSize: 12, fontWeight: '600' },
    tutanakBaslik:     { fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 12, marginLeft: 14, marginBottom: 4 },
    formAlan:          { flex: 1, padding: 12 },
    formKapsayici:     { padding: 12, paddingTop: 4 },
    formBaslik:        { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 14, textAlign: 'center' },
    formKart:          { backgroundColor: '#fff', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
    formKartBaslik:    { fontSize: 13, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
    formEtiket:        { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 },
    formMiniEtiket:    { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 6, marginBottom: 4 },
    formInput:         { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
    kaydetBtn:         { backgroundColor: '#16a34a', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 4 },
    kaydetBtnYazi:     { color: '#fff', fontWeight: '700', fontSize: 15 },
    personelListe:     { maxHeight: 200, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, overflow: 'hidden' },
    personelSatir:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    personelSatirSecili:{ backgroundColor: '#eff6ff' },
    personelAdi:       { fontSize: 13, color: '#0f172a', flex: 1 },
    bosPersonel:       { padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 },
    toast:             { position: 'absolute', top: 100, left: 12, right: 12, padding: 13, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 9999, elevation: 10 },
    toastBasari:       { backgroundColor: '#16a34a' },
    toastHata:         { backgroundColor: '#dc2626' },
    toastYazi:         { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1, marginRight: 8 },
    toastKapat:        { color: '#fff', fontSize: 16, fontWeight: '700' },
    goruntuleBtn:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 6 },
    goruntulebtnYazi:  { color: '#fff', fontSize: 12, fontWeight: '700' },
    goruntuleBadge:    { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
    goruntuleBadgeYazi:{ color: '#1d4ed8', fontSize: 11, fontWeight: '800' },
});

const kurulSt = StyleSheet.create({
    kart:              { backgroundColor: '#fff', margin: 12, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', borderLeftWidth: 4, borderLeftColor: '#dc2626' },
    kartBaslik:        { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    kartBaslikIkon:    { fontSize: 22 },
    kartBaslikYazi:    { flex: 1, fontSize: 15, fontWeight: '700', color: '#0f172a' },
    durumRozet:        { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6 },
    durumRozetEksik:   { backgroundColor: '#fee2e2' },
    durumRozetTamam:   { backgroundColor: '#dcfce7' },
    durumRozetMuaf:    { backgroundColor: '#f1f5f9' },
    durumRozetYazi:    { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
    satir:             { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 10, gap: 8 },
    satirYazi:         { fontSize: 13, fontWeight: '600', color: '#0f172a' },
    satirNot:          { fontSize: 11, color: '#64748b', marginTop: 2 },
    sinifBant:         { padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 10 },
    sinifBantYazi:     { fontSize: 12, fontWeight: '700' },
    miniEtiket:        { fontSize: 11, color: '#64748b', fontWeight: '700', marginBottom: 4, letterSpacing: 0.3 },
    tarihInput:        { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', marginBottom: 10 },
    geriBant:          { padding: 9, borderRadius: 8, borderWidth: 1, marginBottom: 10 },
    geriBantKritik:    { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
    geriBantUyari:     { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
    geriBantNormal:    { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
    geriBantYazi:      { fontSize: 12, fontWeight: '600' },
    btnSatir:          { flexDirection: 'row', gap: 8, marginBottom: 4 },
    btnTamamlandi:     { flex: 1, backgroundColor: '#0284c7', padding: 12, borderRadius: 8, alignItems: 'center' },
    btnTamamlandiYazi: { color: '#fff', fontWeight: '700', fontSize: 13 },
    btnKaydet:         { flex: 1, backgroundColor: '#16a34a', padding: 12, borderRadius: 8, alignItems: 'center' },
    btnKaydetYazi:     { color: '#fff', fontWeight: '700', fontSize: 13 },
    gecmisAlan:        { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    gecmisBaslik:      { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
    gecmisSatir:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderRadius: 6, padding: 8, marginBottom: 4, borderWidth: 1, borderColor: '#bbf7d0', gap: 8 },
    gecmisIkon:        { fontSize: 13 },
    gecmisYazi:        { flex: 1, fontSize: 12, fontWeight: '600', color: '#166534' },
    gecmisIpucu:       { fontSize: 10, color: '#94a3b8', fontStyle: 'italic' },
});

const pkSt = StyleSheet.create({
    kart:              { backgroundColor: '#fff', margin: 12, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderLeftWidth: 4 },
    kartEksik:         { borderColor: '#fecaca', borderLeftColor: '#dc2626' },
    kartTamam:         { borderColor: '#bbf7d0', borderLeftColor: '#16a34a' },
    kartBaslik:        { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    kartBaslikIkon:    { fontSize: 22 },
    kartBaslikYazi:    { flex: 1, fontSize: 15, fontWeight: '700', color: '#0f172a' },
    durumRozet:        { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6 },
    durumRozetEksik:   { backgroundColor: '#fee2e2' },
    durumRozetTamam:   { backgroundColor: '#dcfce7' },
    durumRozetYazi:    { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
    miniEtiket:        { fontSize: 11, color: '#64748b', fontWeight: '700', marginBottom: 4, letterSpacing: 0.3 },
    secimBtn:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 10, gap: 8 },
    secimBtnYazi:      { flex: 1, fontSize: 13, color: '#0f172a' },
    secimBtnOk:        { fontSize: 10, color: '#64748b' },
    tarihSatir:        { flexDirection: 'row', gap: 8, marginBottom: 8 },
    tarihInput:        { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, color: '#0f172a' },
    tarihInputOto:     { backgroundColor: '#f0fdf4', borderColor: '#86efac', color: '#166534' },
    durumBant:         { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, marginTop: 4, marginBottom: 8 },
    durumBantYazi:     { fontSize: 12, fontWeight: '700' },
    kaydetBtn:         { backgroundColor: '#16a34a', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 4 },
    kaydetBtnYazi:     { color: '#fff', fontWeight: '700', fontSize: 14 },
    uyariBant:         { marginTop: 10, padding: 10, borderRadius: 8, borderWidth: 1 },
    uyariBantOk:       { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
    uyariBantEksik:    { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
    uyariBantYazi:     { fontSize: 12, fontWeight: '700' },
    uyariBantAlt:      { fontSize: 10, fontWeight: '600', color: '#991b1b', marginTop: 3 },
    goruntuleBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 8, padding: 11, marginTop: 10, gap: 8 },
    goruntuleBtnYazi:  { fontSize: 12, fontWeight: '700', color: '#1d4ed8' },
    goruntuleSayac:    { backgroundColor: '#2563eb', borderRadius: 12, minWidth: 22, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
    goruntuleSayacYazi:{ color: '#fff', fontSize: 11, fontWeight: '800' },
    modalArka:         { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
    modalKutu:         { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '85%' },
    modalBaslikSatir:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    modalBaslik:       { fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1 },
    modalKapatYazi:    { fontSize: 22, color: '#64748b', paddingHorizontal: 8 },
    modalIpucu:        { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginTop: 8 },
    personelSatir:     { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 6, backgroundColor: '#f8fafc', gap: 10 },
    kayitSatir:        { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 6, backgroundColor: '#f8fafc', gap: 10 },
    avatar:            { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
    avatarYazi:        { color: '#fff', fontSize: 12, fontWeight: '800' },
    personelAd:        { fontSize: 13, fontWeight: '700', color: '#0f172a' },
    personelGorev:     { fontSize: 11, color: '#64748b', marginTop: 1 },
    tarihKucuk:        { fontSize: 11, color: '#475569', marginTop: 2 },
    miniRozet:         { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    miniRozetYazi:     { fontSize: 10, fontWeight: '700' },
    bosListeYazi:      { textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 13 },
    ozetSatir:         { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
    ozetChip:          { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    ozetChipYazi:      { fontSize: 11, fontWeight: '700' },
});

const tbSt = StyleSheet.create({
    kart:              { backgroundColor: '#fff', margin: 12, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderLeftWidth: 4 },
    kartEksik:         { borderColor: '#fecaca' },
    kartTamam:         { borderColor: '#bbf7d0' },
    kartBaslik:        { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    kartBaslikIkon:    { fontSize: 22 },
    kartBaslikYazi:    { flex: 1, fontSize: 15, fontWeight: '700', color: '#0f172a' },
    durumRozet:        { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6 },
    durumRozetEksik:   { backgroundColor: '#fee2e2' },
    durumRozetTamam:   { backgroundColor: '#dcfce7' },
    durumRozetYazi:    { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
    miniEtiket:        { fontSize: 11, color: '#64748b', fontWeight: '700', marginBottom: 4, marginTop: 6, letterSpacing: 0.3 },
    tarihSatir:        { flexDirection: 'row', gap: 8 },
    tarihInput:        { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, color: '#0f172a' },
    tarihInputOto:     { backgroundColor: '#f0fdf4', borderColor: '#86efac', color: '#166534' },
    durumBant:         { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, marginTop: 8 },
    durumBantYazi:     { fontSize: 12, fontWeight: '700' },
    satirCheck:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginTop: 10, gap: 10 },
    satirCheckYazi:    { fontSize: 13, fontWeight: '600', color: '#0f172a', flex: 1 },
    // Dosya seç bölümü
    dosyaAlan:         { marginTop: 10 },
    dosyaSecBtn:       { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 11, alignItems: 'center' },
    dosyaSecBtnSecili: { backgroundColor: '#0369a1', borderColor: '#0369a1' },
    dosyaSecBtnYazi:   { fontSize: 13, color: '#475569', fontWeight: '600' },
    dosyaIptalBtn:     { marginTop: 5, padding: 6, alignItems: 'center' },
    dosyaIptalBtnYazi: { fontSize: 12, color: '#94a3b8' },
    // Kaydet
    kaydetBtn:         { backgroundColor: '#16a34a', padding: 13, borderRadius: 8, alignItems: 'center', marginTop: 12 },
    kaydetBtnYazi:     { color: '#fff', fontWeight: '700', fontSize: 14 },
});

const destekSt = StyleSheet.create({
    formKapsayici:       { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
    formBaslik:          { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 10, textAlign: 'center' },
    ekipKart:            { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', borderLeftWidth: 4 },
    ekipBaslik:          { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    ekipIkonKutu:        { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    ekipIkon:            { fontSize: 17 },
    ekipLabel:           { flex: 1, fontSize: 13, fontWeight: '700' },
    ekipRozet:           { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    ekipRozetYazi:       { color: '#fff', fontSize: 11, fontWeight: '700' },
    personelSecBtn:      { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 11, marginBottom: 8 },
    personelSecBtnYazi:  { color: '#64748b', fontSize: 13 },
    seciliPersonelSatir: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    seciliAvatar:        { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    seciliAvatarYazi:    { color: '#fff', fontSize: 10, fontWeight: '700' },
    seciliPersonelAd:    { flex: 1, fontSize: 13, fontWeight: '600', color: '#0f172a' },
    personelDegistir:    { color: '#64748b', fontSize: 15 },
    tarihKaydetSatir:    { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
    tarihAlan:           { flex: 1 },
    tarihEtiket:         { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 4 },
    tarihInput:          { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, color: '#0f172a' },
    kaydetBtn:           { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    kaydetBtnYazi:       { color: '#fff', fontWeight: '700', fontSize: 12 },
    mevcutBilgi:         { marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#f0fdf4', borderRadius: 6 },
    mevcutBilgiYazi:     { fontSize: 11, color: '#16a34a', fontWeight: '600' },
    modalOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    personelModalKart:   { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '80%' },
    personelModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    personelModalBaslik: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    modalKapat:          { fontSize: 20, color: '#64748b', padding: 4 },
    aramaInput:          { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: '#0f172a', marginBottom: 8 },
    bosPersonelYazi:     { textAlign: 'center', color: '#94a3b8', padding: 30, fontSize: 13 },
    personelSatir:       { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 10 },
    personelSatirSecili: { backgroundColor: '#eff6ff' },
    personelAvatar:      { width: 34, height: 34, borderRadius: 17, backgroundColor: '#7c3aed', justifyContent: 'center', alignItems: 'center' },
    personelAvatarYazi:  { color: '#fff', fontSize: 11, fontWeight: '700' },
    personelAdYazi:      { fontSize: 13, fontWeight: '600', color: '#0f172a' },
    personelGorevYazi:   { fontSize: 11, color: '#64748b', marginTop: 1 },
    tabloModalKart:      { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, flex: 1, marginTop: 60 },
    tabloModalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    tabloModalBaslik:    { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    tabloModalAltyazi:   { fontSize: 12, color: '#64748b', marginTop: 2 },
    ozetSatir:           { flexDirection: 'row', gap: 8, marginBottom: 12 },
    ozetChip:            { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
    ozetChipYazi:        { fontSize: 12, fontWeight: '700', color: '#475569' },
    tabloEkipGrup:       { marginBottom: 10, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
    tabloEkipBaslik:     { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 6 },
    tabloEkipIkon:       { fontSize: 15 },
    tabloEkipLabel:      { flex: 1, fontSize: 13, fontWeight: '700' },
    tabloEkipRozet:      { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    tabloEkipRozetYazi:  { color: '#fff', fontSize: 10, fontWeight: '700' },
    tabloSatir:          { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 10, backgroundColor: '#fff' },
    tabloAvatar:         { width: 30, height: 30, borderRadius: 15, backgroundColor: '#7c3aed', justifyContent: 'center', alignItems: 'center' },
    tabloAvatarYazi:     { color: '#fff', fontSize: 10, fontWeight: '700' },
    tabloAd:             { fontSize: 13, fontWeight: '600', color: '#0f172a' },
    tabloGorev:          { fontSize: 11, color: '#64748b', marginTop: 1 },
    tabloTarihInput:     { marginTop: 4, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, fontSize: 12, color: '#0f172a' },
    tabloSilBtn:         { padding: 8, backgroundColor: '#fee2e2', borderRadius: 8 },
    tabloSilBtnYazi:     { fontSize: 15 },
    tabloBosMesaj:       { alignItems: 'center', padding: 40 },
    tabloBosMesajYazi:   { fontSize: 14, color: '#94a3b8', textAlign: 'center' },
});