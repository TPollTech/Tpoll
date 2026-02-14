// Smooth scroll para links âncora
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            // Fecha menu mobile se estiver aberto
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
            
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navigation - Mobile Toggle
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    navToggle.classList.toggle('active');
});

// Navigation - Scroll Effect
const navbar = document.getElementById('navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
});

// FAQ Accordion
const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    
    question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        
        // Fecha todos os outros itens
        faqItems.forEach(faq => faq.classList.remove('active'));
        
        // Toggle do item clicado
        if (!isActive) {
            item.classList.add('active');
        }
    });
});

// Animação de entrada dos elementos quando aparecem na tela
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '0';
            entry.target.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, 100);
            
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observar cards de serviço, benefícios e depoimentos
const animatedElements = document.querySelectorAll(
    '.service-card, .benefit-card, .testimonial-card, .process-step, .faq-item'
);

animatedElements.forEach(el => {
    observer.observe(el);
});

// Active navigation link based on scroll position
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        if (window.pageYOffset >= sectionTop) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// Back to Top Button
const backToTopBtn = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 400) {
        backToTopBtn.classList.add('visible');
    } else {
        backToTopBtn.classList.remove('visible');
    }
});

backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Stats Counter Animation
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = entry.target.querySelectorAll('.stat-number');
            statNumbers.forEach(stat => {
                const target = parseInt(stat.getAttribute('data-target'));
                const duration = 2000;
                const increment = target / (duration / 16);
                let current = 0;
                
                const updateCounter = () => {
                    current += increment;
                    if (current < target) {
                        stat.textContent = Math.floor(current);
                        requestAnimationFrame(updateCounter);
                    } else {
                        stat.textContent = target;
                    }
                };
                
                updateCounter();
            });
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const statsSection = document.querySelector('.stats-section');
if (statsSection) {
    statsObserver.observe(statsSection);
}

// Contact Form - Send via WhatsApp
const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const nome = document.getElementById('nome').value.trim();
        const telefone = document.getElementById('telefone').value.trim();
        const aparelho = document.getElementById('aparelho').value;
        const modelo = document.getElementById('modelo').value.trim();
        const problema = document.getElementById('problema').value.trim();
        
        // Montar mensagem para WhatsApp
        let message = `Olá! Gostaria de solicitar um orçamento.\n\n`;
        message += `*Nome:* ${nome}\n`;
        message += `*Telefone:* ${telefone}\n`;
        message += `*Tipo de Aparelho:* ${aparelho}\n`;
        if (modelo) {
            message += `*Marca/Modelo:* ${modelo}\n`;
        }
        message += `\n*Problema:*\n${problema}`;
        
        // Codifica a mensagem para URL
        const encodedMessage = encodeURIComponent(message);
        
        // Abre o WhatsApp com a mensagem
        const whatsappURL = `https://wa.me/5555996765404?text=${encodedMessage}`;
        window.open(whatsappURL, '_blank');
    });
}

// Phone input mask
const telefoneInput = document.getElementById('telefone');
if (telefoneInput) {
    telefoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        
        if (value.length > 0) {
            value = '(' + value;
        }
        if (value.length > 3) {
            value = value.slice(0, 3) + ') ' + value.slice(3);
        }
        if (value.length > 10) {
            value = value.slice(0, 10) + '-' + value.slice(10);
        }
        
        e.target.value = value;
    });
}

// Dark Mode Toggle
const themeToggle = document.getElementById('themeToggle');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

// Check saved preference or system preference
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && prefersDark.matches)) {
        document.body.classList.add('dark-mode');
    }
}

initTheme();

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

// Typewriter Effect
const typewriterElement = document.getElementById('typewriter');
const typewriterTexts = [
    'Conserto de celulares com garantia',
    'Reparo de notebooks e computadores',
    'Manutenção de eletrônicos em geral',
    'Diagnóstico gratuito e rápido',
    'Qualidade, agilidade e confiança'
];

let textIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typeSpeed = 80;

