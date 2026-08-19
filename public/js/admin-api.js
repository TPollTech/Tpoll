/* =========================================================
   TPoll Admin API — GitHub API (private repo)
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
    /*  GitHub fetch                                            */
    /* ------------------------------------------------------- */
    async function ghFetch(path, options = {}) {
        const token = getToken();
        const headers = { 'Accept': 'application/vnd.github.v3+json', ...options.headers };
        if (token) headers['Authorization'] = `token ${token}`;
        else throw new Error('Token GitHub não configurado.');

        const res = await fetch(`${GITHUB_API}${path}`, { ...options, headers });
        const body = await res.json().catch(() => ({}));

        if (res.status === 401) { clearToken(); throw new Error('Token inválido ou expirado.'); }
        if (res.status === 403) throw new Error('Sem permissão. Verifique o scope "repo" do token.');
        if (res.status === 404) throw new Error('Arquivo não encontrado no repo. Verifique se o repo está correto.');
        if (!res.ok) throw new Error(body.message || `Erro GitHub API: ${res.status}`);
        return body;
    }

    async function ghGetFile(filePath) {
        const data = await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}?ref=${BRANCH}`);
        if (Array.isArray(data)) throw new Error('Caminho é um diretório.');
        return {
            content: decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))),
            sha: data.sha,
            name: data.name,
        };
    }

    async function ghUpdateFile(filePath, newContent, message, sha) {
        return await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`, {
            method: 'PUT',
            body: JSON.stringify({
                message,
                content: btoa(unescape(encodeURIComponent(newContent))),
                sha,
                branch: BRANCH,
            }),
        });
    }

    /* ------------------------------------------------------- */
    /*  Validate token against this repo                        */
    /* ------------------------------------------------------- */
    async function validateRepoAccess() {
        const data = await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}`);
        return data && data.full_name === `${REPO_OWNER}/${REPO_NAME}`;
    }

    /* ------------------------------------------------------- */
    /*  Public API                                              */
    /* ------------------------------------------------------- */
    const adminApi = {

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

            // GitHub Pages: PIN only works if token already saved
            if (pin === ADMIN_PIN) {
                if (!hasToken()) {
                    throw new Error('PIN correto! Agora salve um token GitHub na aba Config pra poder acessar os dados.');
                }
                // Validate token works with this repo
                try {
                    await validateRepoAccess();
                } catch (err) {
                    throw new Error('Token salvo mas não consegue acessar o repo: ' + err.message);
                }
                localStorage.setItem('tpoll_admin_session', 'active');
                return { ok: true, mode: 'github' };
            }

            // Try as GitHub token directly
            setToken(pin);
            try {
                await validateRepoAccess();
                localStorage.setItem('tpoll_admin_session', 'active');
                return { ok: true, mode: 'github' };
            } catch (err) {
                clearToken();
                throw new Error('Token inválido ou sem acesso ao repo: ' + err.message);
            }
        },

        async loginWithToken(token) {
            setToken(token);
            try {
                await validateRepoAccess();
                return { ok: true };
            } catch (err) {
                clearToken();
                throw new Error(err.message || 'Token GitHub inválido.');
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
            if (session === 'active' && hasToken()) {
                try {
                    const user = await adminApi.getUser();
                    return { loggedIn: true, user: user ? user.login : 'Admin' };
                } catch { return { loggedIn: false }; }
            }
            return { loggedIn: false };
        },

        /* --- Products -------------------------------------- */
        async getProducts() {
            if (isLocal) {
                const res = await fetch('/api/adminpanel/products', { credentials: 'include' });
                if (res.status === 401) throw new Error('Sessão expirada.');
                const data = await res.json();
                return { products: data.products || [], _gh: null };
            }
            const file = await ghGetFile(DATA_PATH);
            const products = JSON.parse(file.content);
            return { products, _gh: { sha: file.sha } };
        },

        async createProduct(product) {
            if (!isLocal) {
                if (!hasToken()) throw new Error('Salve um token GitHub na aba Config primeiro.');
            }
            if (isLocal) {
                const res = await fetch('/api/adminpanel/products', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', body: JSON.stringify(product),
                });
                if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Erro ao criar.'); }
                return res.json();
            }

            const { products, _gh } = await adminApi.getProducts();
            const newProduct = {
                id: crypto.randomUUID(),
                name: product.name || '', category: product.category || '',
                description: product.description || '',
                price: Number(product.price) || 0, promoPrice: Number(product.promoPrice) || 0,
                stock: parseInt(product.stock) || 0, image: product.image || '',
                onSale: !!product.onSale, featured: !!product.featured, active: product.active !== false,
            };
            products.unshift(newProduct);
            await ghUpdateFile(DATA_PATH, JSON.stringify(products, null, 2), `Admin: criou "${newProduct.name}"`, _gh.sha);
            return newProduct;
        },

        async updateProduct(id, updates) {
            if (!isLocal && !hasToken()) throw new Error('Salve um token GitHub na aba Config primeiro.');
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
            if (!isLocal && !hasToken()) throw new Error('Salve um token GitHub na aba Config primeiro.');
            if (isLocal) {
                const res = await fetch(`/api/adminpanel/products/${id}`, { method: 'DELETE', credentials: 'include' });
                if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Erro ao excluir.'); }
                return { ok: true };
            }

            const { products, _gh } = await adminApi.getProducts();
            const product = products.find(p => p.id === id);
            if (!product) throw new Error('Produto não encontrado.');
            await ghUpdateFile(DATA_PATH, JSON.stringify(products.filter(p => p.id !== id), null, 2), `Admin: removeu "${product.name}"`, _gh.sha);
            return { ok: true };
        },

        /* --- Upload ---------------------------------------- */
        async uploadImage(file) {
            if (!isLocal && !hasToken()) throw new Error('Salve um token GitHub na aba Config primeiro.');
            if (isLocal) {
                const fd = new FormData(); fd.append('image', file);
                const res = await fetch('/api/adminpanel/upload', { method: 'POST', credentials: 'include', body: fd });
                if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Erro no upload.'); }
                return (await res.json()).url;
            }

            const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
            const webpBlob = await convertToWebp(file);
            const arrayBuffer = await webpBlob.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${ASSETS_DIR}/${filename}`, {
                method: 'PUT',
                body: JSON.stringify({ message: `Admin: upload ${filename}`, content: base64, branch: BRANCH }),
            });
            return `assets/fotos-produtos/aplicadas/${filename}`;
        },

        /* --- Stats ----------------------------------------- */
        async getStats() {
            const { products } = await adminApi.getProducts();
            const totalValue = products.reduce((s, p) => s + ((p.promoPrice || p.price || 0) * (p.stock || 0)), 0);
            return {
                total: products.length, active: products.filter(p => p.active).length,
                outOfStock: products.filter(p => p.stock <= 0).length,
                onSale: products.filter(p => p.onSale).length,
                featured: products.filter(p => p.featured).length,
                totalValue: Math.round(totalValue * 100) / 100,
            };
        },

        /* --- Deploy ---------------------------------------- */
        async deploy() {
            if (isLocal) {
                const res = await fetch('/api/adminpanel/deploy', { method: 'POST', credentials: 'include' });
                return res.json();
            }
            return { ok: true, message: 'Alterações salvas. GitHub Pages atualiza automaticamente.' };
        },

        /* --- Logs ------------------------------------------ */
        async getLogs() {
            if (isLocal) {
                const res = await fetch('/api/adminpanel/logs', { credentials: 'include' });
                return (await res.json()).logs || [];
            }
            if (!hasToken()) return [];
            try {
                const commits = await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/commits?sha=${BRANCH}&per_page=30`);
                return (Array.isArray(commits) ? commits : []).map(c => ({
                    action: c.commit.message.split('\n')[0],
                    details: c.commit.author.name,
                    timestamp: new Date(c.commit.author.date).getTime(),
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
    /*  Image to WebP                                           */
    /* ------------------------------------------------------- */
    function convertToWebp(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                const c = document.createElement('canvas');
                let w = img.width, h = img.height;
                const max = 800;
                if (w > max || h > max) { if (w > h) { h = Math.round(h * max / w); w = max; } else { w = Math.round(w * max / h); h = max; } }
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
