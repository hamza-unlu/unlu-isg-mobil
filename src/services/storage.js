
// Telefonda küçük veriler (JWT token, kullanıcı bilgileri) saklamak için.

import AsyncStorage from '@react-native-async-storage/async-storage';

// Kullandığımız anahtarlar — yazım hatası olmasın diye sabit
const ANAHTARLAR = {
    TOKEN:     'isg_token',
    KULLANICI: 'isg_kullanici',
};


export async function tokenKaydet(token) {
    try {
        await AsyncStorage.setItem(ANAHTARLAR.TOKEN, token);
    } catch (err) {
        console.error('[storage] Token kaydedilemedi:', err);
    }
}

export async function tokenAl() {
    try {
        return await AsyncStorage.getItem(ANAHTARLAR.TOKEN);
    } catch (err) {
        console.error('[storage] Token alınamadı:', err);
        return null;
    }
}

export async function tokenSil() {
    try {
        await AsyncStorage.removeItem(ANAHTARLAR.TOKEN);
    } catch (err) {
        console.error('[storage] Token silinemedi:', err);
    }
}

// Kullanıcı bilgisi 
export async function kullaniciKaydet(kullanici) {
    try {
        await AsyncStorage.setItem(
            ANAHTARLAR.KULLANICI,
            JSON.stringify(kullanici)
        );
    } catch (err) {
        console.error('[storage] Kullanıcı kaydedilemedi:', err);
    }
}

export async function kullaniciAl() {
    try {
        const veri = await AsyncStorage.getItem(ANAHTARLAR.KULLANICI);
        return veri ? JSON.parse(veri) : null;
    } catch (err) {
        console.error('[storage] Kullanıcı alınamadı:', err);
        return null;
    }
}

// TEMİZLEME (Çıkış için) 
export async function tumunuTemizle() {
    try {
        await AsyncStorage.multiRemove([
            ANAHTARLAR.TOKEN,
            ANAHTARLAR.KULLANICI,
        ]);
    } catch (err) {
        console.error('[storage] Temizleme hatası:', err);
    }
}