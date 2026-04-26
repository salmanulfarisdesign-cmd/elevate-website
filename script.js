/* ============================================================
   ELEVATE DIGITAL AGENCY — script.js
   Rebuilt April 2026 | Salmanul Faris
   
   n8n Integration — Railway deployment
   Webhook URL: https://n8n-production-6e624.up.railway.app
   
   FIELD NAMES sent to n8n (match Google Sheets columns):
   name, businessName, business, phone, email, service, message, source_page, timestamp
   ============================================================ */

const N8N_BASE         = 'https://n8n-production-6e624.up.railway.app';
const N8N_FORM_WEBHOOK = N8N_BASE + '/webhook/contact-form';
const N8N_WA_WEBHOOK   = N8N_BASE + '/webhook/whatsapp-click';

document.addEventListener('DOMContentLoaded', () => {

  // ── Fill hidden fields on page load ──────────────────────
  const spInput = document.getElementById('sp');
  const tsInput = document.getElementById('ts');
  if (spInput) spInput.value = window.location.href;
  if (tsInput) tsInput.value = new Date().toISOString();

  // ── Footer year ───────────────────────────────────────────
  document.querySelectorAll('.footer-year').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  // ── Nav scroll ────────────────────────────────────────────
  const nav = document.querySelector('.nav');
  if (nav) {
    const setScrolled = () => nav.classList.toggle('scrolled', window.scrollY > 60);
    setScrolled();
    window.addEventListener('scroll', setScrolled, { passive: true });
  }

  // ── Hamburger menu — with overlay click-outside close ─────
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  function openMobileMenu() {
    hamburger.classList.add('open');
    mobileMenu.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      if (mobileMenu.classList.contains('open')) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    // Close on keyboard (accessibility)
    hamburger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        hamburger.click();
      }
    });

    // Close when any nav link is clicked
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeMobileMenu);
    });

    // ✅ FIX: Close when clicking outside the menu (on the overlay)
    document.addEventListener('click', (e) => {
      if (
        mobileMenu.classList.contains('open') &&
        !mobileMenu.contains(e.target) &&
        !hamburger.contains(e.target)
      ) {
        closeMobileMenu();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
        closeMobileMenu();
      }
    });
  }

  // ── Active nav link ───────────────────────────────────────
  // Derive the current filename robustly, defaulting to 'index.html'
  const rawPath    = window.location.pathname;
  const pathParts  = rawPath.split('/');
  const lastPart   = pathParts[pathParts.length - 1];
  const currentPage = (lastPart === '' || lastPart === '/') ? 'index.html' : lastPart;

  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    // Strip any query/hash from href for comparison
    const hrefBase = href.split('?')[0].split('#')[0];
    const isHome   = (currentPage === 'index.html' && (hrefBase === 'index.html' || hrefBase === '' || hrefBase === '/'));
    const isMatch  = hrefBase === currentPage;
    if (isHome || isMatch) {
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
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => observer.observe(el));
  }

  // ── FAQ accordion ─────────────────────────────────────────
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-question');
    if (q) {
      q.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    }
  });

  // ── Testimonial filter ────────────────────────────────────
  const filterBtns       = document.querySelectorAll('#testimonialFilters .filter-btn');
  const testimonialCards = document.querySelectorAll('.testimonial-card[data-category]');
  if (filterBtns.length) {
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

  // ── Portfolio filter ──────────────────────────────────────
  const portfolioBtns  = document.querySelectorAll('#portfolioFilters .filter-btn-light');
  const portfolioCards = document.querySelectorAll('.case-study[data-category]');
  if (portfolioBtns.length) {
    portfolioBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        portfolioBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.filter;
        portfolioCards.forEach(card => {
          card.style.display = (cat === 'all' || card.dataset.category === cat) ? '' : 'none';
        });
      });
    });
  }

  // ════════════════════════════════════════════════════════════
  // CONTACT FORM → n8n WEBHOOK
  //
  // Fields sent (match Google Sheets columns exactly):
  //   name, businessName, business, phone, email, service,
  //   message, source_page, timestamp
  //
  // n8n accesses as: {{$json.body.name}} etc.
  // ════════════════════════════════════════════════════════════
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    const submitBtn   = document.getElementById('submitBtn');
    const submitText  = document.getElementById('submitText');
    const successDiv  = document.getElementById('formSuccess');
    const errorDiv    = document.getElementById('formError');
    const requiredEls = contactForm.querySelectorAll('[required]');

    // Live validation — remove error on input
    requiredEls.forEach(input => {
      input.addEventListener('input', () => {
        if (input.value.trim()) {
          input.classList.remove('error');
          const msg = input.parentElement.querySelector('.form-error-msg');
          if (msg) msg.style.display = 'none';
        }
      });
      // Also handle select elements on change
      input.addEventListener('change', () => {
        if (input.value) {
          input.classList.remove('error');
          const msg = input.parentElement.querySelector('.form-error-msg');
          if (msg) msg.style.display = 'none';
        }
      });
    });

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // ── Validation ──────────────────────────────────────
      let valid = true;
      requiredEls.forEach(input => {
        const empty    = !input.value.trim();
        const badEmail = input.type === 'email' && input.value.trim() && !/\S+@\S+\.\S+/.test(input.value.trim());
        if (empty || badEmail) {
          valid = false;
          input.classList.add('error');
          const msg = input.parentElement.querySelector('.form-error-msg');
          if (msg) msg.style.display = 'block';
        }
      });
      if (!valid) {
        // Scroll to first error
        const firstError = contactForm.querySelector('.error');
        if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // ── Loading state ────────────────────────────────────
      submitBtn.disabled     = true;
      submitText.textContent = 'Sending…';
      if (errorDiv)   errorDiv.style.display   = 'none';
      if (successDiv) successDiv.style.display = 'none';

      // ── Helper to get field value ─────────────────────────
      const v = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

      // ── Build payload (all 7 data fields + metadata) ──────
      const payload = {
        name:        v('name'),
        businessName: v('businessName'),
        business:    v('business'),       // dropdown value — business type
        phone:       v('phone'),
        email:       v('email'),
        service:     v('service'),        // service dropdown
        message:     v('message'),
        source_page: window.location.href,
        timestamp:   new Date().toISOString(),
      };

      // ── POST to n8n webhook ───────────────────────────────
      try {
        const res = await fetch(N8N_FORM_WEBHOOK, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });

        if (res.ok) {
          // Success — hide form, show confirmation
          contactForm.style.display = 'none';
          if (successDiv) {
            successDiv.style.display = 'block';
            successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else {
          throw new Error('HTTP ' + res.status);
        }
      } catch (err) {
        console.warn('n8n webhook error:', err.message);
        submitBtn.disabled     = false;
        submitText.textContent = 'Send Message & Book Consultation';
        if (errorDiv) errorDiv.style.display = 'block';
      }
    });
  }

  // ════════════════════════════════════════════════════════════
  // WHATSAPP CLICK TRACKING → n8n WEBHOOK
  // keepalive:true ensures fetch completes after navigation
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
      }).catch(() => {});  // Silent fail — never block the user
    });
  });

});
