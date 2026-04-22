/**
 * StockPhotoShop v2 — App JavaScript
 * Professional dark-theme stock photo marketplace
 */

(function () {
  'use strict';

  // ============================================
  // DOM Ready Handler
  // ============================================
  document.addEventListener('DOMContentLoaded', function () {
    initNavbar();
    initMobileMenu();
    initSmoothScroll();
    initGalleryFilters();
    initImageModal();
    initProfileTabs();
    initScrollAnimations();
    initSearch();
  });

  // ============================================
  // Navbar Scroll Effect
  // ============================================
  function initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    let ticking = false;

    function updateNavbar() {
      if (window.scrollY > 20) {
        navbar.classList.add('navbar-scrolled');
      } else {
        navbar.classList.remove('navbar-scrolled');
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(updateNavbar);
        ticking = true;
      }
    });

    // Initial check
    updateNavbar();
  }

  // ============================================
  // Mobile Navigation (Hamburger)
  // ============================================
  function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (!hamburger || !mobileMenu) return;

    hamburger.addEventListener('click', function () {
      const isOpen = mobileMenu.classList.contains('open');
      mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('active');
      hamburger.setAttribute('aria-expanded', String(!isOpen));
      mobileMenu.setAttribute('aria-hidden', String(isOpen));
      document.body.style.overflow = isOpen ? '' : 'hidden';
    });

    // Close menu when clicking a link
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    });
  }

  // ============================================
  // Smooth Scroll
  // ============================================
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;

        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          const offset = 80; // Navbar height
          const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({
            top: top,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  // ============================================
  // Gallery Filters
  // ============================================
  function initGalleryFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    if (!filterButtons.length || !galleryItems.length) return;

    filterButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const filter = this.getAttribute('data-filter');

        // Update active button
        filterButtons.forEach(function (b) {
          b.classList.remove('active');
        });
        this.classList.add('active');

        // Filter items with animation
        galleryItems.forEach(function (item) {
          const category = item.getAttribute('data-category');
          const shouldShow = filter === 'all' || category === filter;

          if (shouldShow) {
            item.style.display = 'block';
            // Small delay for stagger effect
            requestAnimationFrame(function () {
              item.style.opacity = '1';
              item.style.transform = 'scale(1)';
            });
          } else {
            item.style.opacity = '0';
            item.style.transform = 'scale(0.95)';
            setTimeout(function () {
              item.style.display = 'none';
            }, 250);
          }
        });
      });
    });
  }

  // ============================================
  // Image Modal
  // ============================================
  function initImageModal() {
    const modal = document.querySelector('.image-modal');
    if (!modal) return;

    const modalImg = modal.querySelector('.modal-image img');
    const modalTitle = modal.querySelector('.modal-title');
    const modalPrice = modal.querySelector('.modal-price');
    const modalScore = modal.querySelector('.modal-score');
    const modalCategory = modal.querySelector('.modal-category');
    const modalResolution = modal.querySelector('.modal-resolution');
    const modalFormat = modal.querySelector('.modal-format');

    // Open modal on gallery item click
    document.querySelectorAll('.gallery-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        // Don't open if clicking action buttons
        if (e.target.closest('.gallery-item-overlay button')) return;

        const img = item.querySelector('img');
        const title = item.querySelector('h4').textContent;
        const price = item.querySelector('.gallery-item-price').textContent;
        const score = item.querySelector('.gallery-item-score').textContent.trim();
        const category = item.getAttribute('data-category') || 'All';

        if (modalImg) modalImg.src = img.src;
        if (modalImg) modalImg.alt = img.alt;
        if (modalTitle) modalTitle.textContent = title;
        if (modalPrice) modalPrice.textContent = price;
        if (modalScore) modalScore.textContent = score;
        if (modalCategory) modalCategory.textContent = capitalizeFirst(category);
        if (modalResolution) modalResolution.textContent = '3840 × 2160';
        if (modalFormat) modalFormat.textContent = 'JPEG, RGB';

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });

    // Close modal
    function closeModal() {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }

    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
    });

    // Favorite button in modal
    const favBtn = modal.querySelector('.modal-favorite');
    if (favBtn) {
      favBtn.addEventListener('click', function () {
        this.classList.toggle('active');
        const icon = this.querySelector('.fav-icon');
        if (icon) {
          icon.textContent = this.classList.contains('active') ? '❤️' : '🤍';
        }
      });
    }
  }

  // ============================================
  // Profile Tabs
  // ============================================
  function initProfileTabs() {
    const tabs = document.querySelectorAll('.profile-tab');
    const sections = document.querySelectorAll('.profile-section');

    if (!tabs.length || !sections.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        const target = this.getAttribute('data-tab');

        tabs.forEach(function (t) {
          t.classList.remove('active');
        });
        this.classList.add('active');

        sections.forEach(function (section) {
          section.classList.remove('active');
          if (section.id === target) {
            section.classList.add('active');
          }
        });
      });
    });
  }

  // ============================================
  // Scroll Animations (Intersection Observer)
  // ============================================
  function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.fade-in, [data-animate]');
    if (!animatedElements.length) return;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.animationPlayState = 'running';
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    animatedElements.forEach(function (el) {
      el.style.animationPlayState = 'paused';
      observer.observe(el);
    });
  }

  // ============================================
  // Search
  // ============================================
  function initSearch() {
    const searchInputs = document.querySelectorAll('.search-bar input');

    searchInputs.forEach(function (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          const query = this.value.trim();
          if (query) {
            window.location.href = 'gallery.html?q=' + encodeURIComponent(query);
          }
        }
      });

      const searchBtn = input.closest('.search-bar')?.querySelector('button');
      if (searchBtn) {
        searchBtn.addEventListener('click', function () {
          const query = input.value.trim();
          if (query) {
            window.location.href = 'gallery.html?q=' + encodeURIComponent(query);
          }
        });
      }
    });
  }

  // ============================================
  // Utility Functions
  // ============================================
  function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Debounce helper
  window.debounce = function (func, wait) {
    let timeout;
    return function executedFunction() {
      const context = this;
      const args = arguments;
      const later = function () {
        timeout = null;
        func.apply(context, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

})();
