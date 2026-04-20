/* ============================================================
   ELEVATE DIGITAL AGENCY — Shared JavaScript
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

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

  // ── Contact form validation ───────────────────────────────
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    const inputs = contactForm.querySelectorAll('[required]');

    inputs.forEach(input => {
      input.addEventListener('input', () => {
        if (input.value.trim()) {
          input.classList.remove('error');
          const errMsg = input.parentElement.querySelector('.form-error-msg');
          if (errMsg) errMsg.style.display = 'none';
        }
      });
    });

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;

      inputs.forEach(input => {
        if (!input.value.trim()) {
          valid = false;
          input.classList.add('error');
          const errMsg = input.parentElement.querySelector('.form-error-msg');
          if (errMsg) errMsg.style.display = 'block';
        } else {
          input.classList.remove('error');
        }
      });

      if (valid) {
    contactForm.submit(); // ✅ THIS FIXES EVERYTHING
  }
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

});
