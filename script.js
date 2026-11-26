/* =========================================================
   HOTEL SAS · Funcionalidad (JavaScript)
   Contenido:
   1. Utilidades
   2. Navegación (scroll, menú móvil, enlace activo)
   3. Animaciones al desplazarse + contadores
   4. Carruseles
   5. Sistema de reservas (validación + disponibilidad)
   6. Formulario de contacto y boletín
   7. Modal, volver arriba y detalles
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- 1. Utilidades ---------- */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const formatoCOP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  // Si una imagen remota no carga, se oculta y queda el color de fondo del contenedor
  $$('img').forEach(img => img.addEventListener('error', () => { img.style.opacity = '0'; }));

  /* ---------- 2. Navegación ---------- */
  const navbar = $('#navbar');
  const navMenu = $('#navMenu');
  const navToggle = $('#navToggle');
  const toTop = $('#toTop');
  const navLinks = $$('.nav-link');

  const cerrarMenu = () => {
    navMenu.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  navToggle.addEventListener('click', () => {
    const abierto = navMenu.classList.toggle('open');
    navToggle.classList.toggle('open', abierto);
    navToggle.setAttribute('aria-expanded', abierto);
  });
  $$('a', navMenu).forEach(a => a.addEventListener('click', cerrarMenu));

  const secciones = navLinks.map(l => $(l.getAttribute('href'))).filter(Boolean);

  const alDesplazar = () => {
    const y = window.scrollY;
    navbar.classList.toggle('scrolled', y > 60);
    toTop.classList.toggle('show', y > 600);

    // Resalta el enlace de la sección visible
    let actual = secciones[0];
    secciones.forEach(sec => { if (sec.offsetTop - 140 <= y) actual = sec; });
    navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + actual.id));
  };
  window.addEventListener('scroll', alDesplazar, { passive: true });
  alDesplazar();

  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- 3. Animaciones al desplazarse ---------- */
  const observer = new IntersectionObserver((entradas) => {
    entradas.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
        $$('[data-count]', e.target).forEach(animarContador);
      }
    });
  }, { threshold: 0.15 });
  $$('.reveal').forEach(el => observer.observe(el));

  function animarContador(el) {
    const meta = +el.dataset.count;
    const decimal = el.dataset.decimal ? 10 : 1;
    const duracion = 1600;
    const inicio = performance.now();
    const paso = (ahora) => {
      const p = Math.min((ahora - inicio) / duracion, 1);
      const valor = (meta * (1 - Math.pow(1 - p, 3))) / decimal;   // ease-out
      el.textContent = decimal > 1 ? valor.toFixed(1) : Math.round(valor).toLocaleString('es-CO');
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  /* ---------- 4. Carruseles ---------- */
  function iniciarCarrusel(root) {
    const track = $('.carousel-track', root);
    const slides = $$('.slide', root);
    const dotsBox = $('.carousel-dots', root);
    const btnPrev = $('.prev', root);
    const btnNext = $('.next', root);
    const pvMax = +root.dataset.perView || 1;
    const autoplayMs = +root.dataset.autoplay || 0;
    let indice = 0, timer = null, tocando = false;

    // Cuántas diapositivas se ven según el ancho de pantalla (coincide con el CSS)
    const porVista = () => {
      const w = window.innerWidth;
      if (w <= 600) return 1;
      if (w <= 1024) return Math.min(2, pvMax);
      return pvMax;
    };
    const maxIndice = () => Math.max(0, slides.length - porVista());

    function crearPuntos() {
      dotsBox.innerHTML = '';
      for (let i = 0; i <= maxIndice(); i++) {
        const b = document.createElement('button');
        b.setAttribute('aria-label', `Ir a la imagen ${i + 1}`);
        b.addEventListener('click', () => { ir(i); reiniciarAuto(); });
        dotsBox.appendChild(b);
      }
    }

    function ir(i) {
      const max = maxIndice();
      indice = i > max ? 0 : i < 0 ? max : i;           // vuelta infinita
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const ancho = slides[0].getBoundingClientRect().width + gap;
      track.style.transform = `translateX(${-indice * ancho}px)`;
      $$('button', dotsBox).forEach((d, n) => d.classList.toggle('active', n === indice));
    }

    function auto() {
      if (!autoplayMs || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      clearInterval(timer);
      timer = setInterval(() => { if (!tocando) ir(indice + 1); }, autoplayMs);
    }
    const reiniciarAuto = () => { clearInterval(timer); auto(); };

    btnPrev.addEventListener('click', () => { ir(indice - 1); reiniciarAuto(); });
    btnNext.addEventListener('click', () => { ir(indice + 1); reiniciarAuto(); });

    // Pausa al pasar el cursor; gestos táctiles
    root.addEventListener('mouseenter', () => tocando = true);
    root.addEventListener('mouseleave', () => tocando = false);
    let x0 = null;
    root.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; tocando = true; }, { passive: true });
    root.addEventListener('touchend', e => {
      if (x0 !== null) {
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 40) { ir(indice + (dx < 0 ? 1 : -1)); }
      }
      x0 = null; tocando = false; reiniciarAuto();
    });
    // Teclado
    root.setAttribute('tabindex', '0');
    root.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { ir(indice - 1); reiniciarAuto(); }
      if (e.key === 'ArrowRight') { ir(indice + 1); reiniciarAuto(); }
    });

    window.addEventListener('resize', () => { crearPuntos(); ir(Math.min(indice, maxIndice())); });

    crearPuntos();
    ir(0);
    auto();
  }
  $$('.carousel').forEach(iniciarCarrusel);

  /* ---------- 5. Sistema de reservas ---------- */
  const PRECIOS = { individual: 120000, doble: 190000, suite: 340000 };
  const NOMBRES = { individual: 'Habitación Individual', doble: 'Habitación Doble', suite: 'Suite Sas' };
  const CAPACIDAD = { individual: 1, doble: 2, suite: 4 };

  const form = $('#bookingForm');
  const checkin = $('#checkin');
  const checkout = $('#checkout');
  const guests = $('#guests');
  const roomType = $('#roomType');

  const aISO = d => {
    const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return z.toISOString().split('T')[0];
  };
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  checkin.min = aISO(hoy);
  checkout.min = aISO(new Date(hoy.getTime() + 86400000));

  // La salida siempre debe ser posterior a la llegada
  checkin.addEventListener('change', () => {
    if (!checkin.value) return;
    const siguiente = new Date(checkin.value + 'T00:00:00');
    siguiente.setDate(siguiente.getDate() + 1);
    checkout.min = aISO(siguiente);
    if (checkout.value && checkout.value <= checkin.value) checkout.value = '';
  });

  // Botones "Reservar" de las tarjetas: preseleccionan la habitación y bajan al formulario
  $$('[data-reserve]').forEach(btn => btn.addEventListener('click', () => {
    roomType.value = btn.dataset.reserve;
    limpiarError(roomType);
    $('#reservas').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => checkin.focus({ preventScroll: true }), 700);
  }));

  function marcarError(input, msg) {
    input.closest('.field').classList.add('invalid');
    const el = $('#err-' + input.id);
    if (el) el.textContent = msg;
  }
  function limpiarError(input) {
    input.closest('.field')?.classList.remove('invalid');
    const el = $('#err-' + input.id);
    if (el) el.textContent = '';
  }
  $$('input, select, textarea').forEach(i => i.addEventListener('input', () => limpiarError(i)));

  function validarReserva() {
    let ok = true;
    [checkin, checkout, guests, roomType].forEach(limpiarError);

    if (!checkin.value) { marcarError(checkin, 'Elige tu fecha de llegada.'); ok = false; }
    else if (new Date(checkin.value + 'T00:00:00') < hoy) { marcarError(checkin, 'La fecha no puede ser pasada.'); ok = false; }

    if (!checkout.value) { marcarError(checkout, 'Elige tu fecha de salida.'); ok = false; }
    else if (checkin.value && checkout.value <= checkin.value) { marcarError(checkout, 'Debe ser posterior a la llegada.'); ok = false; }

    const n = parseInt(guests.value, 10);
    if (!Number.isInteger(Number(guests.value)) || !n || n < 1) { marcarError(guests, 'Indica al menos 1 huésped.'); ok = false; }
    else if (n > 4) { marcarError(guests, 'Máximo 4 huéspedes por reserva.'); ok = false; }

    if (!Object.hasOwn(PRECIOS, roomType.value)) { marcarError(roomType, 'Selecciona un tipo de habitación.'); ok = false; }
    else if (n && n > CAPACIDAD[roomType.value]) {
      marcarError(roomType, `Esta habitación admite ${CAPACIDAD[roomType.value]} huésped(es).`); ok = false;
    }
    return ok;
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validarReserva()) return;

    const noches = Math.round((new Date(checkout.value) - new Date(checkin.value)) / 86400000);
    const total = noches * PRECIOS[roomType.value];
    const fmt = v => new Date(v + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

    // Cotización local: no consulta ni modifica la base de datos.
    mostrarModal({
      titulo: 'Cotización estimada',
      icono: 'fa-circle-check',
      html: `Esta es una estimación; no confirma disponibilidad.
        <div class="summary">
          <div><span>Habitación</span><span>${NOMBRES[roomType.value]}</span></div>
          <div><span>Llegada</span><span>${fmt(checkin.value)}</span></div>
          <div><span>Salida</span><span>${fmt(checkout.value)}</span></div>
          <div><span>Huéspedes</span><span>${Number(guests.value)}</span></div>
          <div><span>Noches</span><span>${noches}</span></div>
          <div class="total"><span>Total estimado</span><span>${formatoCOP(total)}</span></div>
        </div>
        <p style="margin-top:.8rem;font-size:.85rem">No se ha enviado una solicitud ni creado una reserva. Consulta con recepción.</p>`
    });
    form.reset();
    guests.value = 2;
  });

  /* ---------- 6. Contacto y boletín ---------- */
  const emailValido = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  $('#contactForm').addEventListener('submit', e => {
    e.preventDefault();
    const nombre = $('#cName'), correo = $('#cEmail'), msg = $('#cMsg');
    let ok = true;
    [nombre, correo, msg].forEach(limpiarError);
    if (nombre.value.trim().length < 2) { marcarError(nombre, 'Escribe tu nombre.'); ok = false; }
    if (!emailValido(correo.value.trim())) { marcarError(correo, 'Ingresa un correo válido.'); ok = false; }
    if (msg.value.trim().length < 10) { marcarError(msg, 'Cuéntanos un poco más (mín. 10 caracteres).'); ok = false; }
    if (!ok) return;
    mostrarModal({ titulo: 'Formulario válido', icono: 'fa-paper-plane', html: 'Demostración: el mensaje no se ha enviado.' });
    e.target.reset();
  });

  $('#newsletterForm').addEventListener('submit', e => {
    e.preventDefault();
    const campo = $('#nEmail');
    if (!emailValido(campo.value.trim())) {
      mostrarModal({ titulo: 'Correo no válido', icono: 'fa-triangle-exclamation', aviso: true, html: 'Revisa tu correo e inténtalo de nuevo.' });
      return;
    }
    mostrarModal({ titulo: 'Correo válido', icono: 'fa-envelope-circle-check', html: 'Demostración: no se ha guardado una suscripción.' });
    e.target.reset();
  });

  /* ---------- 7. Modal y detalles ---------- */
  const modal = $('#modal');
  function mostrarModal({ titulo, html, icono = 'fa-circle-check', aviso = false }) {
    $('#modalTitle').textContent = titulo;
    $('#modalBody').innerHTML = html;
    const ic = $('#modalIcon');
    ic.className = 'modal-icon' + (aviso ? ' warn' : '');
    ic.innerHTML = `<i class="fa-solid ${icono}"></i>`;
    modal.hidden = false;
    $('#modalOk').focus();
  }
  const cerrarModal = () => { modal.hidden = true; };
  $('#modalClose').addEventListener('click', cerrarModal);
  $('#modalOk').addEventListener('click', cerrarModal);
  modal.addEventListener('click', e => { if (e.target === modal) cerrarModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) cerrarModal(); });

  $('#year').textContent = new Date().getFullYear();
});
