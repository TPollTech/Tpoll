const storeProductsContainer = document.getElementById('storeProducts');
const storeEmpty             = document.getElementById('storeEmpty');

let storeProducts = [];

const storeApi = (window.TPollStoreApi && typeof window.TPollStoreApi.apiRequest === 'function')
    ? window.TPollStoreApi
    : null;

const storeUi = (window.TPollStoreUI && typeof window.TPollStoreUI.init === 'function')
    ? window.TPollStoreUI
    : null;

async function loadStoreProducts() {
    if (!storeApi || typeof storeApi.loadStoreProducts !== 'function') {
        throw new Error('Módulo de API indisponível.');
    }
    storeProducts = await storeApi.loadStoreProducts();
}

if (storeUi) {
    storeUi.init({ getProducts: () => storeProducts });
}

async function initStore() {
    if (!storeApi) {
        if (storeProductsContainer) storeProductsContainer.innerHTML = '';
        if (storeEmpty) {
            storeEmpty.textContent = 'Não foi possível inicializar a loja (API indisponível).';
            storeEmpty.hidden = false;
        }
        return;
    }

    try {
        await loadStoreProducts();
        if (storeUi) storeUi.buildStoreCategoryOptions();
        if (storeUi) storeUi.renderStore();
    } catch (error) {
        if (storeProductsContainer) storeProductsContainer.innerHTML = '';
        if (storeEmpty) {
            storeEmpty.textContent = 'Não foi possível carregar os produtos no momento.';
            storeEmpty.hidden = false;
        }
    }
}

initStore();
