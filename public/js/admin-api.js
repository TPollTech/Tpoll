/* =========================================================
   TPoll Admin API — GitHub API (public repo)
   Read = no token needed. Write = token required.
   ========================================================= */
(function () {
    'use strict';

    const REPO_OWNER = 'TPollTech';
    const REPO_NAME = 'Tpoll';
    const DATA_PATH = 'server/store-data.json';
    const ASSETS_DIR = 'public/assets/fotos-produtos/aplicadas';
    const BRANCH = 'main';
    const ADMIN_PIN = '240726';
    const GITHUB_API = 'https://api.github.com';

    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

    /* ------------------------------------------------------- */
    /*  Token                                                   */
    /* ------------------------------------------------------- */
    function getToken() { return localStorage.getItem('tpoll_github_token') || ''; }
    function setToken(t) { localStorage.setItem('tpoll_github_token', t); }
    function clearToken() { localStorage.removeItem('tpoll_github_token'); }
    function hasToken() { return !!getToken(); }

    /* ------------------------------------------------------- */
    /*  GitHub API                                              */
    /* ------------------------------------------------------- */
    async function ghFetch(path, options = {}) {
        const token = getToken();
        const headers = { 'Accept': 'application/vnd.github.v3+json', ...options.headers };
        if (token) headers['Authorization'] = `token ${token}`;

        const res = await fetch(`${GITHUB_API}${path}`, { ...options, headers });
        const body = await res.json().catch(() => ({}));

        if (res.status === 401) { clearToken(); throw new Error('Token inválido ou expirado.'); }
        if (res.status === 403) throw new Error('Sem permissão. Verifique o scope do token.');
        if (res.status === 404) throw new Error('Arquivo não encontrado no repo.');
        if (!res.ok) throw new Error(body.message || `Erro: ${res.status}`);
        return body;
    }

    async function ghGetFile(filePath) {
        const data = await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}?ref=${BRANCH}`);
        if (Array.isArray(data)) throw new Error('Caminho é um diretório.');
        return {
            content: decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))),
            sha: data.sha,
        };
    }

    async function ghUpdateFile(filePath, content, message, sha) {
        return await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`, {
            method: 'PUT',
            body: JSON.stringify({
                message,
                content: btoa(unescape(encodeURIComponent(content))),
                sha,
                branch: BRANCH,
            }),
        });
    }

    /* ------------------------------------------------------- */
    /*  Public API                                              */
    /* ------------------------------------------------------- */
    const adminApi = {

        /* --- Auth ------------------------------------------- */
        async login(pin) {
            if (isLocal) {
                const res = await fetch('/api/adminpanel/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin }),
                });
                if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'PIN inválido.'); }
                return { ok: true, mode: 'local' };
            }

            // GitHub Pages: PIN or token
            if (pin === ADMIN_PIN) {
                localStorage.setItem('tpoll_admin_session', 'active');
                return { ok: true, mode: 'github' };
            }

            // Try as token
            setToken(pin);
            try {
                await ghFetch('/user');
                localStorage.setItem('tpoll_admin_session', 'active');
                return { ok: true, mode: 'github' };
            } catch {
                clearToken();
                throw new Error('PIN ou token inválido.');
            }
        },

        async loginWithToken(token) {
            setToken(token);
            try {
                await ghFetch('/user');
                return { ok: true };
            } catch {
                clearToken();
                throw new Error('Token GitHub inválido.');
            }
        },

        async logout() {
            if (isLocal) { try { await fetch('/api/adminpanel/logout', { method: 'POST' }); } catch {} }
            localStorage.removeItem('tpoll_admin_session');
            clearToken();
        },

        async status() {
            if (isLocal) {
                const res = await fetch('/api/adminpanel/status');
                return res.json();
            }
            const session = localStorage.getItem('tpoll_admin_session');
            if (session === 'active') {
                const user = await adminApi.getUser();
                return { loggedIn: true, user: user ? user.login : 'Admin' };
            }
            return { loggedIn: false };
        },

        /* --- Products (read = no token) -------------------- */
        async getProducts() {
            if (isLocal) {
                const res = await fetch('/api/adminpanel/products', { credentials: 'include' });
                if (res.status === 401) throw new Error('Sessão expirada.');
                return { products: (await res.json()).products || [], _gh: null };
            }
            const file = await ghGetFile(DATA_PATH);
            return { products: JSON.parse(file.content), _gh: { sha: file.sha } };
        },

        /* --- Products (write = token required) -------------- */
        async createProduct(product) {
            if (!isLocal && !hasToken()) throw new Error('Salve um token GitHub na aba Config pra cadastrar produtos.');
            if (isLocal) {
                const res = await fetch('/api/adminpanel/products', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', body: JSON.stringify(product),
                });
                if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Erro ao criar.'); }
                return res.json();
            }
            const { products, _gh } = await adminApi.getProducts();
            const p = {
                id: crypto.randomUUID(), name: product.name || '', category: product.category || '',
                description: product.description || '', price: Number(product.price) || 0,
                promoPrice: Number(product.promoPrice) || 0, stock: parseInt(product.stock) || 0,
                image: product.image || '', onSale: !!product.onSale, featured: !!product.featured,
                active: product.active !== false,
            };
            products.unshift(p);
            await ghUpdateFile(DATA_PATH, JSON.stringify(products, null, 2), `Admin: criou "${p.name}"`, _gh.sha);
            return p;
        },

        async updateProduct(id, updates) {
            if (!isLocal && !hasToken()) throw new Error('Salve um token GitHub na aba Config pra editar.');
            if (isLocal) {
                const res = await fetch(`/api/adminpanel/products/${id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', body: JSON.stringify(updates),
                });
                if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Erro ao atualizar.'); }
                return res.json();
            }
            const { products, _gh } = await adminApi.getProducts();
            const idx = products.findIndex(p => p.id === id);
            if (idx < 0) throw new Error('Produto não encontrado.');
            products[idx] = { ...products[idx], ...updates };
            await ghUpdateFile(DATA_PATH, JSON.stringify(products, null, 2), `Admin: atualizou "${products[idx].name}"`, _gh.sha);
            return products[idx];
        },

        async deleteProduct(id) {
            if (!isLocal && !hasToken()) throw new Error('Salve um token GitHub na aba Config pra excluir.');
            if (isLocal) {
                const res = await fetch(`/api/adminpanel/products/${id}`, { method: 'DELETE', credentials: 'include' });
                if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Erro ao excluir.'); }
                return { ok: true };
            }
            const { products, _gh } = await adminApi.getProducts();
            const p = products.find(x => x.id === id);
            if (!p) throw new Error('Produto não encontrado.');
            await ghUpdateFile(DATA_PATH, JSON.stringify(products.filter(x => x.id !== id), null, 2), `Admin: removeu "${p.name}"`, _gh.sha);
            return { ok: true };
        },

        /* --- Upload (token required) ------------------------ */
        async uploadImage(file) {
            if (!isLocal && !hasToken()) throw new Error('Salve um token GitHub na aba Config pra enviar imagens.');
            if (isLocal) {
                const fd = new FormData(); fd.append('image', file);
                const res = await fetch('/api/adminpanel/upload', { method: 'POST', credentials: 'include', body: fd });
                if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Erro no upload.'); }
                return (await res.json()).url;
            }
            const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
            const blob = await convertToWebp(file);
            const buf = await blob.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
            await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${ASSETS_DIR}/${filename}`, {
                method: 'PUT',
                body: JSON.stringify({ message: `Admin: upload ${filename}`, content: base64, branch: BRANCH }),
            });
            return `assets/fotos-produtos/aplicadas/${filename}`;
        },

        /* --- Stats (read) ---------------------------------- */
        async getStats() {
            const { products } = await adminApi.getProducts();
            const tv = products.reduce((s, p) => s + ((p.promoPrice || p.price || 0) * (p.stock || 0)), 0);
            return {
                total: products.length, active: products.filter(p => p.active).length,
                outOfStock: products.filter(p => p.stock <= 0).length,
                onSale: products.filter(p => p.onSale).length, featured: products.filter(p => p.featured).length,
                totalValue: Math.round(tv * 100) / 100,
            };
        },

        /* --- Deploy ---------------------------------------- */
        async deploy() {
            if (isLocal) { const r = await fetch('/api/adminpanel/deploy', { method: 'POST', credentials: 'include' }); return r.json(); }
            return { ok: true, message: 'Alterações salvas. GitHub Pages atualiza automaticamente.' };
        },

        /* --- Logs ------------------------------------------ */
        async getLogs() {
            if (isLocal) { const r = await fetch('/api/adminpanel/logs', { credentials: 'include' }); return (await r.json()).logs || []; }
            try {
                const c = await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/commits?sha=${BRANCH}&per_page=30`);
                return (Array.isArray(c) ? c : []).map(x => ({
                    action: x.commit.message.split('\n')[0], details: x.commit.author.name,
                    timestamp: new Date(x.commit.author.date).getTime(),
                }));
            } catch { return []; }
        },

        /* --- User ------------------------------------------ */
        async getUser() {
            if (isLocal) return null;
            if (!hasToken()) return null;
            try { return await ghFetch('/user'); } catch { return null; }
        },

        hasToken,
    };

    /* ------------------------------------------------------- */
    /*  WebP converter                                          */
    /* ------------------------------------------------------- */
    function convertToWebp(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                const c = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > 800 || h > 800) { if (w > h) { h = Math.round(h * 800 / w); w = 800; } else { w = Math.round(w * 800 / h); h = 800; } }
                c.width = w; c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                c.toBlob(b => { URL.revokeObjectURL(url); resolve(b); }, 'image/webp', 0.82);
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Erro ao processar imagem.')); };
            img.src = url;
        });
    }

    window.TPollAdminApi = adminApi;
})();
