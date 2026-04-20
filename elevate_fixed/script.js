/* ============================================================
   ELEVATE DIGITAL AGENCY — Shared JavaScript
   n8n Integration Ready — Railway deployment
   ============================================================ */

/* ── CONFIG ─────────────────────────────────────────────────
   Your Railway n8n URL. Update this if your Railway URL changes.
   ──────────────────────────────────────────────────────────── */
const N8N_BASE          = 'https://n8n-production-6e624.up.railway.app';
const N8N_FORM_WEBHOOK  = N8N_BASE + '/webhook/contact-form';
const N8N_WA_WEBHOOK    = N8N_BASE + '/webhook/whatsapp-click';

document.addEventListener('DOMContentLoaded', () => {

  // ── Fill hidden form fields early ──────────────────────────
  // FIX: source_page and timestamp must be filled immediately
  // on page load, not inside the submit handler — otherwise
  // they can be empty if the user submits very quickly.
  const spInput = document.getElementById('sp');
  const tsInput = document.getElementById('ts');
  if (spInput) spInput.value = window.location.href;
  if (tsInput) tsInput.value = new Date().toISOString();

  // ── Nav scroll effect ──────────────────────────────────────
  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });
  }

  // ── Hamburger / mobile menu ──────────────────────────────
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ── Active nav link ──────────────────────────────────────
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  // ── Scroll reveal ─────────────────────────────────────────
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (revealEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => observer.observe(el));
  }

  // ── Counter animation ────────────────────────────────────
  const counters = document.querySelectorAll('.counter');
  if (counters.length) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !e.target.dataset.done) {
          e.target.dataset.done = '1';
          const target = parseFloat(e.target.dataset.target);
          const suffix = e.target.dataset.suffix || '';
          const duration = 1500;
          const start = performance.now();
          const isDecimal = String(target).includes('.');
          const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const value = target * ease;
            e.target.textContent = isDecimal
              ? value.toFixed(1) + suffix
              : Math.floor(value) + suffix;
            if (progress < 1) requestAnimationFrame(tick);
            else e.target.textContent = (isDecimal ? target.toFixed(1) : target) + suffix;
          };
          requestAnimationFrame(tick);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => counterObserver.observe(c));
  }

  // ── Testimonial filter ────────────────────────────────────
  const filterBtns = document.querySelectorAll('.filter-btn');
  const testimonialCards = document.querySelectorAll('.testimonial-card[data-category]');
  if (filterBtns.length && testimonialCards.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.filter;
        testimonialCards.forEach(card => {
          const show = cat === 'all' || card.dataset.category === cat;
          card.style.display = show ? '' : 'none';
        });
      });
    });
  }

  // ── Typewriter effect ─────────────────────────────────────
  const typeEl = document.querySelector('.typewriter');
  if (typeEl) {
    const text = typeEl.dataset.text || typeEl.textContent;
    typeEl.textContent = '';
    typeEl.style.borderRight = '2px solid rgba(255,255,255,0.6)';
    typeEl.style.paddingRight = '2px';
    let i = 0;
    const delay = parseInt(typeEl.dataset.delay || '800');
    setTimeout(() => {
      const interval = setInterval(() => {
        typeEl.textContent += text[i];
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          setTimeout(() => { typeEl.style.borderRight = 'none'; }, 800);
        }
      }, 38);
    }, delay);
  }

  // ════════════════════════════════════════════════════════
  // CONTACT FORM — n8n INTEGRATION
  //
  // BUG FIXED: The old code had two problems:
  //   1. The <form> tag had NO id="contactForm" so this JS
  //      handler was silently doing nothing.
  //   2. It called contactForm.submit() which does a native
  //      HTTP POST that navigates away — the n8n webhook
  //      returns JSON not HTML, causing a broken page, and
  //      the success state UI was never shown.
  //
  // FIX: Uses fetch() to POST JSON to n8n. Stays on the page.
  // Shows success/error state in the UI. Never navigates away.
  // ════════════════════════════════════════════════════════
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    const requiredInputs = contactForm.querySelectorAll('[required]');
    const submitBtn      = document.getElementById('submitBtn');
    const submitText     = document.getElementById('submitText');
    const successDiv     = document.getElementById('formSuccess');
    const errorDiv       = document.getElementById('formError');

    // Live validation — clear errors as user types
    requiredInputs.forEach(input => {
      input.addEventListener('input', () => {
        if (input.value.trim()) {
          input.classList.remove('error');
          const errMsg = input.parentElement.querySelector('.form-error-msg');
          if (errMsg) errMsg.style.display = 'none';
        }
      });
    });

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Step 1: validate all required fields
      let valid = true;
      requiredInputs.forEach(input => {
        const empty    = !input.value.trim();
        const badEmail = input.type === 'email' && input.value.trim() && !/\S+@\S+\.\S+/.test(input.value.trim());
        if (empty || badEmail) {
          valid = false;
          input.classList.add('error');
          const errMsg = input.parentElement.querySelector('.form-error-msg');
          if (errMsg) errMsg.style.display = 'block';
        } else {
          input.classList.remove('error');
          const errMsg = input.parentElement.querySelector('.form-error-msg');
          if (errMsg) errMsg.style.display = 'none';
        }
      });
      if (!valid) return;

      // Step 2: loading state
      submitBtn.disabled = true;
      submitText.textContent = 'Sending\u2026';
      if (errorDiv) errorDiv.style.display = 'none';

      // Step 3: build payload with all fields n8n needs
      const getVal = (name) => {
        const el = contactForm.querySelector('[name="' + name + '"]');
        return el ? el.value.trim() : '';
      };
      const payload = {
        name:        getVal('name'),
        business:    getVal('business'),
        phone:       getVal('phone'),
        email:       getVal('email'),
        message:     getVal('message'),
        source_page: window.location.href,
        timestamp:   new Date().toISOString(),
        form_source: 'website_contact_form',
      };

      // Step 4: send JSON to n8n webhook
      try {
        const response = await fetch(N8N_FORM_WEBHOOK, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });

        // n8n webhook returns 200 on success
        if (response.ok) {
          contactForm.style.display = 'none';
          if (successDiv) successDiv.style.display = 'block';
        } else {
          throw new Error('HTTP ' + response.status);
        }
      } catch (err) {
        // n8n unreachable or CORS error
        console.warn('n8n submission error:', err.message);
        submitBtn.disabled = false;
        submitText.textContent = 'Send Message';
        if (errorDiv) errorDiv.style.display = 'block';
      }
    });
  }

  // ════════════════════════════════════════════════════════
  // WHATSAPP CLICK TRACKING — n8n INTEGRATION
  //
  // BUG FIXED: This entire section was missing from the old
  // script.js. Every element with class="whatsapp-tracked"
  // (FAB button + inline WhatsApp CTAs on contact.html) now
  // fires a fetch to n8n when clicked.
  //
  // keepalive: true is critical — it allows the fetch to
  // complete even after the browser navigates to wa.me.
  // The catch() is intentionally empty so it NEVER blocks
  // the WhatsApp link from opening.
  // ════════════════════════════════════════════════════════
  document.querySelectorAll('.whatsapp-tracked').forEach(btn => {
    btn.addEventListener('click', () => {
      fetch(N8N_WA_WEBHOOK, {
        method:    'POST',
        headers:   { 'Content-Type': 'application/json' },
        body:      JSON.stringify({
          event:     'whatsapp_click',
          page:      window.location.href,
          page_name: document.title,
          timestamp: new Date().toISOString(),
        }),
        keepalive: true,
      }).catch(() => {});
    });
  });

});
