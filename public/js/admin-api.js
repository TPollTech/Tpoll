/* =========================================================
   TPoll Admin API Abstraction Layer
   Detects environment: local server or GitHub Pages
   ========================================================= */
(function () {
    'use strict';

    const REPO_OWNER = 'TPollTech';
    const REPO_NAME = 'Tpoll';
    const DATA_PATH = 'server/store-data.json';
    const ASSETS_DIR = 'public/assets/fotos-produtos/aplicadas';
    const BRANCH = 'main';

    const GITHUB_API = 'https://api.github.com';

    /* ------------------------------------------------------- */
    /*  Environment detection                                   */
    /* ------------------------------------------------------- */
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

    /* ------------------------------------------------------- */
    /*  Token management (GitHub PAT)                           */
    /* ------------------------------------------------------- */
    function getToken() {
        return localStorage.getItem('tpoll_github_token') || '';
    }

    function setToken(token) {
        localStorage.setItem('tpoll_github_token', token);
    }

    function clearToken() {
        localStorage.removeItem('tpoll_github_token');
    }

    /* ------------------------------------------------------- */
    /*  GitHub API helpers                                      */
    /* ------------------------------------------------------- */
    async function ghFetch(path, options = {}) {
        const token = getToken();
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            ...options.headers,
        };
        if (token) headers['Authorization'] = `token ${token}`;

        const res = await fetch(`${GITHUB_API}${path}`, { ...options, headers });
        if (res.status === 401) {
            clearToken();
            throw new Error('Token inválido ou expirado.');
        }
        if (res.status === 403) {
            throw new Error('Sem permissão. Verifique se o token tem acesso ao repo.');
        }
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message || `Erro GitHub API: ${res.status}`);
        }
        return res;
    }

    async function ghGetFile(filePath) {
        const res = await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}?ref=${BRANCH}`);
        const data = await res.json();
        if (Array.isArray(data)) throw new Error('Caminho é um diretório.');
        return {
            content: atob(data.content.replace(/\n/g, '')),
            sha: data.sha,
            name: data.name,
        };
    }

    async function ghUpdateFile(filePath, newContent, message, sha) {
        const res = await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`, {
            method: 'PUT',
            body: JSON.stringify({
                message,
                content: btoa(unescape(encodeURIComponent(newContent))),
                sha,
                branch: BRANCH,
            }),
        });
        return res.json();
    }

    /* ------------------------------------------------------- */
    /*  Public API (works in both environments)                 */
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
                if (!res.ok) {
                    const d = await res.json().catch(() => ({}));
                    throw new Error(d.error || 'PIN inválido.');
                }
                return { ok: true, mode: 'local' };
            }

            // GitHub mode: PIN is ignored, use stored token
            const token = getToken();
            if (!token) throw new Error('Configure o token GitHub nas configurações.');
            // Validate token
            try {
                await ghFetch('/user');
                return { ok: true, mode: 'github' };
            } catch {
                clearToken();
                throw new Error('Token GitHub inválido. Configure novamente.');
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
            if (isLocal) {
                try { await fetch('/api/adminpanel/logout', { method: 'POST' }); } catch {}
            }
            clearToken();
        },

        async status() {
            if (isLocal) {
                const res = await fetch('/api/adminpanel/status');
                return res.json();
            }
            const token = getToken();
            if (!token) return { loggedIn: false };
            try {
                const res = await ghFetch('/user');
                const user = await res.json();
                return { loggedIn: true, user: user.login };
            } catch {
                return { loggedIn: false };
            }
        },

        /* --- Products -------------------------------------- */
        async getProducts() {
            if (isLocal) {
                const res = await fetch('/api/adminpanel/products', { credentials: 'include' });
                if (res.status === 401) throw new Error('Sessão expirada.');
                const data = await res.json();
                return { products: data.products || [], _gh: null };
            }

            // GitHub mode
            const file = await ghGetFile(DATA_PATH);
            const products = JSON.parse(file.content);
            return { products, _gh: { sha: file.sha } };
        },

        async createProduct(product) {
            if (isLocal) {
                const res = await fetch('/api/adminpanel/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(product),
                });
                if (!res.ok) {
                    const d = await res.json().catch(() => ({}));
                    throw new Error(d.error || 'Erro ao criar produto.');
                }
                return res.json();
            }

            // GitHub mode
            const { products, _gh } = await adminApi.getProducts();
            const newProduct = {
                id: crypto.randomUUID(),
                name: product.name || '',
                category: product.category || '',
                description: product.description || '',
                price: Number(product.price) || 0,
                promoPrice: Number(product.promoPrice) || 0,
                stock: parseInt(product.stock) || 0,
                image: product.image || '',
                onSale: !!product.onSale,
                featured: !!product.featured,
                active: product.active !== false,
            };
            products.unshift(newProduct);
            await ghUpdateFile(DATA_PATH, JSON.stringify(products, null, 2), `Admin: criou produto "${newProduct.name}"`, _gh.sha);
            return newProduct;
        },

        async updateProduct(id, updates) {
            if (isLocal) {
                const res = await fetch(`/api/adminpanel/products/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(updates),
                });
                if (!res.ok) {
                    const d = await res.json().catch(() => ({}));
                    throw new Error(d.error || 'Erro ao atualizar.');
                }
                return res.json();
            }

            // GitHub mode
            const { products, _gh } = await adminApi.getProducts();
            const idx = products.findIndex(p => p.id === id);
            if (idx < 0) throw new Error('Produto não encontrado.');
            products[idx] = { ...products[idx], ...updates };
            await ghUpdateFile(DATA_PATH, JSON.stringify(products, null, 2), `Admin: atualizou "${products[idx].name}"`, _gh.sha);
            return products[idx];
        },

        async deleteProduct(id) {
            if (isLocal) {
                const res = await fetch(`/api/adminpanel/products/${id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                });
                if (!res.ok) {
                    const d = await res.json().catch(() => ({}));
                    throw new Error(d.error || 'Erro ao excluir.');
                }
                return { ok: true };
            }

            // GitHub mode
            const { products, _gh } = await adminApi.getProducts();
            const product = products.find(p => p.id === id);
            if (!product) throw new Error('Produto não encontrado.');
            const filtered = products.filter(p => p.id !== id);
            await ghUpdateFile(DATA_PATH, JSON.stringify(filtered, null, 2), `Admin: removeu "${product.name}"`, _gh.sha);
            return { ok: true };
        },

        /* --- Upload ---------------------------------------- */
        async uploadImage(file) {
            if (isLocal) {
                const fd = new FormData();
                fd.append('image', file);
                const res = await fetch('/api/adminpanel/upload', {
                    method: 'POST',
                    credentials: 'include',
                    body: fd,
                });
                if (!res.ok) {
                    const d = await res.json().catch(() => ({}));
                    throw new Error(d.error || 'Erro no upload.');
                }
                const data = await res.json();
                return data.url;
            }

            // GitHub mode: commit image directly
            const ext = file.name.split('.').pop().toLowerCase();
            const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

            // Convert to webp using canvas
            const webpBlob = await convertToWebp(file);
            const arrayBuffer = await webpBlob.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

            const filePath = `${ASSETS_DIR}/${filename}`;
            await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`, {
                method: 'PUT',
                body: JSON.stringify({
                    message: `Admin: upload de imagem ${filename}`,
                    content: base64,
                    branch: BRANCH,
                }),
            });

            return `assets/fotos-produtos/aplicadas/${filename}`;
        },

        /* --- Stats ----------------------------------------- */
        async getStats() {
            const { products } = await adminApi.getProducts();
            const totalValue = products.reduce((sum, p) => sum + ((p.promoPrice || p.price || 0) * (p.stock || 0)), 0);
            return {
                total: products.length,
                active: products.filter(p => p.active).length,
                outOfStock: products.filter(p => p.stock <= 0).length,
                onSale: products.filter(p => p.onSale).length,
                featured: products.filter(p => p.featured).length,
                totalValue: Math.round(totalValue * 100) / 100,
            };
        },

        /* --- Deploy (GitHub Pages auto-deploys on push) ---- */
        async deploy() {
            if (isLocal) {
                const res = await fetch('/api/adminpanel/deploy', {
                    method: 'POST',
                    credentials: 'include',
                });
                const data = await res.json();
                return data;
            }

            // GitHub mode: just confirm — auto-deploys on push
            return { ok: true, message: 'Alterações já foram salvas no GitHub. O site atualiza automaticamente.' };
        },

        /* --- Logs ------------------------------------------ */
        async getLogs() {
            if (isLocal) {
                const res = await fetch('/api/adminpanel/logs', { credentials: 'include' });
                const data = await res.json();
                return data.logs || [];
            }

            // GitHub mode: use commit history
            try {
                const res = await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/commits?sha=${BRANCH}&per_page=30`);
                const commits = await res.json();
                return commits.map(c => ({
                    action: c.commit.message.split('\n')[0],
                    details: c.commit.author.name,
                    timestamp: new Date(c.commit.author.date).getTime(),
                    type: 'commit',
                }));
            } catch {
                return [];
            }
        },

        /* --- User info ------------------------------------- */
        async getUser() {
            if (isLocal) return null;
            try {
                const res = await ghFetch('/user');
                return res.json();
            } catch {
                return null;
            }
        },
    };

    /* ------------------------------------------------------- */
    /*  Image conversion helper                                 */
    /* ------------------------------------------------------- */
    function convertToWebp(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const max = 800;
                let w = img.width, h = img.height;
                if (w > max || h > max) {
                    if (w > h) { h = Math.round(h * max / w); w = max; }
                    else { w = Math.round(w * max / h); h = max; }
                }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(url);
                    resolve(blob);
                }, 'image/webp', 0.82);
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Erro ao processar imagem.')); };
            img.src = url;
        });
    }

    /* ------------------------------------------------------- */
    /*  Export                                                  */
    /* ------------------------------------------------------- */
    window.TPollAdminApi = adminApi;
})();
