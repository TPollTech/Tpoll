(function () {
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const GITHUB_API = 'https://api.github.com/repos/TPollTech/Tpoll/contents/server/store-data.json?ref=main';

    async function apiRequest(url, options) {
        const requestOptions = options || {};

        const response = await fetch(url, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(requestOptions.headers || {})
            },
            ...requestOptions
        });

        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await response.json() : null;

        if (!response.ok) {
            const message = (body && body.error) || 'Erro ao processar a solicitação.';
            throw new Error(message);
        }

        return body;
    }

    async function loadStoreProducts() {
        // 1. Try local server API
        if (isLocal) {
            try {
                const apiProducts = await apiRequest('/api/store/products', { method: 'GET' });
                if (Array.isArray(apiProducts)) return apiProducts;
            } catch (error) {
                // fallback below
            }
        }

        // 2. Try GitHub API (works without auth for public repos)
        try {
            const res = await fetch(GITHUB_API, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });
            if (res.ok) {
                const data = await res.json();
                const decoded = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
                const products = JSON.parse(decoded);
                if (Array.isArray(products)) return products;
            }
        } catch (error) {
            // fallback below
        }

        // 3. Static fallback file
        const fallbackCandidates = [
            '../assets/data/products.json',
            'assets/data/products.json'
        ];

        for (const fallbackPath of fallbackCandidates) {
            try {
                const fallbackResponse = await fetch(fallbackPath, { cache: 'no-store' });
                if (!fallbackResponse.ok) continue;

                const fallbackData = await fallbackResponse.json();
                if (Array.isArray(fallbackData)) return fallbackData;
            } catch (fallbackError) {
                // tenta o próximo caminho
            }
        }

        throw new Error('Não foi possível carregar os produtos.');
    }

    window.TPollStoreApi = {
        apiRequest,
        loadStoreProducts
    };
})();
