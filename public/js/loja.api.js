(function () {
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
        try {
            const apiProducts = await apiRequest('/api/store/products', { method: 'GET' });
            if (Array.isArray(apiProducts)) return apiProducts;
        } catch (error) {
            // fallback para ambientes estáticos (sem backend Node ativo)
        }

        const fallbackCandidates = [
            '../assets/data/products.json'
        ];

        for (const fallbackPath of fallbackCandidates) {
            try {
                const fallbackResponse = await fetch(fallbackPath, { cache: 'no-store' });
                if (!fallbackResponse.ok) continue;

                const fallbackData = await fallbackResponse.json();
                if (Array.isArray(fallbackData)) return fallbackData;
            } catch (fallbackError) {
                // tenta o próximo caminho de fallback
            }
        }

        throw new Error('Não foi possível carregar os produtos.');
    }

    window.TPollStoreApi = {
        apiRequest,
        loadStoreProducts
    };
})();
