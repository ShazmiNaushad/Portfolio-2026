(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- scroll reveals ---------- */

  var items = document.querySelectorAll('[data-reveal]');

  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    Array.prototype.forEach.call(
      group.querySelectorAll('[data-reveal]'),
      function (el, i) {
        if (!el.style.getPropertyValue('--d')) {
          el.style.setProperty("--d", (Math.min(i, 3) * 80) + "ms");
        }
      }
    );
  });

  if (!('IntersectionObserver' in window) || reduce) {
    Array.prototype.forEach.call(items, function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });

    Array.prototype.forEach.call(items, function (el) { io.observe(el); });
  }

  /* ---------- tilt on category tiles ---------- */

  if (!reduce) {
    document.querySelectorAll('[data-tilt]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        el.style.transform =
          'translateY(-4px) rotateX(' + ((0.5 - py) * 5).toFixed(2) + 'deg) rotateY(' +
          ((px - 0.5) * 6).toFixed(2) + 'deg)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- horizontal rail: drag to scroll ---------- */

  document.querySelectorAll('[data-rail]').forEach(function (rail) {
    var down = false, startX = 0, startScroll = 0, moved = 0;

    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      down = true;
      moved = 0;
      startX = e.clientX;
      startScroll = rail.scrollLeft;
      rail.classList.add('is-dragging');
    });

    rail.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      moved = Math.abs(dx);
      rail.scrollLeft = startScroll - dx;
    });

    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (type) {
      rail.addEventListener(type, function () {
        down = false;
        rail.classList.remove('is-dragging');
      });
    });

    rail.addEventListener('click', function (e) {
      if (moved > 6) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  });

  /* ---------- glow parallax ---------- */

  var glow = document.querySelector('.glow');
  if (glow && !reduce) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        glow.style.transform = 'translate3d(0,' + (window.scrollY * 0.12).toFixed(1) + 'px,0)';
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- page transition fallback ---------- */

  if (!('startViewTransition' in document)) {
    document.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var link = e.target.closest ? e.target.closest('a[href]') : null;
      if (!link || link.target === '_blank') return;

      var href = link.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(mailto|tel):/.test(href)) return;
      if (link.origin !== window.location.origin) return;

      e.preventDefault();
      document.body.classList.add('is-leaving');
      window.setTimeout(function () { window.location.href = link.href; }, 220);
    });

    window.addEventListener('pageshow', function () {
      document.body.classList.remove('is-leaving');
    });
  }

  /* ---------- footer year ---------- */

  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
