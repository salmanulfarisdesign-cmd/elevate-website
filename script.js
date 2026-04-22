/* ============================================================
   ELEVATE DIGITAL AGENCY — script.js
   n8n Integration — Railway deployment
   ============================================================

   FIXES APPLIED:
   1. Form now sends JSON body — n8n reads $json.body.fieldname
      The Google Sheets node maps: {{$json.body.name}} etc.
   2. All 7 fields sent: name, business, phone, email, message,
      source_page, timestamp — matching Google Sheets columns
   3. WhatsApp click tracking fires correctly with keepalive
   ============================================================ */

const N8N_BASE         = 'https://n8n-production-6e624.up.railway.app';
const N8N_FORM_WEBHOOK = N8N_BASE + '/webhook/contact-form';
const N8N_WA_WEBHOOK   = N8N_BASE + '/webhook/whatsapp-click';

document.addEventListener('DOMContentLoaded', () => {

  // ── Fill hidden fields immediately on page load ───────────
  const spInput = document.getElementById('sp');
  const tsInput = document.getElementById('ts');
  if (spInput) spInput.value = window.location.href;
  if (tsInput) tsInput.value = new Date().toISOString();

  // ── Nav scroll ────────────────────────────────────────────
  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });
  }

  // ── Hamburger menu ────────────────────────────────────────
  const hamburger  = document.querySelector('.hamburger');
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

  // ── Active nav link ───────────────────────────────────────
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

  // ── Counter animation ─────────────────────────────────────
  const counters = document.querySelectorAll('.counter');
  if (counters.length) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !e.target.dataset.done) {
          e.target.dataset.done = '1';
          const target    = parseFloat(e.target.dataset.target);
          const suffix    = e.target.dataset.suffix || '';
          const duration  = 1500;
          const start     = performance.now();
          const isDecimal = String(target).includes('.');
          const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const ease     = 1 - Math.pow(1 - progress, 3);
            const value    = target * ease;
            e.target.textContent = isDecimal ? value.toFixed(1) + suffix : Math.floor(value) + suffix;
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
  const filterBtns       = document.querySelectorAll('.filter-btn');
  const testimonialCards = document.querySelectorAll('.testimonial-card[data-category]');
  if (filterBtns.length && testimonialCards.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.filter;
        testimonialCards.forEach(card => {
          card.style.display = (cat === 'all' || card.dataset.category === cat) ? '' : 'none';
        });
      });
    });
  }

  // ── Typewriter effect ─────────────────────────────────────
  const typeEl = document.querySelector('.typewriter');
  if (typeEl) {
    const text  = typeEl.dataset.text || typeEl.textContent;
    typeEl.textContent    = '';
    typeEl.style.borderRight  = '2px solid rgba(255,255,255,0.6)';
    typeEl.style.paddingRight = '2px';
    let i = 0;
    setTimeout(() => {
      const interval = setInterval(() => {
        typeEl.textContent += text[i++];
        if (i >= text.length) {
          clearInterval(interval);
          setTimeout(() => { typeEl.style.borderRight = 'none'; }, 800);
        }
      }, 38);
    }, parseInt(typeEl.dataset.delay || '800'));
  }

  // ════════════════════════════════════════════════════════════
  // CONTACT FORM → n8n WEBHOOK
  //
  // HOW IT WORKS:
  // 1. User fills form and clicks Send
  // 2. JS collects all 7 fields into a JSON object
  // 3. fetch() POSTs JSON to n8n webhook URL
  // 4. n8n receives data — fields accessible as:
  //    {{$json.body.name}}, {{$json.body.email}} etc.
  //    OR {{$json.name}}, {{$json.email}} (depends on n8n version)
  // 5. n8n routes to Google Sheets + Gmail + Telegram
  //
  // FIELD NAMES (must match Google Sheets columns exactly):
  //   name, business, phone, email, message, source_page, timestamp
  // ════════════════════════════════════════════════════════════
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    const requiredInputs = contactForm.querySelectorAll('[required]');
    const submitBtn      = document.getElementById('submitBtn');
    const submitText     = document.getElementById('submitText');
    const successDiv     = document.getElementById('formSuccess');
    const errorDiv       = document.getElementById('formError');

    // Live validation feedback
    requiredInputs.forEach(input => {
      input.addEventListener('input', () => {
        if (input.value.trim()) {
          input.classList.remove('error');
          const msg = input.parentElement.querySelector('.form-error-msg');
          if (msg) msg.style.display = 'none';
        }
      });
    });

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validate
      let valid = true;
      requiredInputs.forEach(input => {
        const empty    = !input.value.trim();
        const badEmail = input.type === 'email' && input.value.trim() && !/\S+@\S+\.\S+/.test(input.value.trim());
        if (empty || badEmail) {
          valid = false;
          input.classList.add('error');
          const msg = input.parentElement.querySelector('.form-error-msg');
          if (msg) msg.style.display = 'block';
        } else {
          input.classList.remove('error');
          const msg = input.parentElement.querySelector('.form-error-msg');
          if (msg) msg.style.display = 'none';
        }
      });
      if (!valid) return;

      // Loading state
      submitBtn.disabled     = true;
      submitText.textContent = 'Sending\u2026';
      if (errorDiv) errorDiv.style.display = 'none';

      // Build payload — field names match Google Sheets columns
      const v = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
      const payload = {
        // Core fields — names match CRM internal field names
        name:        v('name'),
        biz:         v('business'),      // CRM uses 'biz', form uses 'business'
        business:    v('business'),      // keep both for n8n compatibility
        phone:       v('phone'),
        email:       v('email'),
        message:     v('message'),
        // CRM metadata fields
        source:      'Website Form',
        stage:       'new',
        priority:    3,
        value:       0,
        notes:       '',
        biztype:     '',
        service:     '',
        servicesActive: '',
        testimonial: 'no',
        consultDate: '',
        lastContact: new Date().toISOString().slice(0,10),
        dateAdded:   new Date().toISOString(),
        // Extra context
        source_page: window.location.href,
        timestamp:   new Date().toISOString(),
      };

      // POST to n8n
      try {
        const res = await fetch(N8N_FORM_WEBHOOK, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });
        if (res.ok) {
          contactForm.style.display = 'none';
          if (successDiv) successDiv.style.display = 'block';
        } else {
          throw new Error('HTTP ' + res.status);
        }
      } catch (err) {
        console.warn('n8n error:', err.message);
        submitBtn.disabled     = false;
        submitText.textContent = 'Send Message';
        if (errorDiv) errorDiv.style.display = 'block';
      }
    });
  }

  // ════════════════════════════════════════════════════════════
  // WHATSAPP CLICK TRACKING → n8n WEBHOOK
  // All elements with class="whatsapp-tracked" fire this.
  // keepalive:true lets the fetch complete after navigation.
  // ════════════════════════════════════════════════════════════
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
