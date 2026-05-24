// ═══════════════════════════════════════════════════════════════════════
// PERSONEL EKRANI — CRUD (Ekleme / Düzenleme / Silme)
// ═══════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    FlatList,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Modal,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const PERSONEL_ENDPOINT = '/api/personel';
const FIRMA_ENDPOINT    = '/api/firmalar';

// ─── BOŞ FORM ────────────────────────────────────────────────────────
const BOŞ_FORM = {
    adSoyad:        '',
    tcKimlik:       '',
    gorev:          '',
    firmaId:        '',
    iseGirisTarihi: '',
};

// ═══════════════════════════════════════════════════════════════════════
// ANA EKRAN
// ═══════════════════════════════════════════════════════════════════════
export default function PersonelScreen() {
    const { kullanici, cikis } = useAuth();

    const [personeller, setPersoneller]   = useState([]);
    const [firmalar, setFirmalar]         = useState([]);
    const [yukleniyor, setYukleniyor]     = useState(true);
    const [yenileniyor, setYenileniyor]   = useState(false);
    const [hata, setHata]                 = useState('');
    const [arama, setArama]               = useState('');

    // Modal state
    const [modalGorunum, setModalGorunum] = useState(false);   // form modalı
    const [duzenlenen, setDuzenlenen]     = useState(null);    // null = yeni kayıt
    const [form, setForm]                 = useState(BOŞ_FORM);
    const [kaydediyor, setKaydediyor]     = useState(false);
    const [formHata, setFormHata]         = useState('');

    // Firma seçim modalı
    const [firmaModal, setFirmaModal]     = useState(false);
    const [firmaArama, setFirmaArama]     = useState('');

    // ── Veri yükleme ──────────────────────────────────────────────────
    const personelleriYukle = useCallback(async () => {
        try {
            setHata('');
            const yanit = await api.get(PERSONEL_ENDPOINT);
            const liste = yanit.veri || yanit;
            setPersoneller(Array.isArray(liste) ? liste : []);
        } catch (err) {
            setHata(err.message || 'Personel listesi yüklenemedi');
        } finally {
            setYukleniyor(false);
            setYenileniyor(false);
        }
    }, []);

    const firmalariYukle = useCallback(async () => {
        try {
            const yanit = await api.get(FIRMA_ENDPOINT);
            const liste = yanit.veri || yanit;
            setFirmalar(Array.isArray(liste) ? liste : []);
        } catch {
            // firma yüklenemezse sessizce geç
        }
    }, []);

    useEffect(() => {
        Promise.all([personelleriYukle(), firmalariYukle()]);
    }, [personelleriYukle, firmalariYukle]);

    const yenile = useCallback(() => {
        setYenileniyor(true);
        personelleriYukle();
    }, [personelleriYukle]);

    // ── Arama filtresi ────────────────────────────────────────────────
    const filtrelenmis = useMemo(() => {
        if (!arama.trim()) return personeller;
        const q = arama.toLocaleLowerCase('tr-TR');
        return personeller.filter(p => {
            const ad    = (p.adSoyad || '').toLocaleLowerCase('tr-TR');
            const firma = (p.firma?.firmaAdi || '').toLocaleLowerCase('tr-TR');
            const gorev = (p.gorev || '').toLocaleLowerCase('tr-TR');
            const tc    = (p.tcKimlik || '');
            return ad.includes(q) || firma.includes(q) || gorev.includes(q) || tc.includes(q);
        });
    }, [personeller, arama]);

    // ── İstatistik ────────────────────────────────────────────────────
    const istatistik = useMemo(() => {
        const simdi = new Date();
        let kritik = 0;
        personeller.forEach(p => {
            const dolan = [
                p.muayene?.gecerlilikBitis,
                p.egitim?.gecerlilikBitis,
                p.ilkyardim?.gecerlilikBitis,
            ].some(t => t && new Date(t) < simdi);
            if (dolan) kritik++;
        });
        return { toplam: personeller.length, kritik };
    }, [personeller]);

    // ── Modal açma / kapama ───────────────────────────────────────────
    const yeniPersonelAc = useCallback(() => {
        setDuzenlenen(null);
        setForm(BOŞ_FORM);
        setFormHata('');
        setModalGorunum(true);
    }, []);

    const duzenleAc = useCallback((personel) => {
        setDuzenlenen(personel);
        setForm({
            adSoyad:        personel.adSoyad        || '',
            tcKimlik:       personel.tcKimlik        || '',
            gorev:          personel.gorev           || '',
            firmaId:        personel.firma?._id      || personel.firma || '',
            iseGirisTarihi: tarihInputFormatla(personel.iseGirisTarihi),
        });
        setFormHata('');
        setModalGorunum(true);
    }, []);

    const modalKapat = useCallback(() => {
        setModalGorunum(false);
        setDuzenlenen(null);
        setForm(BOŞ_FORM);
        setFormHata('');
    }, []);

    // ── TC doğrulama ──────────────────────────────────────────────────
    const tcDogrula = (tc) => {
        if (!tc || tc.length !== 11 || tc[0] === '0' || !/^\d{11}$/.test(tc)) return false;
        const h = tc.split('').map(Number);
        const tek  = h[0] + h[2] + h[4] + h[6] + h[8];
        const cift = h[1] + h[3] + h[5] + h[7];
        if (((tek * 7) - cift) % 10 !== h[9]) return false;
        if (h.slice(0, 10).reduce((a, b) => a + b, 0) % 10 !== h[10]) return false;
        return true;
    };

    // ── Kaydet ───────────────────────────────────────────────────────
    const kaydet = useCallback(async () => {
        setFormHata('');

        // Basit doğrulama
        if (!form.adSoyad.trim()) return setFormHata('Ad Soyad zorunludur.');
        if (!form.tcKimlik.trim()) return setFormHata('TC Kimlik No zorunludur.');
        if (!tcDogrula(form.tcKimlik)) return setFormHata('Geçersiz TC Kimlik No.');
        if (!form.gorev.trim()) return setFormHata('Görev zorunludur.');
        if (!form.firmaId) return setFormHata('Firma seçimi zorunludur.');

        const payload = {
            adSoyad:        form.adSoyad.trim(),
            tcKimlik:       form.tcKimlik.trim(),
            gorev:          form.gorev.trim(),
            firma:          form.firmaId,
            iseGirisTarihi: form.iseGirisTarihi || undefined,
        };

        try {
            setKaydediyor(true);
            if (duzenlenen) {
                await api.put(`${PERSONEL_ENDPOINT}/${duzenlenen._id}`, payload);
            } else {
                await api.post(PERSONEL_ENDPOINT, payload);
            }
            modalKapat();
            await personelleriYukle();
        } catch (err) {
            setFormHata(err.message || 'Kayıt sırasında hata oluştu.');
        } finally {
            setKaydediyor(false);
        }
    }, [form, duzenlenen, modalKapat, personelleriYukle]);

    // ── Sil ──────────────────────────────────────────────────────────
    const sil = useCallback((personel) => {
        Alert.alert(
            'Personeli Sil',
            `"${personel.adSoyad}" adlı personeli silmek istediğinize emin misiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`${PERSONEL_ENDPOINT}/${personel._id}`);
                            await personelleriYukle();
                        } catch (err) {
                            Alert.alert('Hata', err.message || 'Silme işlemi başarısız.');
                        }
                    },
                },
            ]
        );
    }, [personelleriYukle]);

    // ── Seçili firma adı ──────────────────────────────────────────────
    const secilenFirmaAdi = useMemo(() => {
        const f = firmalar.find(f => f._id === form.firmaId);
        return f ? f.firmaAdi : '';
    }, [firmalar, form.firmaId]);

    const filtrelenmisF = useMemo(() => {
        if (!firmaArama.trim()) return firmalar;
        const q = firmaArama.toLocaleLowerCase('tr-TR');
        return firmalar.filter(f => (f.firmaAdi || '').toLocaleLowerCase('tr-TR').includes(q));
    }, [firmalar, firmaArama]);

    // ── Yükleniyor ────────────────────────────────────────────────────
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

            {/* Başlık + istatistik + ekle butonu */}
            <View style={styles.sayfaBaslik}>
                <Text style={styles.sayfaBaslikYazi}>👥 Personel</Text>
                <View style={styles.istatistikSatir}>
                    <View style={styles.istatistikKutu}>
                        <Text style={styles.istatistikSayi}>{istatistik.toplam}</Text>
                        <Text style={styles.istatistikYazi}>Toplam</Text>
                    </View>
                    {istatistik.kritik > 0 && (
                        <View style={[styles.istatistikKutu, styles.istatistikKritik]}>
                            <Text style={[styles.istatistikSayi, { color: '#dc2626' }]}>
                                {istatistik.kritik}
                            </Text>
                            <Text style={[styles.istatistikYazi, { color: '#dc2626' }]}>⚠️ Kritik</Text>
                        </View>
                    )}
                    <TouchableOpacity style={styles.ekleBtnUst} onPress={yeniPersonelAc}>
                        <Text style={styles.ekleBtnUstYazi}>+ Personel Ekle</Text>
                    </TouchableOpacity>
                </View>
            </View>
            {/* Arama */}
            <View style={styles.aramaKutusu}>
                <Text style={styles.aramaIkon}>🔍</Text>
                <TextInput
                    style={styles.aramaInput}
                    value={arama}
                    onChangeText={setArama}
                    placeholder="Ad, firma, görev veya TC ara..."
                    placeholderTextColor="#94a3b8"
                    autoCorrect={false}
                    autoCapitalize="none"
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

            {/* Liste */}
            <FlatList
                data={filtrelenmis}
                keyExtractor={(item) => item._id || item.id}
                renderItem={({ item }) => (
                    <PersonelKart
                        personel={item}
                        onDuzenle={() => duzenleAc(item)}
                        onSil={() => sil(item)}
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
                        <Text style={styles.bosIkon}>👤</Text>
                        <Text style={styles.bosBaslik}>
                            {arama ? 'Sonuç bulunamadı' : 'Henüz personel yok'}
                        </Text>
                        <Text style={styles.bosAciklama}>
                            {arama
                                ? 'Farklı bir arama deneyin'
                                : 'Sağ alttaki + butonuna basarak personel ekleyin'}
                        </Text>
                    </View>
                }
                contentContainerStyle={styles.liste}
            />

            

            {/* ══════════ PERSONEL FORM MODALI ══════════ */}
            <Modal
                visible={modalGorunum}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={modalKapat}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <SafeAreaView style={styles.modalKapsayici}>
                        {/* Modal başlık */}
                        <View style={styles.modalUst}>
                            <TouchableOpacity onPress={modalKapat} style={styles.modalIptalBtn}>
                                <Text style={styles.modalIptalYazi}>İptal</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalBaslik}>
                                {duzenlenen ? '✏️ Personel Düzenle' : '➕ Yeni Personel'}
                            </Text>
                            <TouchableOpacity
                                onPress={kaydet}
                                style={[styles.modalKaydetBtn, kaydediyor && { opacity: 0.6 }]}
                                disabled={kaydediyor}
                            >
                                {kaydediyor
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={styles.modalKaydetYazi}>Kaydet</Text>
                                }
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalIcerik}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {formHata ? (
                                <View style={styles.formHataKutu}>
                                    <Text style={styles.formHataYazi}>⚠️ {formHata}</Text>
                                </View>
                            ) : null}

                            {/* Ad Soyad */}
                            <FormGrup etiket="Ad Soyad *">
                                <TextInput
                                    style={styles.formInput}
                                    value={form.adSoyad}
                                    onChangeText={v => setForm(f => ({ ...f, adSoyad: v }))}
                                    placeholder="Örn: Ayşe Yılmaz"
                                    placeholderTextColor="#94a3b8"
                                    autoCapitalize="words"
                                />
                            </FormGrup>

                            {/* TC Kimlik */}
                            <FormGrup etiket="TC Kimlik No *">
                                <TextInput
                                    style={styles.formInput}
                                    value={form.tcKimlik}
                                    onChangeText={v =>
                                        setForm(f => ({ ...f, tcKimlik: v.replace(/\D/g, '').slice(0, 11) }))
                                    }
                                    placeholder="11 haneli TC No"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="numeric"
                                    maxLength={11}
                                />
                                {form.tcKimlik.length > 0 && (
                                    <Text style={[
                                        styles.tcDurumYazi,
                                        form.tcKimlik.length < 11
                                            ? { color: '#d97706' }
                                            : tcDogrula(form.tcKimlik)
                                                ? { color: '#16a34a' }
                                                : { color: '#dc2626' }
                                    ]}>
                                        {form.tcKimlik.length < 11
                                            ? `⏳ ${form.tcKimlik.length}/11 hane`
                                            : tcDogrula(form.tcKimlik)
                                                ? '✅ Geçerli TC Kimlik No'
                                                : '❌ Geçersiz TC Kimlik No'}
                                    </Text>
                                )}
                            </FormGrup>

                            {/* Görev */}
                            <FormGrup etiket="Görevi *">
                                <TextInput
                                    style={styles.formInput}
                                    value={form.gorev}
                                    onChangeText={v => setForm(f => ({ ...f, gorev: v }))}
                                    placeholder="Örn: Kaynakçı"
                                    placeholderTextColor="#94a3b8"
                                />
                            </FormGrup>

                            {/* Firma seçimi */}
                            <FormGrup etiket="Çalıştığı Firma *">
                                <TouchableOpacity
                                    style={[styles.formInput, styles.firmaSeciciBtn]}
                                    onPress={() => { setFirmaArama(''); setFirmaModal(true); }}
                                >
                                    <Text style={secilenFirmaAdi ? styles.firmaSeciciYazi : styles.firmaSeciciPlaceholder}>
                                        {secilenFirmaAdi || 'Firma seçiniz...'}
                                    </Text>
                                    <Text style={{ color: '#94a3b8' }}>▼</Text>
                                </TouchableOpacity>
                            </FormGrup>

                            {/* İşe giriş tarihi */}
                            <FormGrup etiket="İşe Giriş Tarihi">
                                <TextInput
                                    style={styles.formInput}
                                    value={form.iseGirisTarihi}
                                    onChangeText={v => setForm(f => ({ ...f, iseGirisTarihi: v }))}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="numeric"
                                />
                            </FormGrup>

                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </SafeAreaView>
                </KeyboardAvoidingView>
            </Modal>

            {/* ══════════ FİRMA SEÇİM MODALI ══════════ */}
            <Modal
                visible={firmaModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setFirmaModal(false)}
            >
                <SafeAreaView style={styles.modalKapsayici}>
                    <View style={styles.modalUst}>
                        <TouchableOpacity
                            onPress={() => setFirmaModal(false)}
                            style={styles.modalIptalBtn}
                        >
                            <Text style={styles.modalIptalYazi}>İptal</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalBaslik}>🏢 Firma Seç</Text>
                        <View style={{ width: 60 }} />
                    </View>

                    {/* Firma arama */}
                    <View style={[styles.aramaKutusu, { marginTop: 8 }]}>
                        <Text style={styles.aramaIkon}>🔍</Text>
                        <TextInput
                            style={styles.aramaInput}
                            value={firmaArama}
                            onChangeText={setFirmaArama}
                            placeholder="Firma ara..."
                            placeholderTextColor="#94a3b8"
                            autoFocus
                        />
                        {firmaArama ? (
                            <TouchableOpacity onPress={() => setFirmaArama('')}>
                                <Text style={styles.aramaSil}>✕</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    <FlatList
                        data={filtrelenmisF}
                        keyExtractor={item => item._id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.firmaListeItem,
                                    item._id === form.firmaId && styles.firmaListeItemSecili,
                                ]}
                                onPress={() => {
                                    setForm(f => ({ ...f, firmaId: item._id }));
                                    setFirmaModal(false);
                                }}
                            >
                                <Text style={[
                                    styles.firmaListeAd,
                                    item._id === form.firmaId && { color: '#2563eb' },
                                ]}>
                                    {item.firmaAdi}
                                </Text>
                                {item._id === form.firmaId && (
                                    <Text style={{ color: '#2563eb', fontSize: 18 }}>✓</Text>
                                )}
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={styles.merkez}>
                                <Text style={{ color: '#94a3b8', marginTop: 40 }}>Firma bulunamadı</Text>
                            </View>
                        }
                        contentContainerStyle={{ paddingBottom: 40 }}
                    />
                </SafeAreaView>
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

function FormGrup({ etiket, children }) {
    return (
        <View style={styles.formGrup}>
            <Text style={styles.formEtiket}>{etiket}</Text>
            {children}
        </View>
    );
}

function PersonelKart({ personel, onDuzenle, onSil }) {
    const tehlikeSinifi  = personel.firma?.tehlikeSinifi;
    const firmaAdi       = personel.firma?.firmaAdi || '—';
    const iseGiris       = formatTarih(personel.iseGirisTarihi);
    const tcMaskeli      = maskeleTC(personel.tcKimlik);
    const tehlikeStil    = stilTehlike(tehlikeSinifi);
   

    return (
        <View style={styles.kart}>
            {/* Baş */}
            <View style={styles.kartUst}>
                <View style={styles.avatarYuvarlak}>
                    <Text style={styles.avatarYazi}>
                        {(personel.adSoyad || '?').charAt(0).toLocaleUpperCase('tr-TR')}
                    </Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.adSoyad} numberOfLines={1}>
                        {personel.adSoyad || 'İsimsiz'}
                    </Text>
                    {personel.gorev ? (
                        <Text style={styles.gorev} numberOfLines={1}>
                            💼 {personel.gorev}
                        </Text>
                    ) : null}
                </View>
                {/* Düzenle / Sil butonları */}
                <View style={styles.kartIslemler}>
                    <TouchableOpacity style={styles.duzenleBtn} onPress={onDuzenle}>
                        <Text style={styles.duzenleBtnYazi}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.silBtn} onPress={onSil}>
                        <Text style={styles.silBtnYazi}>🗑️</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Firma */}
            <View style={styles.firmaSatir}>
                <Text style={styles.firmaIkon}>🏢</Text>
                <Text style={styles.firmaYazi} numberOfLines={1}>{firmaAdi}</Text>
                {tehlikeSinifi ? (
                    <View style={[styles.tehlikeRozet, { backgroundColor: tehlikeStil.bg }]}>
                        <Text style={[styles.tehlikeYazi, { color: tehlikeStil.renk }]}>
                            {tehlikeStil.yazi}
                        </Text>
                    </View>
                ) : null}
            </View>

            {/* TC + giriş */}
            {(tcMaskeli || iseGiris) && (
                <View style={styles.ekBilgiSatir}>
                    {tcMaskeli ? <Text style={styles.ekBilgi}>🆔 {tcMaskeli}</Text> : null}
                    {iseGiris  ? <Text style={styles.ekBilgi}>📅 {iseGiris}</Text>  : null}
                </View>
            )}

            {/* Destek rolleri */}
            {personel.destekRolleri?.length > 0 && (
                <View style={styles.rollerSatir}>
                    {personel.destekRolleri.map((rol, idx) => (
                        <View key={idx} style={styles.rolRozet}>
                            <Text style={styles.rolYazi}>{rol}</Text>
                        </View>
                    ))}
                </View>
            )}

        
        </View>
    );
}

function DurumRozet({ ikon, etiket, durum, bos = false }) {
    if (bos) return (
        <View style={[styles.durumKutu, { backgroundColor: '#f1f5f9' }]}>
            <Text style={styles.durumIkon}>{ikon}</Text>
            <Text style={styles.durumEtiket}>{etiket}</Text>
            <Text style={[styles.durumDeger, { color: '#94a3b8' }]}>—</Text>
        </View>
    );
    if (!durum) return (
        <View style={[styles.durumKutu, { backgroundColor: '#fff7ed' }]}>
            <Text style={styles.durumIkon}>{ikon}</Text>
            <Text style={styles.durumEtiket}>{etiket}</Text>
            <Text style={[styles.durumDeger, { color: '#c2410c' }]}>Yok</Text>
        </View>
    );
    return (
        <View style={[styles.durumKutu, { backgroundColor: durum.bg }]}>
            <Text style={styles.durumIkon}>{ikon}</Text>
            <Text style={styles.durumEtiket}>{etiket}</Text>
            <Text style={[styles.durumDeger, { color: durum.renk }]}>{durum.yazi}</Text>
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// YARDIMCILAR
// ═══════════════════════════════════════════════════════════════════════

function maskeleTC(tc) {
    if (!tc || typeof tc !== 'string') return null;
    const temiz = tc.replace(/\D/g, '');
    if (temiz.length !== 11) return tc;
    return temiz.substring(0, 3) + '*****' + temiz.substring(9);
}

function formatTarih(t) {
    if (!t) return null;
    const d = new Date(t);
    if (isNaN(d.getTime())) return null;
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

function tarihInputFormatla(t) {
    if (!t) return '';
    const d = new Date(t);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function durumHesapla(tarihStr) {
    if (!tarihStr) return null;
    const tarih = new Date(tarihStr);
    if (isNaN(tarih.getTime())) return null;
    const simdi = new Date().setHours(0, 0, 0, 0);
    const bitis = tarih.setHours(0, 0, 0, 0);
    const gun = Math.ceil((bitis - simdi) / 86400000);
    if (gun < 0)   return { yazi: 'DOLDU',     renk: '#dc2626', bg: '#fee2e2' };
    if (gun <= 30) return { yazi: `${gun} gün`, renk: '#d97706', bg: '#fef3c7' };
    return             { yazi: `${gun} gün`, renk: '#16a34a', bg: '#dcfce7' };
}

function stilTehlike(ts) {
    const norm = String(ts || '').toLocaleLowerCase('tr-TR');
    if (norm.includes('çok') || norm.includes('cok'))
        return { yazi: 'ÇOK TEHLİKELİ', renk: '#dc2626', bg: '#fee2e2' };
    if (norm.includes('az'))
        return { yazi: 'AZ TEHLİKELİ',  renk: '#16a34a', bg: '#dcfce7' };
    if (norm.includes('tehlikeli'))
        return { yazi: 'TEHLİKELİ',     renk: '#ca8a04', bg: '#fef3c7' };
    return         { yazi: 'BELİRSİZ',  renk: '#64748b', bg: '#f1f5f9' };
}

// ═══════════════════════════════════════════════════════════════════════
// STİLLER
// ═══════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
    container:           { flex: 1, backgroundColor: '#f8fafc' },
    merkez:              { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Üst bar
    ustBar: {
        backgroundColor: '#1e3a8a',
        padding: 20,
        paddingTop: 45,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ustBarBaslik:  { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    ustBarAltyazi: { color: '#bfdbfe', fontSize: 12, marginTop: 2 },
    cikisBtn: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    cikisBtnYazi: { color: '#fff', fontWeight: '600', fontSize: 13 },

    // Sayfa başlığı
    sayfaBaslik: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    sayfaBaslikYazi:  { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
    istatistikSatir:  { flexDirection: 'row', gap: 8 },
    istatistikKutu: {
        backgroundColor: '#e2e8f0',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        alignItems: 'center',
        minWidth: 56,
    },
    istatistikKritik: { backgroundColor: '#fee2e2' },
    istatistikSayi:   { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
    istatistikYazi:   { fontSize: 10, color: '#64748b', marginTop: 1 },

    ekleBtnUst: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        justifyContent: 'center',
    },
    ekleBtnUstYazi: { color: '#fff', fontWeight: '700', fontSize: 13 },

    // Arama
    aramaKutusu: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    aramaIkon:  { fontSize: 14, marginRight: 8 },
    aramaInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#0f172a' },
    aramaSil:   { fontSize: 16, color: '#94a3b8', padding: 4 },

    // Hata
    hataKart:  { backgroundColor: '#fef2f2', marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 8 },
    hataYazi:  { color: '#dc2626', fontSize: 13 },

    // Liste
    liste: { paddingHorizontal: 12, paddingBottom: 180 },

    // Kart
    kart: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    kartUst:       { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    avatarYuvarlak: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#1e3a8a',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12,
    },
    avatarYazi:    { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    adSoyad:       { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 2 },
    gorev:         { fontSize: 12, color: '#64748b' },

    // Kart işlem butonları
    kartIslemler:  { flexDirection: 'row', gap: 6 },
    duzenleBtn: {
        backgroundColor: '#eff6ff',
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    duzenleBtnYazi: { fontSize: 14 },
    silBtn: {
        backgroundColor: '#fef2f2',
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    silBtnYazi: { fontSize: 14 },

    // Firma satırı
    firmaSatir:    { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
    firmaIkon:     { fontSize: 12 },
    firmaYazi:     { flex: 1, fontSize: 13, color: '#475569', fontWeight: '500' },
    tehlikeRozet:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
    tehlikeYazi:   { fontSize: 9, fontWeight: 'bold', letterSpacing: 0.3 },

    // Ek bilgiler
    ekBilgiSatir:  { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 8 },
    ekBilgi:       { fontSize: 11, color: '#64748b' },

    // Destek rolleri
    rollerSatir:   { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 10 },
    rolRozet: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    rolYazi:       { fontSize: 10, color: '#1d4ed8', fontWeight: '600' },

    // Durum satırı
    durumSatir:    { flexDirection: 'row', gap: 6, marginTop: 4 },
    durumKutu: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 6,
        borderRadius: 8,
        alignItems: 'center',
    },
    durumIkon:     { fontSize: 14, marginBottom: 2 },
    durumEtiket:   { fontSize: 9, color: '#475569', fontWeight: '600', marginBottom: 2 },
    durumDeger:    { fontSize: 11, fontWeight: 'bold' },

    // Boş durum
    bosKart: {
        margin: 16, padding: 32,
        backgroundColor: '#fff',
        borderRadius: 12, alignItems: 'center',
        borderWidth: 1, borderColor: '#e2e8f0',
    },
    bosIkon:      { fontSize: 48, marginBottom: 8 },
    bosBaslik:    { fontSize: 16, fontWeight: 'bold', color: '#475569', marginBottom: 4 },
    bosAciklama:  { fontSize: 13, color: '#94a3b8', textAlign: 'center' },

    // FAB
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    fabIkon: { color: '#fff', fontSize: 28, lineHeight: 32 },

    // Modal genel
    modalKapsayici:  { flex: 1, backgroundColor: '#f8fafc' },
    modalUst: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    modalBaslik:     { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
    modalIptalBtn:   { padding: 4 },
    modalIptalYazi:  { fontSize: 15, color: '#64748b' },
    modalKaydetBtn: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 60,
        alignItems: 'center',
    },
    modalKaydetYazi: { color: '#fff', fontWeight: '700', fontSize: 14 },
    modalIcerik:     { flex: 1, padding: 16 },

    // Form hata kutusu
    formHataKutu: {
        backgroundColor: '#fef2f2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    formHataYazi: { color: '#dc2626', fontSize: 13 },

    // Form grupları
    formGrup:      { marginBottom: 16 },
    formEtiket:    { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
    formInput: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#0f172a',
    },
    tcDurumYazi:   { fontSize: 12, marginTop: 4, fontWeight: '500' },

    // Firma seçici
    firmaSeciciBtn:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    firmaSeciciYazi:        { fontSize: 15, color: '#0f172a', flex: 1 },
    firmaSeciciPlaceholder: { fontSize: 15, color: '#94a3b8', flex: 1 },

    // Firma listesi
    firmaListeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        backgroundColor: '#fff',
    },
    firmaListeItemSecili: { backgroundColor: '#eff6ff' },
    firmaListeAd:         { fontSize: 15, color: '#0f172a', flex: 1 },
});