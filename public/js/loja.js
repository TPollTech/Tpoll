const storeProductsContainer = document.getElementById('storeProducts');
const storeEmpty             = document.getElementById('storeEmpty');
const openStoreAdmin         = document.getElementById('openStoreAdmin');
const storeAdminPanel        = document.getElementById('storeAdminPanel');

let storeProducts = [];

const storeApi = (window.TPollStoreApi && typeof window.TPollStoreApi.apiRequest === 'function')
    ? window.TPollStoreApi
    : null;

const { isLocalClient } = window.TPollUtils;

const storeAdmin = (window.TPollStoreAdmin && typeof window.TPollStoreAdmin.init === 'function')
    ? window.TPollStoreAdmin
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

// UI rendering lives in loja.ui.js (window.TPollStoreUI)
// Admin panel lives in loja.admin.js (window.TPollStoreAdmin)


async function reloadForAdmin() {
    storeProducts = await storeApi.apiRequest('/api/admin/products', { method: 'GET' });
    if (storeUi) storeUi.buildStoreCategoryOptions();
    if (storeUi) storeUi.renderStore();
    if (storeAdmin) storeAdmin.renderAdminList(storeProducts);
}

async function reloadForPublic() {
    await loadStoreProducts();
    if (storeUi) storeUi.buildStoreCategoryOptions();
    if (storeUi) storeUi.renderStore();
    if (storeAdmin) storeAdmin.renderAdminList(storeProducts);
}

// UI and admin listeners are registered via init()
if (storeUi) {
    storeUi.init({ getProducts: () => storeProducts });
}

if (storeAdmin) {
    storeAdmin.init({
        getProducts: () => storeProducts,
        reloadForAdmin,
        reloadForPublic
    });
}

async function initStore() {
    if (openStoreAdmin) openStoreAdmin.hidden = true;
    if (storeAdminPanel) storeAdminPanel.hidden = true;

    if (!storeApi) {
        if (storeProductsContainer) storeProductsContainer.innerHTML = '';
        if (storeEmpty) {
            storeEmpty.textContent = 'Não foi possível inicializar a loja (API indisponível).';
            storeEmpty.hidden = false;
        }
        return;
    }

    try {
        const status = await storeApi.apiRequest('/api/admin/status', { method: 'GET' });

        if (isLocalClient() && status.adminEnabled && openStoreAdmin) {
            openStoreAdmin.hidden = false;
            openStoreAdmin.addEventListener('click', () => {
                if (!storeAdminPanel) return;
                storeAdminPanel.hidden = !storeAdminPanel.hidden;
            });
        }

        if (status.loggedIn) {
            if (storeAdmin) storeAdmin.setAdminLoggedIn(true);
            await reloadForAdmin();
        } else {
            if (storeAdmin) storeAdmin.setAdminLoggedIn(false);
            await reloadForPublic();
        }
    } catch (error) {
        if (storeAdmin) storeAdmin.setAdminLoggedIn(false);
        try {
            await reloadForPublic();
        } catch (reloadError) {
            if (storeProductsContainer) storeProductsContainer.innerHTML = '';
            if (storeEmpty) {
                storeEmpty.textContent = 'Não foi possível carregar os produtos no momento.';
                storeEmpty.hidden = false;
            }
        }
    }
}

initStore();