function typeWriter() {
    if (!typewriterElement) return;
    
    const currentText = typewriterTexts[textIndex];
    
    if (isDeleting) {
        typewriterElement.textContent = currentText.substring(0, charIndex - 1);
        charIndex--;
        typeSpeed = 40;
    } else {
        typewriterElement.textContent = currentText.substring(0, charIndex + 1);
        charIndex++;
        typeSpeed = 80;
    }
    
    if (!isDeleting && charIndex === currentText.length) {
        isDeleting = true;
        typeSpeed = 2000; // Pause at end
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % typewriterTexts.length;
        typeSpeed = 500; // Pause before new word
    }
    
    setTimeout(typeWriter, typeSpeed);
}

// Start typewriter after a short delay
setTimeout(typeWriter, 1000);

// Price Calculator
const calcDeviceOptions = document.querySelectorAll('#calcDevice .calc-option');
const calcServiceOptions = document.querySelectorAll('#calcService .calc-option');
const calcResult = document.getElementById('calcResult');

let selectedDevice = null;
let selectedService = null;

function isServiceCompatible(serviceOption, deviceOption) {
    if (!serviceOption || !deviceOption) return true;

    const compatibleDevices = (serviceOption.dataset.devices || '')
        .split(',')
        .map(device => device.trim())
        .filter(Boolean);

    if (compatibleDevices.length === 0) return true;

    return compatibleDevices.includes(deviceOption.dataset.value);
}

function updateServiceAvailability() {
    calcServiceOptions.forEach(option => {
        const compatible = !selectedDevice || isServiceCompatible(option, selectedDevice);

        option.disabled = !compatible;
        option.classList.toggle('is-disabled', !compatible);

        if (!compatible && option === selectedService) {
            option.classList.remove('selected');
            selectedService = null;
        }
    });
}

function updateCalculatorResult() {
    if (!calcResult) return;
    
    const resultValue = calcResult.querySelector('.result-value');
    
    if (selectedDevice && selectedService) {
        const basePrice = parseFloat(selectedDevice.dataset.base);
        const multiplier = parseFloat(selectedService.dataset.mult);
        const minPrice = Math.round(basePrice * multiplier);
        const maxPrice = Math.round(minPrice * 1.8);
        
        resultValue.innerHTML = `R$ ${minPrice} <span style="font-size: 1.2rem; font-weight: 400;">a</span> R$ ${maxPrice}`;
    } else if (selectedDevice || selectedService) {
        resultValue.textContent = 'Selecione ambas opções';
    } else {
        resultValue.textContent = 'Selecione as opções';
    }
}

calcDeviceOptions.forEach(option => {
    option.addEventListener('click', () => {
        calcDeviceOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedDevice = option;
        updateServiceAvailability();
        updateCalculatorResult();
    });
});

calcServiceOptions.forEach(option => {
    option.addEventListener('click', () => {
        if (option.disabled) return;

        calcServiceOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedService = option;
        updateCalculatorResult();
    });
});

updateServiceAvailability();

// Cookie Banner
const cookieBanner = document.getElementById('cookieBanner');
const cookieAccept = document.getElementById('cookieAccept');
const cookieDecline = document.getElementById('cookieDecline');

function showCookieBanner() {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent && cookieBanner) {
        setTimeout(() => {
            cookieBanner.classList.add('visible');
        }, 2000);
    }
}

showCookieBanner();

if (cookieAccept) {
    cookieAccept.addEventListener('click', () => {
        localStorage.setItem('cookieConsent', 'accepted');
        cookieBanner.classList.remove('visible');
    });
}

if (cookieDecline) {
    cookieDecline.addEventListener('click', () => {
        localStorage.setItem('cookieConsent', 'declined');
        cookieBanner.classList.remove('visible');
    });
}

// Loja - Catálogo + Admin (MVP local)
const STORE_STORAGE_KEY = 'tpoll_store_products_v1';
const STORE_ADMIN_PASSWORD = 'tpoll2026';
const STORE_ADMIN_SESSION_KEY = 'tpoll_store_admin_session';

