(function () {
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const GITHUB_RAW = 'https://raw.githubusercontent.com/TPollTech/Tpoll/main/server/store-data.json';

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

        // 2. GitHub raw (public repo, no auth needed)
        try {
            const res = await fetch(GITHUB_RAW, { cache: 'no-store' });
            if (res.ok) {
                const products = await res.json();
                if (Array.isArray(products)) return products;
            }
        } catch {}

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
