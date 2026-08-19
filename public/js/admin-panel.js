/* =========================================================
   TPoll Admin Panel — /adminpanel
   Works both locally (Express server) and remotely (GitHub API)
   ========================================================= */
(function () {
    'use strict';

    const api = window.TPollAdminApi;

    /* ------------------------------------------------------- */
    /*  Helpers                                                 */
    /* ------------------------------------------------------- */
    const $ = (s, p) => (p || document).querySelector(s);
    const $$ = (s, p) => [...(p || document).querySelectorAll(s)];

    function toast(msg, type = 'success') {
        let t = $('.ap-toast');
        if (!t) { t = document.createElement('div'); t.className = 'ap-toast'; document.body.appendChild(t); }
        t.textContent = msg;
        t.className = 'ap-toast ' + type;
        requestAnimationFrame(() => t.classList.add('show'));
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('show'), 2500);
    }

    function escHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

    /* ------------------------------------------------------- */
    /*  DOM refs                                                */
    /* ------------------------------------------------------- */
    const loginScreen     = $('#loginScreen');
    const adminPanel      = $('#adminPanel');
    const loginForm       = $('#loginForm');
    const pinInput        = $('#pinInput');
    const loginError      = $('#loginError');
    const loginSubtitle   = $('.login-subtitle');
    const tabs            = $$('.ap-tab');
    const tabContents     = $$('.ap-tab-content');
    const productsList    = $('#productsList');
    const productsEmpty   = $('#productsEmpty');
    const productFormSection = $('#productFormSection');
    const productForm     = $('#productForm');
    const formTitle       = $('#formTitle');
    const statsGrid       = $('#statsGrid');
    const logsList        = $('#logsList');
    const logsEmpty       = $('#logsEmpty');
    const userInfoEl      = $('#userInfo');

    /* ------------------------------------------------------- */
    /*  Auth                                                    */
    /* ------------------------------------------------------- */
    function showLogin() {
        adminPanel.hidden = true;
        adminPanel.style.display = 'none';
        loginScreen.hidden = false;
        loginScreen.style.display = '';
        pinInput.value = '';
        loginError.hidden = true;
        pinInput.focus();
    }

    function showPanel(user) {
        loginScreen.hidden = true;
        loginScreen.style.display = 'none';
        adminPanel.hidden = false;
        adminPanel.style.display = '';
        if (userInfoEl && user) userInfoEl.textContent = user;
        switchTab('products');
    }

    async function checkSession() {
        try {
            const data = await api.status();
            if (data.loggedIn) {
                showPanel(data.user || 'Admin');
                loadProducts();
            } else {
                showLogin();
            }
        } catch {
            showLogin();
        }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.hidden = true;
        const pin = pinInput.value.trim();
        if (!pin) return;
        try {
            const result = await api.login(pin);
            const user = await api.getUser();
            showPanel(user ? user.login : 'Admin');
            loadProducts();
        } catch (err) {
            loginError.textContent = ' ' + (err.message || 'Erro ao entrar.');
            loginError.hidden = false;
            pinInput.value = '';
            pinInput.focus();
        }
    });

    $('#btnLogout').addEventListener('click', async () => {
        try { await api.logout(); } catch {}
        showLogin();
    });

    /* ------------------------------------------------------- */
    /*  Tabs                                                    */
    /* ------------------------------------------------------- */
    function switchTab(name) {
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
        tabContents.forEach(c => c.hidden = true);
        productFormSection.hidden = true;

        const targetId = 'tab' + name.charAt(0).toUpperCase() + name.slice(1);
        const target = $(`#${targetId}`);
        if (target) { target.hidden = false; target.classList.add('active'); }

        if (name === 'products') {
            productFormSection.hidden = true;
            $('#tabProducts').hidden = false;
        }
        if (name === 'stats') loadStats();
        if (name === 'logs') loadLogs();
    }

    tabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
    $('#btnStats').addEventListener('click', () => switchTab('stats'));
    $('#btnLogs').addEventListener('click', () => switchTab('logs'));

    /* ------------------------------------------------------- */
    /*  Products                                                */
    /* ------------------------------------------------------- */
    let allProducts = [];
    let ghMeta = null;

    async function loadProducts() {
        try {
            const data = await api.getProducts();
            allProducts = data.products || [];
            ghMeta = data._gh;
            renderProducts();
        } catch (err) {
            toast(err.message, 'error');
        }
    }

    function renderProducts() {
        productsList.innerHTML = '';
        if (!allProducts.length) { productsEmpty.hidden = false; return; }
        productsEmpty.hidden = true;

        allProducts.forEach(p => {
            const card = document.createElement('div');
            card.className = 'ap-product-card';
            card.addEventListener('click', () => editProduct(p.id));

            const stockClass = p.stock <= 0 ? 'ap-stock-out' : p.stock <= 3 ? 'ap-stock-low' : 'ap-stock-ok';
            const badges = [];
            if (p.onSale) badges.push('<span class="ap-badge ap-badge-sale">PROMO</span>');
            if (p.featured) badges.push('<span class="ap-badge ap-badge-featured">DESTAQUE</span>');
            if (!p.active) badges.push('<span class="ap-badge ap-badge-inactive">INATIVO</span>');

            card.innerHTML = `
                ${p.image
                    ? `<img class="ap-product-img" src="${escHtml(p.image)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                    : ''}
                <div class="ap-product-img-placeholder" ${p.image ? 'style="display:none"' : ''}>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                </div>
                <div class="ap-product-info">
                    <div class="ap-product-name">${escHtml(p.name)}</div>
                    <div class="ap-product-meta">
                        <span class="ap-product-price">R$ ${(p.promoPrice || p.price || 0).toFixed(2)}</span>
                        ${p.onSale && p.price ? `<span class="ap-product-promo">R$ ${p.price.toFixed(2)}</span>` : ''}
                        <span class="ap-product-stock ${stockClass}">Estoque: ${p.stock ?? 0}</span>
                    </div>
                    ${badges.length ? `<div class="ap-product-badges">${badges.join('')}</div>` : ''}
                </div>
                <div class="ap-product-actions">
                    <button type="button" class="ap-icon-btn ap-btn-delete" title="Excluir" data-delete="${p.id}">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                </div>
            `;
            productsList.appendChild(card);
        });

        $$('.ap-btn-delete', productsList).forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.delete;
                const p = allProducts.find(x => x.id === id);
                if (!confirm(`Excluir "${p ? p.name : 'produto'}"?`)) return;
                try {
                    await api.deleteProduct(id);
                    toast('Produto excluído');
                    loadProducts();
                } catch (err) { toast(err.message, 'error'); }
            });
        });
    }

    /* ------------------------------------------------------- */
    /*  Create / Edit                                           */
    /* ------------------------------------------------------- */
    let editingId = null;
    let currentImageUrl = '';

    $('#btnNewProduct').addEventListener('click', () => openForm());
    $('#btnBackToList').addEventListener('click', () => switchTab('products'));
    $('#btnCancelForm').addEventListener('click', () => switchTab('products'));

    function openForm(product = null) {
        editingId = product ? product.id : null;
        formTitle.textContent = product ? 'Editar Produto' : 'Novo Produto';
        $('#pf_id').value = product ? product.id : '';
        $('#pf_name').value = product ? product.name : '';
        $('#pf_category').value = product ? (product.category || '') : '';
        $('#pf_stock').value = product ? (product.stock ?? 1) : 1;
        $('#pf_price').value = product ? (product.price || '') : '';
        $('#pf_promoPrice').value = product ? (product.promoPrice || '') : '';
        $('#pf_description').value = product ? (product.description || '') : '';
        $('#pf_onSale').checked = product ? !!product.onSale : false;
        $('#pf_featured').checked = product ? !!product.featured : false;
        $('#pf_active').checked = product ? product.active !== false : true;
        $('#pf_imageUrl').value = product ? (product.image || '') : '';
        currentImageUrl = product ? (product.image || '') : '';

        // Calculate discount % from price/promoPrice
        const discountInput = $('#pf_discount');
        if (discountInput) {
            if (product && product.price && product.promoPrice && product.price > 0) {
                const pct = Math.round((1 - product.promoPrice / product.price) * 100);
                discountInput.value = pct > 0 && pct < 100 ? pct : '';
            } else {
                discountInput.value = '';
            }
            updateDiscountPreview();
        }

        const preview = $('#pf_imagePreview');
        const placeholder = $('#pf_imagePlaceholder');
        if (currentImageUrl) { preview.src = currentImageUrl; preview.hidden = false; placeholder.hidden = true; }
        else { preview.hidden = true; placeholder.hidden = false; }

        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => { c.classList.remove('active'); c.hidden = true; });
        productFormSection.hidden = false;
        productFormSection.classList.add('active');
    }

    function editProduct(id) {
        const p = allProducts.find(x => x.id === id);
        if (p) openForm(p);
    }

    /* ------------------------------------------------------- */
    /*  Discount % helpers                                      */
    /* ------------------------------------------------------- */
    function updateDiscountPreview() {
        const container = $('#discountPreview');
        if (!container) return;
        const pct = parseInt($('#pf_discount')?.value) || 0;
        const price = parseFloat($('#pf_price')?.value) || 0;
        if (pct > 0 && pct < 100 && price > 0) {
            const final = Math.round(price * (1 - pct / 100) * 100) / 100;
            $('#discountPercent').textContent = pct;
            $('#discountFinal').textContent = final.toFixed(2);
            container.hidden = false;
        } else {
            container.hidden = true;
        }
    }

    $('#pf_discount')?.addEventListener('input', () => {
        const price = parseFloat($('#pf_price')?.value) || 0;
        const pct = parseInt($('#pf_discount')?.value) || 0;
        if (price > 0 && pct > 0 && pct < 100) {
            const promo = Math.round(price * (1 - pct / 100) * 100) / 100;
            $('#pf_promoPrice').value = promo.toFixed(2);
        }
        updateDiscountPreview();
    });

    $('#pf_price')?.addEventListener('input', () => {
        const discountInput = $('#pf_discount');
        if (discountInput && discountInput.value) {
            const price = parseFloat($('#pf_price')?.value) || 0;
            const pct = parseInt(discountInput.value) || 0;
            if (price > 0 && pct > 0 && pct < 100) {
                const promo = Math.round(price * (1 - pct / 100) * 100) / 100;
                $('#pf_promoPrice').value = promo.toFixed(2);
            }
            updateDiscountPreview();
        }
    });

    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            name: $('#pf_name').value.trim(),
            category: $('#pf_category').value.trim(),
            stock: parseInt($('#pf_stock').value) || 0,
            price: parseFloat($('#pf_price').value) || 0,
            promoPrice: parseFloat($('#pf_promoPrice').value) || 0,
            description: $('#pf_description').value.trim(),
            image: currentImageUrl || $('#pf_imageUrl').value.trim(),
            onSale: $('#pf_onSale').checked,
            featured: $('#pf_featured').checked,
            active: $('#pf_active').checked,
        };

        try {
            if (editingId) {
                await api.updateProduct(editingId, body);
                toast('Produto atualizado');
            } else {
                await api.createProduct(body);
                toast('Produto criado');
            }
            switchTab('products');
            loadProducts();
        } catch (err) { toast(err.message, 'error'); }
    });

    /* ------------------------------------------------------- */
    /*  Image Upload                                            */
    /* ------------------------------------------------------- */
    const uploadArea = $('#uploadArea');
    const fileInput  = $('#pf_imageFile');
    const preview    = $('#pf_imagePreview');
    const placeholder= $('#pf_imagePlaceholder');

    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    });
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleUpload(fileInput.files[0]); });

    async function handleUpload(file) {
        if (!file.type.startsWith('image/')) { toast('Selecione uma imagem', 'error'); return; }
        uploadArea.style.opacity = '0.5';
        try {
            const url = await api.uploadImage(file);
            currentImageUrl = url;
            preview.src = url;
            preview.hidden = false;
            placeholder.hidden = true;
            $('#pf_imageUrl').value = '';
            toast('Imagem enviada');
        } catch (err) { toast(err.message, 'error'); }
        uploadArea.style.opacity = '1';
    }

    $('#pf_imageUrl').addEventListener('change', () => {
        const url = $('#pf_imageUrl').value.trim();
        if (url) {
            currentImageUrl = url;
            preview.src = url;
            preview.hidden = false;
            placeholder.hidden = true;
        }
    });

    /* ------------------------------------------------------- */
    /*  Stats                                                   */
    /* ------------------------------------------------------- */
    async function loadStats() {
        try {
            const s = await api.getStats();
            statsGrid.innerHTML = `
                <div class="ap-stat-card"><div class="ap-stat-value">${s.total}</div><div class="ap-stat-label">Total</div></div>
                <div class="ap-stat-card"><div class="ap-stat-value">${s.active}</div><div class="ap-stat-label">Ativos</div></div>
                <div class="ap-stat-card"><div class="ap-stat-value">${s.outOfStock}</div><div class="ap-stat-label">Sem estoque</div></div>
                <div class="ap-stat-card"><div class="ap-stat-value">${s.onSale}</div><div class="ap-stat-label">Em promoção</div></div>
                <div class="ap-stat-card"><div class="ap-stat-value">${s.featured}</div><div class="ap-stat-label">Destaques</div></div>
                <div class="ap-stat-card"><div class="ap-stat-value">R$ ${s.totalValue.toFixed(2)}</div><div class="ap-stat-label">Valor total</div></div>
            `;
        } catch (err) { toast(err.message, 'error'); }
    }

    /* ------------------------------------------------------- */
    /*  Logs                                                    */
    /* ------------------------------------------------------- */
    async function loadLogs() {
        try {
            const logs = await api.getLogs();
            logsList.innerHTML = '';
            if (!logs.length) { logsEmpty.hidden = false; return; }
            logsEmpty.hidden = true;

            logs.forEach(l => {
                const action = (l.action || '').toLowerCase();
                const iconClass = action.includes('creat') ? 'ap-log-icon-create'
                    : action.includes('updat') || action.includes('edit') ? 'ap-log-icon-update'
                    : action.includes('delet') || action.includes('remove') ? 'ap-log-icon-delete'
                    : action.includes('deploy') || action.includes('push') ? 'ap-log-icon-deploy'
                    : 'ap-log-icon-update';
                const icon = action.includes('creat') ? '+'
                    : action.includes('delet') || action.includes('remove') ? '✕'
                    : action.includes('deploy') || action.includes('push') ? '↑'
                    : '✎';
                const time = l.timestamp ? new Date(l.timestamp).toLocaleString('pt-BR') : '';

                const item = document.createElement('div');
                item.className = 'ap-log-item';
                item.innerHTML = `
                    <div class="ap-log-icon ${iconClass}">${icon}</div>
                    <div class="ap-log-body">
                        <div class="ap-log-action">${escHtml(l.action)}</div>
                        ${l.details ? `<div class="ap-log-details">${escHtml(l.details)}</div>` : ''}
                    </div>
                    <div class="ap-log-time">${time}</div>
                `;
                logsList.appendChild(item);
            });
        } catch {}
    }

    /* ------------------------------------------------------- */
    /*  PWA                                                     */
    /* ------------------------------------------------------- */
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('adminpanel/sw.js').catch(() => {});
    }

    // PWA Install prompt
    let deferredPrompt = null;
    const installBanner = $('#installBanner');
    const installBtn = $('#installBtn');
    const installDismiss = $('#installDismiss');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        // Show banner after 2 seconds if not already installed
        if (!localStorage.getItem('tpoll_install_dismissed')) {
            setTimeout(() => { if (installBanner) installBanner.hidden = false; }, 2000);
        }
    });

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') toast('App instalado!');
            deferredPrompt = null;
            installBanner.hidden = true;
        });
    }

    if (installDismiss) {
        installDismiss.addEventListener('click', () => {
            localStorage.setItem('tpoll_install_dismissed', '1');
            installBanner.hidden = true;
        });
    }

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        installBanner.hidden = true;
        toast('App instalado na tela inicial!');
    });

    /* ------------------------------------------------------- */
    /*  Init                                                    */
    /* ------------------------------------------------------- */
    checkSession();
})();
