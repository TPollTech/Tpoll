(function () {
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const GITHUB_API = 'https://api.github.com/repos/TPollTech/Tpoll/contents/server/store-data.json?ref=main';

    async function apiRequest(url, options) {
        const response = await fetch(url, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...(options && options.headers || {}) },
            ...options
        });
        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await response.json() : null;
        if (!response.ok) throw new Error((body && body.error) || 'Erro ao processar a solicitação.');
        return body;
    }

    async function loadStoreProducts() {
        // 1. Local server
        if (isLocal) {
            try {
                const products = await apiRequest('/api/store/products', { method: 'GET' });
                if (Array.isArray(products)) return products;
            } catch {}
        }

        // 2. GitHub API (needs token for private repo)
        const token = localStorage.getItem('tpoll_github_token') || '';
        if (token) {
            try {
                const res = await fetch(GITHUB_API, {
                    headers: { 'Accept': 'application/vnd.github.v3+json', 'Authorization': `token ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const decoded = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
                    const products = JSON.parse(decoded);
                    if (Array.isArray(products)) return products;
                }
            } catch {}
        }

        // 3. Static fallback
        const fallbacks = ['../assets/data/products.json', 'assets/data/products.json'];
        for (const path of fallbacks) {
            try {
                const res = await fetch(path, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) return data;
                }
            } catch {}
        }

        throw new Error('Não foi possível carregar os produtos.');
    }

    window.TPollStoreApi = { apiRequest, loadStoreProducts };
})();
