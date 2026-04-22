/**
 * AI Stock Photos - Main Application
 * Gallery, filters, modals, animations, lazy loading, toast notifications
 */

(function () {
  'use strict';

  // Sample image data (24 images with real categories)
  const sampleImages = [
    { id: 1, title: 'Misty Mountain Lake at Dawn', category: 'Natur', score: 98, price: 12, src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', height: 1.2, date: '2025-03-15' },
    { id: 2, title: 'Modern Glass Skyscraper', category: 'Architektur', score: 94, price: 15, src: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80', height: 1.5, date: '2025-03-14' },
    { id: 3, title: 'Creative Workspace Setup', category: 'Business', score: 91, price: 9, src: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&q=80', height: 1.0, date: '2025-03-13' },
    { id: 4, title: 'Abstract Neural Network', category: 'Technologie', score: 96, price: 18, src: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80', height: 1.3, date: '2025-03-12' },
    { id: 5, title: 'Colorful Street Art', category: 'Kreativ', score: 89, price: 11, src: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800&q=80', height: 1.4, date: '2025-03-11' },
    { id: 6, title: 'Portrait in Natural Light', category: 'Menschen', score: 97, price: 14, src: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80', height: 1.5, date: '2025-03-10' },
    { id: 7, title: 'Fresh Mediterranean Salad', category: 'Essen', score: 92, price: 10, src: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80', height: 1.1, date: '2025-03-09' },
    { id: 8, title: 'Santorini Sunset View', category: 'Reisen', score: 99, price: 20, src: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80', height: 1.6, date: '2025-03-08' },
    { id: 9, title: 'Forest Trail in Autumn', category: 'Natur', score: 93, price: 13, src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80', height: 1.2, date: '2025-03-07' },
    { id: 10, title: 'Minimalist Interior Design', category: 'Architektur', score: 90, price: 16, src: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=80', height: 1.0, date: '2025-03-06' },
    { id: 11, title: 'Team Meeting in Office', category: 'Business', score: 85, price: 8, src: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80', height: 1.1, date: '2025-03-05' },
    { id: 12, title: 'Quantum Computing Chip', category: 'Technologie', score: 95, price: 22, src: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80', height: 1.0, date: '2025-03-04' },
    { id: 13, title: 'Watercolor Painting Process', category: 'Kreativ', score: 88, price: 12, src: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80', height: 1.3, date: '2025-03-03' },
    { id: 14, title: 'Dancer in Motion', category: 'Menschen', score: 96, price: 17, src: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&q=80', height: 1.5, date: '2025-03-02' },
    { id: 15, title: 'Artisan Coffee Brewing', category: 'Essen', score: 91, price: 9, src: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80', height: 1.2, date: '2025-03-01' },
    { id: 16, title: 'Northern Lights in Iceland', category: 'Reisen', score: 98, price: 25, src: 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=800&q=80', height: 1.4, date: '2025-02-28' },
    { id: 17, title: 'Cherry Blossom Season', category: 'Natur', score: 95, price: 14, src: 'https://images.unsplash.com/photo-1490750967868-88aa444d88ee?w=800&q=80', height: 1.3, date: '2025-02-27' },
    { id: 18, title: 'Futuristic City at Night', category: 'Architektur', score: 92, price: 19, src: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80', height: 1.1, date: '2025-02-26' },
    { id: 19, title: 'Startup Pitch Presentation', category: 'Business', score: 87, price: 11, src: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80', height: 1.0, date: '2025-02-25' },
    { id: 20, title: 'AI Generated Landscape', category: 'Kreativ', score: 94, price: 15, src: 'https://images.unsplash.com/photo-1686191128892-3b37add4a934?w=800&q=80', height: 1.5, date: '2025-02-24' },
    { id: 21, title: 'Cinematic Street Portrait', category: 'Menschen', score: 93, price: 16, src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80', height: 1.4, date: '2025-02-23' },
    { id: 22, title: 'Gourmet Dessert Plating', category: 'Essen', score: 90, price: 13, src: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80', height: 1.2, date: '2025-02-22' },
    { id: 23, title: 'Venice Canal at Dusk', category: 'Reisen', score: 97, price: 21, src: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80', height: 1.5, date: '2025-02-21' },
    { id: 24, title: 'Robotic Arm in Factory', category: 'Technologie', score: 89, price: 14, src: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80', height: 1.1, date: '2025-02-20' }
  ];

  const categories = [
    { name: 'Natur', count: 12450, src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80' },
    { name: 'Architektur', count: 8320, src: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80' },
    { name: 'Business', count: 6780, src: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600&q=80' },
    { name: 'Technologie', count: 9450, src: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&q=80' },
    { name: 'Kreativ', count: 11200, src: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=600&q=80' },
    { name: 'Menschen', count: 15600, src: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80' },
    { name: 'Essen', count: 5900, src: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80' },
    { name: 'Reisen', count: 13800, src: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&q=80' }
  ];

  // State
  let favorites = JSON.parse(localStorage.getItem('aisp_favorites') || '[]');
  let cart = JSON.parse(localStorage.getItem('aisp_cart') || '[]');
  let downloads = JSON.parse(localStorage.getItem('aisp_downloads') || '[]');
  let displayedCount = 12;

  // Toast system
  function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    toast.innerHTML = '<span class="toast-icon">' + icons[type] + '</span><span>' + message + '</span>';
    container.appendChild(toast);

    setTimeout(() => { toast.classList.add('hiding'); }, duration);
    setTimeout(() => { toast.remove(); }, duration + 350);
  }
  window.showToast = showToast;

  // Header scroll effect
  function initHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  // Mobile menu
  function initMobileMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    if (!toggle || !mobileNav) return;
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      mobileNav.classList.toggle('open');
    });
  }

  // Intersection Observer for fade-in
  function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
  }

  // Stats counter animation
  function initStatsCounter() {
    const stats = document.querySelectorAll('.stat-number');
    if (!stats.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.target, 10);
          const suffix = el.dataset.suffix || '';
          animateCounter(el, target, suffix);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    stats.forEach(s => observer.observe(s));
  }

  function animateCounter(el, target, suffix) {
    const duration = 2000;
    const start = performance.now();
    function update(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(ease * target);
      el.textContent = current.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  // Lazy load images
  function initLazyLoading() {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.dataset.src;
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
            }
            observer.unobserve(img);
          }
        });
      }, { rootMargin: '200px' });
      document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
    } else {
      document.querySelectorAll('img[data-src]').forEach(img => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });
    }
  }

  // Render image card
  function createImageCard(img) {
    const isFav = favorites.includes(img.id);
    return '
      <article class="image-card" data-id="' + img.id + '" tabindex="0">
        <div class="img-wrap">
          <img data-src="' + img.src + '" alt="' + img.title + '" loading="lazy">
          <div class="img-overlay">
            <div class="img-actions">
              <button class="fav-btn ' + (isFav ? 'liked' : '') + '" data-id="' + img.id + '" title="Zur Merkliste">♥</button>
              <button class="cart-btn" data-id="' + img.id + '" title="In den Warenkorb">🛒</button>
            </div>
          </div>
        </div>
        <div class="img-info">
          <h4 class="img-title">' + img.title + '</h4>
          <div class="img-meta">
            <span class="img-score">★ ' + img.score + '</span>
            <span class="img-price">€' + img.price + '</span>
          </div>
        </div>
      </article>';
  }

  // Render category cards
  function renderCategories() {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;
    grid.innerHTML = categories.map(cat => '
      <a href="gallery.html?category=' + encodeURIComponent(cat.name) + '" class="category-card">
        <img data-src="' + cat.src + '" alt="' + cat.name + '" loading="lazy">
        <div class="cat-overlay">
          <span class="cat-name">' + cat.name + '</span>
          <span class="cat-count">' + cat.count.toLocaleString() + ' Fotos</span>
        </div>
      </a>').join('');
    initLazyLoading();
  }

  // Render featured images (for homepage)
  function renderFeaturedImages() {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;
    grid.innerHTML = sampleImages.slice(0, 12).map(createImageCard).join('');
    bindImageCardEvents(grid);
    initLazyLoading();
  }

  // Gallery: render with filters
  function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    const catFilter = document.getElementById('filter-category')?.value || 'all';
    const priceFilter = document.getElementById('filter-price')?.value || 'all';
    const sortFilter = document.getElementById('filter-sort')?.value || 'newest';
    const searchQuery = (document.getElementById('gallery-search')?.value || '').toLowerCase();

    let filtered = sampleImages.filter(img => {
      if (catFilter !== 'all' && img.category !== catFilter) return false;
      if (priceFilter !== 'all') {
        if (priceFilter === 'free' && img.price > 0) return false;
        if (priceFilter === 'under10' && img.price >= 10) return false;
        if (priceFilter === '10to20' && (img.price < 10 || img.price > 20)) return false;
        if (priceFilter === 'over20' && img.price <= 20) return false;
      }
      if (searchQuery && !img.title.toLowerCase().includes(searchQuery) && !img.category.toLowerCase().includes(searchQuery)) return false;
      return true;
    });

    if (sortFilter === 'newest') filtered.sort((a, b) => b.date.localeCompare(a.date));
    else if (sortFilter === 'popular') filtered.sort((a, b) => b.score - a.score);
    else if (sortFilter === 'price-asc') filtered.sort((a, b) => a.price - b.price);
    else if (sortFilter === 'price-desc') filtered.sort((a, b) => b.price - a.price);

    const visible = filtered.slice(0, displayedCount);
    grid.innerHTML = visible.map(createImageCard).join('');
    bindImageCardEvents(grid);
    initLazyLoading();

    const loadMoreBtn = document.getElementById('load-more');
    if (loadMoreBtn) {
      loadMoreBtn.style.display = displayedCount >= filtered.length ? 'none' : 'inline-flex';
    }
  }

  function bindImageCardEvents(container) {
    container.querySelectorAll('.image-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.img-actions')) return;
        const id = parseInt(card.dataset.id, 10);
        openImageModal(id);
      });
    });

    container.querySelectorAll('.fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id, 10);
        toggleFavorite(id, btn);
      });
    });

    container.querySelectorAll('.cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id, 10);
        addToCart(id);
      });
    });
  }

  function toggleFavorite(id, btn) {
    const idx = favorites.indexOf(id);
    if (idx > -1) { favorites.splice(idx, 1); btn.classList.remove('liked'); showToast('Aus Merkliste entfernt', 'info'); }
    else { favorites.push(id); btn.classList.add('liked'); showToast('Zur Merkliste hinzugefügt', 'success'); }
    localStorage.setItem('aisp_favorites', JSON.stringify(favorites));
  }

  function addToCart(id) {
    if (!cart.includes(id)) { cart.push(id); localStorage.setItem('aisp_cart', JSON.stringify(cart)); showToast('Zum Warenkorb hinzugefügt', 'success'); }
    else { showToast('Bereits im Warenkorb', 'info'); }
  }

  // Image Modal
  function openImageModal(id) {
    const img = sampleImages.find(i => i.id === id);
    if (!img) return;
    let modal = document.getElementById('image-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'image-modal';
      modal.className = 'image-modal';
      document.body.appendChild(modal);
    }

    const isFav = favorites.includes(id);
    modal.innerHTML = '
      <button class="modal-close" aria-label="Schließen">✕</button>
      <div class="modal-content">
        <div class="modal-image-wrap">
          <img src="' + img.src.replace('w=800', 'w=1200') + '" alt="' + img.title + '" style="max-height:70vh;">
        </div>
        <div class="modal-details">
          <h3>' + img.title + '</h3>
          <p class="modal-meta">' + img.category + ' • AI-Generated • Hochauflösend</p>
          <div class="modal-actions">
            <button class="btn btn-primary" id="modal-download">📥 Download (€' + img.price + ')</button>
            <button class="btn btn-ghost" id="modal-fav">' + (isFav ? '♥ Entfernen' : '♡ Merken') + '</button>
          </div>
          <hr style="border:0;border-top:1px solid var(--border);margin:24px 0;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:0.85rem;color:var(--text-secondary);">
            <div><strong style="color:var(--text-primary)">Auflösung</strong><br>4096 × 3072 px</div>
            <div><strong style="color:var(--text-primary)">Format</strong><br>JPG, PNG, WebP</div>
            <div><strong style="color:var(--text-primary)">Lizenz</strong><br>Royalty-Free</div>
            <div><strong style="color:var(--text-primary)">AI-Score</strong><br>' + img.score + '/100</div>
          </div>
        </div>
      </div>';

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', onEsc);

    modal.querySelector('#modal-fav').addEventListener('click', () => {
      toggleFavorite(id, { classList: { add() {}, remove() {}, contains() { return favorites.includes(id); } } });
      openImageModal(id);
    });

    modal.querySelector('#modal-download').addEventListener('click', () => {
      if (!downloads.includes(id)) { downloads.push(id); localStorage.setItem('aisp_downloads', JSON.stringify(downloads)); }
      showToast('Download gestartet!', 'success');
    });
  }

  function closeModal() {
    const modal = document.getElementById('image-modal');
    if (modal) { modal.classList.remove('open'); document.body.style.overflow = ''; }
    document.removeEventListener('keydown', onEsc);
  }
  function onEsc(e) { if (e.key === 'Escape') closeModal(); }
  window.closeImageModal = closeModal;

  // FAQ Accordion
  function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(q => {
      q.addEventListener('click', () => {
        const item = q.closest('.faq-item');
        const wasOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
        if (!wasOpen) item.classList.add('open');
      });
    });
  }

  // Auth tabs
  function initAuthTabs() {
    const tabs = document.querySelectorAll('.auth-tabs button');
    const panels = document.querySelectorAll('.form-panel');
    if (!tabs.length) return;
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        panels[i]?.classList.add('active');
      });
    });
  }

  // Auth forms
  function initAuthForms() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const resetForm = document.getElementById('reset-form');
    const googleBtn = document.getElementById('google-signin');

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = loginForm.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = 'Anmelden...';
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const result = await window.Auth.signIn(email, password);
        btn.disabled = false; btn.textContent = 'Anmelden';
        if (result.success) { showToast('Erfolgreich angemeldet!', 'success'); setTimeout(() => window.location.href = 'profile.html', 800); }
        else { showToast(result.error || 'Anmeldung fehlgeschlagen', 'error'); }
      });
    }

    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = signupForm.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = 'Registriere...';
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const result = await window.Auth.signUp(email, password, name);
        btn.disabled = false; btn.textContent = 'Konto erstellen';
        if (result.success) { showToast('Konto erstellt! Willkommen.', 'success'); setTimeout(() => window.location.href = 'profile.html', 800); }
        else { showToast(result.error || 'Registrierung fehlgeschlagen', 'error'); }
      });
    }

    if (resetForm) {
      resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = resetForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        const email = document.getElementById('reset-email').value;
        const result = await window.Auth.resetPassword(email);
        btn.disabled = false;
        if (result.success) { showToast('E-Mail zum Zurücksetzen gesendet', 'success'); }
        else { showToast(result.error || 'Fehler aufgetreten', 'error'); }
      });
    }

    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        const result = await window.Auth.signInWithGoogle();
        if (!result.success) showToast(result.error || 'Google-Anmeldung fehlgeschlagen', 'error');
      });
    }
  }

  // Profile tabs
  function initProfileTabs() {
    const navItems = document.querySelectorAll('.profile-nav li');
    const sections = document.querySelectorAll('.profile-section');
    if (!navItems.length) return;
    navItems.forEach((item, i) => {
      item.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        item.classList.add('active');
        sections[i]?.classList.add('active');
      });
    });
  }

  // Render profile content
  function initProfileContent() {
    const favGrid = document.getElementById('favorites-grid');
    if (favGrid) {
      const favImages = sampleImages.filter(img => favorites.includes(img.id));
      if (favImages.length) favGrid.innerHTML = favImages.map(createImageCard).join('');
      else favGrid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px 0;">Noch keine Favoriten. Stöbern Sie in der Galerie!</p>';
      bindImageCardEvents(favGrid);
    }

    const dlGrid = document.getElementById('downloads-grid');
    if (dlGrid) {
      const dlImages = sampleImages.filter(img => downloads.includes(img.id));
      if (dlImages.length) dlGrid.innerHTML = dlImages.map(createImageCard).join('');
      else dlGrid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px 0;">Noch keine Downloads.</p>';
      bindImageCardEvents(dlGrid);
    }
  }

  // Gallery filters
  function initGalleryFilters() {
    ['filter-category', 'filter-price', 'filter-sort'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => { displayedCount = 12; renderGallery(); });
    });
    document.getElementById('gallery-search')?.addEventListener('input', debounce(() => { displayedCount = 12; renderGallery(); }, 300));
    document.getElementById('load-more')?.addEventListener('click', () => { displayedCount += 12; renderGallery(); });
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
  }

  // Newsletter form
  function initNewsletter() {
    document.querySelectorAll('.newsletter-form').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = form.querySelector('input');
        if (input?.value) { showToast('Danke für Ihre Anmeldung!', 'success'); input.value = ''; }
      });
    });
  }

  // Main init
  document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initMobileMenu();
    initScrollAnimations();
    initStatsCounter();
    initLazyLoading();
    initFAQ();
    initAuthTabs();
    initAuthForms();
    initProfileTabs();
    initProfileContent();
    initGalleryFilters();
    initNewsletter();
    renderCategories();
    renderFeaturedImages();
    renderGallery();

    // Check URL params for category filter
    const params = new URLSearchParams(window.location.search);
    const catParam = params.get('category');
    if (catParam && document.getElementById('filter-category')) {
      document.getElementById('filter-category').value = catParam;
      renderGallery();
    }
  });

})();
