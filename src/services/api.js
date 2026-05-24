
// Backend ile tüm iletişim bu dosyadan geçer.

import { API_BASE_URL, DEBUG } from '../config/api';
import { tokenAl } from './storage';

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

    try {
        const yanit = await fetch(url, { ...secenekler, headers });
        const veri  = await yanit.json();

        if (!yanit.ok) {
            throw new Error(veri.mesaj || veri.hata || 'İstek başarısız');
        }

        return veri;
    } catch (err) {
        if (DEBUG) console.error(`[api] Hata: ${err.message}`);
        throw err;
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