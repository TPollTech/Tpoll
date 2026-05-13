/**
 * TPoll Site - Performance Optimizations
 * Lazy loading, image optimization, e outras melhorias
 */

(function() {
    'use strict';

    // ─── Lazy Loading para Imagens ────────────────────────────────────────

    function initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                        }
                        
                        if (img.dataset.srcset) {
                            img.srcset = img.dataset.srcset;
                            img.removeAttribute('data-srcset');
                        }
                        
                        img.classList.add('lazy-loaded');
                        observer.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px'
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        } else {
            // Fallback para navegadores antigos
            document.querySelectorAll('img[data-src]').forEach(img => {
                img.src = img.dataset.src;
            });
        }
    }

    // ─── Remove console.log em Produção ────────────────────────────────────

    function optimizeLogs() {
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            window.console = {
                log: () => {},
                error: () => {},
                warn: () => {},
                info: () => {}
            };
        }
    }

    // ─── Prefetch DNS para Recursos Externos ───────────────────────────────

    function addResourceHints() {
        const hints = [
            { rel: 'dns-prefetch', href: '//fonts.googleapis.com' },
            { rel: 'dns-prefetch', href: '//fonts.gstatic.com' },
            { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
            { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true }
        ];

        hints.forEach(hint => {
            const link = document.createElement('link');
            link.rel = hint.rel;
            link.href = hint.href;
            if (hint.crossorigin) link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
        });
    }

    // ─── Otimização de Interatividade ──────────────────────────────────────

    function optimizeInteractivity() {
        // Debounce para resize/scroll events
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                window.dispatchEvent(new Event('optimized-resize'));
            }, 250);
        }, { passive: true });

        // Throttle para scroll
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const now = Date.now();
            if (now - lastScroll > 100) {
                lastScroll = now;
                window.dispatchEvent(new Event('optimized-scroll'));
            }
        }, { passive: true });
    }

    // ─── Inicialização ────────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', () => {
        initLazyLoading();
        optimizeLogs();
        addResourceHints();
        optimizeInteractivity();
    });

    // Fallback se DOM já estiver carregado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLazyLoading);
    } else {
        initLazyLoading();
    }
})();