const storeProductsContainer = document.getElementById('storeProducts');
const storeEmpty = document.getElementById('storeEmpty');
const storeSearch = document.getElementById('storeSearch');
const storeCategoryFilter = document.getElementById('storeCategoryFilter');
const openStoreAdmin = document.getElementById('openStoreAdmin');
const storeAdminPanel = document.getElementById('storeAdminPanel');
const storeLoginForm = document.getElementById('storeLoginForm');
const storeAdminPassword = document.getElementById('storeAdminPassword');
const storeAdminLogout = document.getElementById('storeAdminLogout');
const storeAdminContent = document.getElementById('storeAdminContent');
const storeProductForm = document.getElementById('storeProductForm');
const storeAdminList = document.getElementById('storeAdminList');
const clearProductFormBtn = document.getElementById('clearProductForm');

const defaultStoreProducts = [
    {
        id: crypto.randomUUID(),
        name: 'Cabo USB-C Turbo',
        category: 'Acessórios',
        description: 'Cabo reforçado com carregamento rápido.',
        price: 39.9,
        promoPrice: 29.9,
        onSale: true,
        stock: 12,
        image: '',
        active: true
    },
    {
        id: crypto.randomUUID(),
        name: 'Película 3D Premium',
        category: 'Proteção',
        description: 'Película resistente para celulares.',
        price: 45,
        promoPrice: 0,
        onSale: false,
        stock: 20,
        image: '',
        active: true
    }
];

function parseMoney(value) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatMoneyBRL(value) {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function loadStoreProducts() {
    const saved = localStorage.getItem(STORE_STORAGE_KEY);
    if (!saved) {
        localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(defaultStoreProducts));
        return [...defaultStoreProducts];
    }

    try {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) return [...defaultStoreProducts];
        return parsed;
    } catch (error) {
        return [...defaultStoreProducts];
    }
}

function saveStoreProducts(products) {
    localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(products));
}

let storeProducts = loadStoreProducts();

function getFilteredProducts() {
    const query = (storeSearch?.value || '').trim().toLowerCase();
    const category = storeCategoryFilter?.value || 'all';

    return storeProducts.filter(product => {
        if (!product.active) return false;

        const matchesSearch = !query
            || product.name.toLowerCase().includes(query)
            || (product.description || '').toLowerCase().includes(query);

        const matchesCategory = category === 'all' || (product.category || '') === category;
        return matchesSearch && matchesCategory;
    });
}

function buildStoreCategoryOptions() {
    if (!storeCategoryFilter) return;

    const currentValue = storeCategoryFilter.value;
    const categories = [...new Set(
        storeProducts
            .map(product => (product.category || '').trim())
            .filter(Boolean)
    )].sort((left, right) => left.localeCompare(right));

    storeCategoryFilter.innerHTML = '<option value="all">Todas as categorias</option>';

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        storeCategoryFilter.appendChild(option);
    });

    if ([...storeCategoryFilter.options].some(option => option.value === currentValue)) {
        storeCategoryFilter.value = currentValue;
    }
}

