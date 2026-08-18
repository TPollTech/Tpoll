// ── Navigation: smooth scroll, mobile toggle, scroll effects, active links ──

(function () {
    'use strict';

    // Smooth scroll para links âncora
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }

    const navbar = document.getElementById('navbar');
    let lastScroll = 0;
    const heroSection = document.querySelector('.hero');
    let ticking = false;
    let currentScrollY = 0;

    const supportsParallax = !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
        !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    function updateHeroParallax() {
        if (!heroSection || !supportsParallax) return;
        heroSection.style.setProperty('--hero-parallax-offset', `${currentScrollY * 0.5}px`);
    }

    function onScroll() {
        currentScrollY = window.pageYOffset || 0;

        if (navbar && currentScrollY > 50) {
            navbar.classList.add('scrolled');
        } else if (navbar) {
            navbar.classList.remove('scrolled');
        }

        if (!ticking && supportsParallax) {
            ticking = true;
            requestAnimationFrame(() => {
                updateHeroParallax();
                ticking = false;
            });
        }

        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');
        let currentSection = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (currentScrollY >= sectionTop) {
                currentSection = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });

        const backToTopBtn = document.getElementById('backToTop');
        if (backToTopBtn) {
            if (currentScrollY > 400) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        }

        lastScroll = currentScrollY;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    updateHeroParallax();

    const backToTopBtn = document.getElementById('backToTop');
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}());
