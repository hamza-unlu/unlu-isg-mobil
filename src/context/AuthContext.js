// AUTH CONTEXT — Kullanıcı giriş durumunu uygulama genelinde yönetir

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { API_ROTALAR } from '../config/api';
import {
    tokenKaydet,
    tokenAl,
    kullaniciKaydet,
    kullaniciAl,
    tumunuTemizle,
} from '../services/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [kullanici, setKullanici] = useState(null);
    const [yukleniyor, setYukleniyor] = useState(true);

    useEffect(() => {
        oturumKontrol();
    }, []);

    async function oturumKontrol() {
        try {
            const token = await tokenAl();
            const veri = await kullaniciAl();
            if (token && veri) {
                setKullanici(veri);
            }
        } catch (err) {
            console.error('[Auth] Oturum kontrol hatası:', err);
        } finally {
            setYukleniyor(false);
        }
    }

    // GİRİŞ
    async function giris(eposta, sifre) {
        try {
            const yanit = await api.post(API_ROTALAR.GIRIS, { eposta, sifre });
            const token = yanit.token || yanit.veri?.token;
            const kul   = yanit.kullanici || yanit.veri?.kullanici || yanit.veri;
            if (!token) throw new Error('Token alınamadı');
            await tokenKaydet(token);
            await kullaniciKaydet(kul);
            setKullanici(kul);
            return { basarili: true };
        } catch (err) {
            return { basarili: false, mesaj: err.message || 'Giriş başarısız' };
        }
    }

    // KAYIT OL (yeni hesap — sadece uzman/hekim)
    async function kayitOl(adSoyad, eposta, sifre, sifreTekrar, rol) {
        try {
            const yanit = await api.post(API_ROTALAR.KAYIT, {
                adSoyad, eposta, sifre, sifreTekrar, rol,
            });
            const token = yanit.token || yanit.veri?.token;
            const kul   = yanit.kullanici || yanit.veri?.kullanici || yanit.veri;
            if (!token) throw new Error('Token alınamadı');
            await tokenKaydet(token);
            await kullaniciKaydet(kul);
            setKullanici(kul);
            return { basarili: true };
        } catch (err) {
            return { basarili: false, mesaj: err.message || 'Kayıt başarısız' };
        }
    }

    // ŞİFREMİ UNUTTUM
    async function sifreUnuttum(eposta) {
        try {
            const yanit = await api.post('/api/auth/sifre-unuttum', { eposta });
            return {
                basarili: true,
                mesaj: yanit.mesaj || 'Sıfırlama bağlantısı e-posta adresinize gönderildi.',
            };
        } catch (err) {
            return { basarili: false, mesaj: err.message || 'İstek gönderilemedi.' };
        }
    }

    // ⭐ KULLANICI GÜNCELLE (profil foto vb. — state + AsyncStorage)
    async function kullaniciGuncelle(yeniAlanlar) {
        try {
            const guncel = { ...kullanici, ...yeniAlanlar };
            setKullanici(guncel);
            await kullaniciKaydet(guncel);
        } catch (err) {
            console.error('[Auth] Kullanıcı güncelleme hatası:', err);
        }
    }

    // ÇIKIŞ
    async function cikis() {
        await tumunuTemizle();
        setKullanici(null);
    }

    return (
        <AuthContext.Provider value={{
            kullanici,
            yukleniyor,
            girisYapildi: !!kullanici,
            giris,
            kayitOl,
            cikis,
            sifreUnuttum,
            kullaniciGuncelle,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth, AuthProvider içinde kullanılmalı');
    }
    return ctx;
}