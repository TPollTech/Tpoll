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
        updateCalculatorResult();
    });
});

calcServiceOptions.forEach(option => {
    option.addEventListener('click', () => {
        calcServiceOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedService = option;
        updateCalculatorResult();
    });
});

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

// Log simples para debug (pode ser removido em produção)
console.log('TPoll Assistência Técnica - Website carregado com sucesso! 🚀');