function openProductOnWhatsApp(product) {
    const finalPrice = product.onSale && product.promoPrice > 0 ? product.promoPrice : product.price;
    const message = [
        'Olá! Tenho interesse neste item da loja TPoll:',
        '',
        `*Produto:* ${product.name}`,
        `*Preço:* ${formatMoneyBRL(finalPrice)}`,
        `*Categoria:* ${product.category || 'Geral'}`,
        '',
        'Pode me passar mais detalhes?'
    ].join('\n');

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/5555996765404?text=${encodedMessage}`, '_blank');
}

function createProductCard(product) {
    const card = document.createElement('article');
    card.className = 'store-card';

    const imageMarkup = product.image
        ? `<img src="${product.image}" alt="${product.name}" class="store-card-image">`
        : '<div class="store-card-image store-card-image-placeholder">🛍️</div>';

    const hasPromo = product.onSale && product.promoPrice > 0 && product.promoPrice < product.price;
    const priceMarkup = hasPromo
        ? `<p class="store-card-price"><span class="store-price-old">${formatMoneyBRL(parseMoney(product.price))}</span> <span class="store-price-new">${formatMoneyBRL(parseMoney(product.promoPrice))}</span></p>`
        : `<p class="store-card-price">${formatMoneyBRL(parseMoney(product.price))}</p>`;

    card.innerHTML = `
        ${imageMarkup}
        <div class="store-card-content">
            <p class="store-card-category">${product.category || 'Geral'}</p>
            <h3>${product.name}</h3>
            <p class="store-card-description">${product.description || 'Sem descrição.'}</p>
            ${priceMarkup}
            <p class="store-card-stock">Estoque: ${Math.max(0, parseInt(product.stock || 0, 10))}</p>
            <button type="button" class="store-buy-btn">Comprar pelo WhatsApp</button>
        </div>
    `;

    if (hasPromo) {
        const badge = document.createElement('span');
        badge.className = 'store-sale-badge';
        badge.textContent = 'Promoção';
        card.appendChild(badge);
    }

    const buyButton = card.querySelector('.store-buy-btn');
    buyButton?.addEventListener('click', () => openProductOnWhatsApp(product));

    return card;
}

function renderStore() {
    if (!storeProductsContainer || !storeEmpty) return;

    const filteredProducts = getFilteredProducts();
    storeProductsContainer.innerHTML = '';

    if (filteredProducts.length === 0) {
        storeEmpty.hidden = false;
        return;
    }

    storeEmpty.hidden = true;
    filteredProducts.forEach(product => {
        storeProductsContainer.appendChild(createProductCard(product));
    });
}

function setAdminLoggedIn(isLoggedIn) {
    if (!storeAdminContent || !storeAdminLogout || !storeAdminPassword) return;

    storeAdminContent.hidden = !isLoggedIn;
    storeAdminPassword.hidden = isLoggedIn;
    storeAdminLogout.hidden = !isLoggedIn;

    if (isLoggedIn) {
        localStorage.setItem(STORE_ADMIN_SESSION_KEY, '1');
    } else {
        localStorage.removeItem(STORE_ADMIN_SESSION_KEY);
    }
}

function resetProductForm() {
    if (!storeProductForm) return;

    storeProductForm.reset();
    const idInput = document.getElementById('storeProductId');
    const activeInput = document.getElementById('productActive');
    const stockInput = document.getElementById('productStock');

    if (idInput) idInput.value = '';
    if (activeInput) activeInput.checked = true;
    if (stockInput) stockInput.value = '1';
}

function fillProductForm(product) {
    const idInput = document.getElementById('storeProductId');
    const nameInput = document.getElementById('productName');
    const categoryInput = document.getElementById('productCategory');
    const descriptionInput = document.getElementById('productDescription');
    const priceInput = document.getElementById('productPrice');
    const promoPriceInput = document.getElementById('productPromoPrice');
    const stockInput = document.getElementById('productStock');
    const imageInput = document.getElementById('productImage');
    const onSaleInput = document.getElementById('productOnSale');
    const activeInput = document.getElementById('productActive');

    if (idInput) idInput.value = product.id;
    if (nameInput) nameInput.value = product.name || '';
    if (categoryInput) categoryInput.value = product.category || '';
    if (descriptionInput) descriptionInput.value = product.description || '';
    if (priceInput) priceInput.value = parseMoney(product.price).toString();
    if (promoPriceInput) promoPriceInput.value = parseMoney(product.promoPrice).toString();
    if (stockInput) stockInput.value = Math.max(0, parseInt(product.stock || 0, 10)).toString();
    if (imageInput) imageInput.value = product.image || '';
    if (onSaleInput) onSaleInput.checked = Boolean(product.onSale);
    if (activeInput) activeInput.checked = Boolean(product.active);
}

function renderAdminList() {
    if (!storeAdminList) return;

    storeAdminList.innerHTML = '';

    if (storeProducts.length === 0) {
        storeAdminList.innerHTML = '<p class="store-empty">Nenhum item cadastrado.</p>';
        return;
    }

    storeProducts.forEach(product => {
        const row = document.createElement('div');
        row.className = 'store-admin-item';

        row.innerHTML = `
            <div>
                <strong>${product.name}</strong>
                <p>${product.category || 'Geral'} • Estoque: ${Math.max(0, parseInt(product.stock || 0, 10))}</p>
            </div>
            <div class="store-admin-item-actions">
                <button type="button" data-action="toggle" data-id="${product.id}" class="store-mini-btn">${product.active ? 'Desativar' : 'Ativar'}</button>
                <button type="button" data-action="edit" data-id="${product.id}" class="store-mini-btn">Editar</button>
                <button type="button" data-action="delete" data-id="${product.id}" class="store-mini-btn store-mini-btn-danger">Excluir</button>
            </div>
        `;

        storeAdminList.appendChild(row);
    });
}

function refreshStoreUI() {
    buildStoreCategoryOptions();
    renderStore();
    renderAdminList();
}

if (storeSearch) {
    storeSearch.addEventListener('input', renderStore);
}

if (storeCategoryFilter) {
    storeCategoryFilter.addEventListener('change', renderStore);
}

if (openStoreAdmin && storeAdminPanel) {
    openStoreAdmin.addEventListener('click', () => {
        storeAdminPanel.hidden = !storeAdminPanel.hidden;
    });
}

if (storeLoginForm) {
    storeLoginForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const password = (storeAdminPassword?.value || '').trim();
        if (password !== STORE_ADMIN_PASSWORD) {
            alert('Senha inválida.');
            return;
        }

        setAdminLoggedIn(true);
        if (storeAdminPassword) storeAdminPassword.value = '';
        renderAdminList();
    });
}

if (storeAdminLogout) {
    storeAdminLogout.addEventListener('click', () => {
        setAdminLoggedIn(false);
        resetProductForm();
    });
}

if (storeProductForm) {
    storeProductForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const id = document.getElementById('storeProductId')?.value || '';
        const name = document.getElementById('productName')?.value.trim() || '';
        const category = document.getElementById('productCategory')?.value.trim() || '';
        const description = document.getElementById('productDescription')?.value.trim() || '';
        const price = parseMoney(document.getElementById('productPrice')?.value || 0);
        const promoPrice = parseMoney(document.getElementById('productPromoPrice')?.value || 0);
        const stock = Math.max(0, parseInt(document.getElementById('productStock')?.value || '0', 10));
        const image = document.getElementById('productImage')?.value.trim() || '';
        const onSale = Boolean(document.getElementById('productOnSale')?.checked);
        const active = Boolean(document.getElementById('productActive')?.checked);

        if (!name) {
            alert('Informe o nome do produto.');
            return;
        }

        if (price <= 0) {
            alert('Informe um preço válido.');
            return;
        }

        const productPayload = {
            id: id || crypto.randomUUID(),
            name,
            category,
            description,
            price,
            promoPrice,
            onSale,
            stock,
            image,
            active
        };

        const existingIndex = storeProducts.findIndex(product => product.id === productPayload.id);
        if (existingIndex >= 0) {
            storeProducts[existingIndex] = productPayload;
        } else {
            storeProducts.unshift(productPayload);
        }

        saveStoreProducts(storeProducts);
        refreshStoreUI();
        resetProductForm();
    });
}

if (clearProductFormBtn) {
    clearProductFormBtn.addEventListener('click', resetProductForm);
}

if (storeAdminList) {
    storeAdminList.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;
        const product = storeProducts.find(item => item.id === id);
        if (!product) return;

        if (action === 'edit') {
            fillProductForm(product);
            return;
        }

        if (action === 'toggle') {
            product.active = !product.active;
            saveStoreProducts(storeProducts);
            refreshStoreUI();
            return;
        }

        if (action === 'delete') {
            const confirmed = window.confirm(`Remover "${product.name}" da loja?`);
            if (!confirmed) return;

            storeProducts = storeProducts.filter(item => item.id !== id);
            saveStoreProducts(storeProducts);
            refreshStoreUI();
            resetProductForm();
        }
    });
}

setAdminLoggedIn(localStorage.getItem(STORE_ADMIN_SESSION_KEY) === '1');
refreshStoreUI();

// Log simples para debug (pode ser removido em produção)
console.log('TPoll Assistência Técnica - Website carregado com sucesso! 🚀');
