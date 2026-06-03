
// Backend ile tüm iletişim bu dosyadan geçer.

import { API_BASE_URL, DEBUG } from '../config/api';
import { tokenAl } from './storage';

// Mail endpoint'leri uzun sürebilir (SMTP), onlara daha uzun timeout ver
const MAIL_ROTALARI = ['/api/dokumanlar/mail-gonder', '/api/egitimler'];
const TIMEOUT_MS = (rota) =>
    MAIL_ROTALARI.some(r => rota.startsWith(r)) ? 45000 : 15000;

// ─── ANA İSTEK FONKSİYONU
async function istekGonder(rota, secenekler = {}) {
    const url = `${API_BASE_URL}${rota}`;

    const token = await tokenAl();
    const headers = {
        'Content-Type': 'application/json',
        ...(secenekler.headers || {}),
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (DEBUG) {
        console.log(`[api] ${secenekler.method || 'GET'} ${url}`);
    }

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS(rota));

    try {
        const yanit = await fetch(url, { ...secenekler, headers, signal: controller.signal });
        const veri  = await yanit.json();

        if (!yanit.ok) {
            throw new Error(veri.mesaj || veri.hata || 'İstek başarısız');
        }

        return veri;
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error('İstek zaman aşımına uğradı, lütfen tekrar deneyin.');
        }
        if (DEBUG) console.error(`[api] Hata: ${err.message}`);
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

// KISA YOLLAR 
export const api = {
    get(rota) {
        return istekGonder(rota, { method: 'GET' });
    },
    post(rota, govde) {
        return istekGonder(rota, {
            method: 'POST',
            body: JSON.stringify(govde),
        });
    },
    put(rota, govde) {
        return istekGonder(rota, {
            method: 'PUT',
            body: JSON.stringify(govde),
        });
    },
    delete(rota) {
        return istekGonder(rota, { method: 'DELETE' });
    },
};