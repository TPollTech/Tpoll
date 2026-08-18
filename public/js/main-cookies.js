// ── Cookie Banner ────────────────────────────────────────────────────────────

(function () {
    'use strict';

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
}());
