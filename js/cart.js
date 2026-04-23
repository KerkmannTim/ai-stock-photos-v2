// ===== CART SYSTEM =====
// Persisted in localStorage under key: 'stockphotos_cart'

(function() {
  'use strict';

  const STORAGE_KEY = 'stockphotos_cart';

  // ===== STATE =====
  let cart = [];

  // ===== DOM ELEMENTS =====
  let cartDrawer, cartOverlay, cartItemsContainer, cartTotalEl, cartBadge, cartEmptyState;

  // ===== INIT =====
  function init() {
    loadCart();
    cacheElements();
    bindEvents();
    renderCart();
    updateBadge();
  }

  function cacheElements() {
    cartDrawer = document.getElementById('cart-drawer');
    cartOverlay = document.getElementById('cart-overlay');
    cartItemsContainer = document.getElementById('cart-items');
    cartTotalEl = document.getElementById('cart-total');
    cartBadge = document.getElementById('cart-badge');
    cartEmptyState = document.getElementById('cart-empty');
  }

  // ===== STORAGE =====
  function loadCart() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      cart = data ? JSON.parse(data) : [];
    } catch (e) {
      cart = [];
    }
  }

  function saveCart() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }

  // ===== ACTIONS =====
  function addItem(item) {
    const exists = cart.some(i => i.id === item.id);
    if (exists) {
      showToast('Bereits im Warenkorb');
      return;
    }
    cart.push(item);
    saveCart();
    renderCart();
    updateBadge();
    showToast('Zum Warenkorb hinzugef\u00fcgt');
  }

  function removeItem(id) {
    cart = cart.filter(i => i.id !== id);
    saveCart();
    renderCart();
    updateBadge();
  }

  function clearCart() {
    cart = [];
    saveCart();
    renderCart();
    updateBadge();
  }

  function getTotal() {
    return cart.reduce((sum, item) => sum + item.price, 0);
  }

  // ===== UI =====
  function renderCart() {
    if (!cartItemsContainer) return;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = '';
      if (cartEmptyState) cartEmptyState.style.display = 'flex';
      if (cartTotalEl) cartTotalEl.textContent = '€0,00';
      return;
    }

    if (cartEmptyState) cartEmptyState.style.display = 'none';

    cartItemsContainer.innerHTML = cart.map(item =>
      '<div class="cart-item" data-id="' + escapeHtml(item.id) + '">' +
        '<img src="' + escapeHtml(item.img) + '" alt="' + escapeHtml(item.name) + '" class="cart-item-img" loading="lazy">' +
        '<div class="cart-item-info">' +
          '<div class="cart-item-name">' + escapeHtml(item.name) + '</div>' +
          '<div class="cart-item-price">€' + formatPrice(item.price) + '</div>' +
        '</div>' +
        '<button class="cart-item-remove" aria-label="Entfernen" title="Entfernen">' +
          '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
          '</svg>' +
        '</button>' +
      '</div>'
    ).join('');

    cartItemsContainer.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.currentTarget.closest('.cart-item');
        removeItem(item.dataset.id);
      });
    });

    if (cartTotalEl) {
      cartTotalEl.textContent = '€' + formatPrice(getTotal());
    }
  }

  function updateBadge() {
    if (!cartBadge) return;
    const count = cart.length;
    cartBadge.textContent = count;
    cartBadge.style.display = count > 0 ? 'flex' : 'none';
  }

  function formatPrice(cents) {
    return (cents / 100).toFixed(2).replace('.', ',');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function openCart() {
    if (cartDrawer) cartDrawer.classList.add('open');
    if (cartOverlay) cartOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    if (cartDrawer) cartDrawer.classList.remove('open');
    if (cartOverlay) cartOverlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  function showToast(message) {
    let toast = document.getElementById('cart-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cart-toast';
      toast.style.cssText = [
        'position:fixed',
        'bottom:24px',
        'left:50%',
        'transform:translateX(-50%) translateY(100px)',
        'background:var(--accent)',
        'color:white',
        'padding:12px 24px',
        'border-radius:var(--radius-md)',
        'font-weight:600',
        'z-index:9999',
        'transition:transform 0.3s ease, opacity 0.3s ease',
        'opacity:0',
        'pointer-events:none',
        'white-space:nowrap'
      ].join(';');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
      toast.style.opacity = '1';
    });
    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(100px)';
      toast.style.opacity = '0';
    }, 2000);
  }

  // ===== EVENTS =====
  function bindEvents() {
    const cartToggle = document.getElementById('cart-toggle');
    if (cartToggle) {
      cartToggle.addEventListener('click', openCart);
    }

    const cartClose = document.getElementById('cart-close');
    if (cartClose) cartClose.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

    // Add to cart buttons (event delegation for dynamic items)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.add-to-cart-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const item = {
        id: btn.dataset.name || Date.now().toString(),
        name: btn.dataset.name || 'Bild',
        price: parseInt(btn.dataset.price) || 0,
        img: btn.dataset.img || '',
        score: btn.dataset.score || ''
      };
      addItem(item);
    });

    const checkoutBtn = document.getElementById('cart-checkout');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', handleCheckout);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeCart();
    });
  }

  // ===== CHECKOUT =====
  function handleCheckout() {
    if (cart.length === 0) return;

    const total = getTotal();
    const itemNames = cart.map(i => i.name).join(', ');

    closeCart();
    showPaymentModal('processing', itemNames, total);

    setTimeout(() => {
      showPaymentModal('success', itemNames, total);
    }, 2500);
  }

  function showPaymentModal(status, itemName, totalCents) {
    let modal = document.getElementById('payment-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'payment-modal';
      modal.className = 'modal-overlay';
      modal.style.cssText = 'display:none;align-items:center;justify-content:center;';
      modal.innerHTML =
        '<div class="modal-content" style="max-width:420px;text-align:center;padding:2rem;">' +
          '<div id="payment-status-icon" style="font-size:4rem;margin-bottom:1rem;">⏳</div>' +
          '<h2 id="payment-status-title">Zahlung wird verarbeitet...</h2>' +
          '<p id="payment-status-text" style="color:var(--text-secondary);margin:1rem 0;">Bitte warte einen Moment...</p>' +
          '<div id="payment-success" style="display:none;margin-top:1.5rem;">' +
            '<p style="color:var(--success);margin-bottom:1rem;">✅ Zahlung erfolgreich!</p>' +
            '<button class="btn btn-secondary" onclick="document.getElementById(\'payment-modal\').style.display=\'none\'">Zur\u00fcck zur Seite</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
          setTimeout(() => { modal.style.display = 'none'; }, 300);
        }
      });
    }

    const icon = modal.querySelector('#payment-status-icon');
    const title = modal.querySelector('#payment-status-title');
    const text = modal.querySelector('#payment-status-text');
    const successDiv = modal.querySelector('#payment-success');

    modal.style.display = 'flex';
    modal.classList.add('active');

    if (status === 'processing') {
      icon.textContent = '⏳';
      title.textContent = 'Zahlung wird verarbeitet...';
      text.textContent = 'Summe: €' + formatPrice(totalCents) + ' — Bitte warte einen Moment...';
      if (successDiv) successDiv.style.display = 'none';
    } else if (status === 'success') {
      icon.textContent = '🎉';
      title.textContent = 'Zahlung erfolgreich!';
      text.textContent = 'Danke f\u00fcr deinen Einkauf! Summe: €' + formatPrice(totalCents);
      if (successDiv) successDiv.style.display = 'block';
      clearCart();
    }
  }

  // ===== EXPOSE API =====
  window.Cart = {
    add: addItem,
    remove: removeItem,
    clear: clearCart,
    getItems: () => [...cart],
    getTotal: getTotal,
    open: openCart,
    close: closeCart,
    count: () => cart.length
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
