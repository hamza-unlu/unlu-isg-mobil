
// Mobil uygulamanın backend ile iletişimi için temel ayarlar.

export const API_BASE_URL = 'https://isg-dokuman-yonetim-sistemi-production.up.railway.app';
//export const API_BASE_URL = 'http://192.168.1.105:5500';
//export const API_BASE_URL = 'http://10.0.2.2:5500';
//export const API_BASE_URL = 'http://172.20.10.14:5500';
//export const API_BASE_URL = 'http://10.50.0.201:5500';

// API endpoint'leri 
export const API_ROTALAR = {
    GIRIS:        '/api/auth/giris',
    KAYIT:        '/api/auth/kayit',
    PROFIL:       '/api/auth/profil',
    FIRMALAR:     '/api/firmalar',
    DOKUMANLAR:   '/api/dokumanlar',
    KRITIK:       '/api/dokumanlar/kritik',
    AI_ANALIZ:    '/api/ai/siniflandir',
};

//  log çıktıları için
export const DEBUG = true;