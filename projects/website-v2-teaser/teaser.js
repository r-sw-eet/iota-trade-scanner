// Teaser runtime — carousel + countdown.

(function () {
  "use strict";

  // ---------- Carousel state ----------
  const SLIDES_EL = document.getElementById("slides");
  const PROGRESS_EL = document.getElementById("progress");
  const PREV_BTN = document.getElementById("btn-prev");
  const NEXT_BTN = document.getElementById("btn-next");
  const CAROUSEL = document.getElementById("carousel");

  const slides = window.TEASER_SLIDES || [];
  const TOTAL = slides.length;
  const INTERVAL_MS = 10000;
  let current = 0;
  let tStart = performance.now();
  let rafId = null;
  let paused = false;

  // Render slides
  slides.forEach((s, i) => {
    const slide = document.createElement("div");
    slide.className = "slide" + (i === 0 ? " active" : "");
    slide.setAttribute("aria-hidden", i === 0 ? "false" : "true");
    slide.setAttribute("role", "group");
    slide.setAttribute("aria-roledescription", "slide");
    slide.setAttribute("aria-label", `${i + 1} of ${TOTAL}: ${s.title}`);
    slide.innerHTML = `
      <div class="s-hd">
        <div>
          <div class="s-eyebrow">${s.eyebrow}</div>
          <h2>${s.title}</h2>
          <p class="s-sub">${s.sub}</p>
        </div>
        ${s.badge ? `<span class="s-badge">${s.badge}</span>` : ""}
      </div>
      <div class="s-body">${s.svg || ""}</div>
    `;
    SLIDES_EL.appendChild(slide);

    const dot = document.createElement("div");
    dot.className = "p";
    dot.setAttribute("role", "button");
    dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
    dot.innerHTML = `<div class="fill"></div>`;
    dot.addEventListener("click", () => goTo(i));
    PROGRESS_EL.appendChild(dot);
  });

  function goTo(idx, opts) {
    opts = opts || {};
    const prev = current;
    current = ((idx % TOTAL) + TOTAL) % TOTAL;
    const slideEls = SLIDES_EL.querySelectorAll(".slide");
    slideEls.forEach((el, i) => {
      el.classList.toggle("active", i === current);
      el.setAttribute("aria-hidden", i === current ? "false" : "true");
    });
    // Update dot progress
    const dots = PROGRESS_EL.querySelectorAll(".p");
    dots.forEach((d, i) => {
      d.classList.toggle("done", i < current);
      if (i !== current) d.querySelector(".fill").style.width = (i < current ? "100%" : "0%");
    });
    // Reset timer unless told not to
    if (!opts.keepTimer) tStart = performance.now();
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  // Animation loop — drives the active progress bar AND auto-advance
  function tick(t) {
    const elapsed = t - tStart;
    const dots = PROGRESS_EL.querySelectorAll(".p");
    if (dots[current]) {
      const pct = Math.min(100, (elapsed / INTERVAL_MS) * 100);
      dots[current].querySelector(".fill").style.width = pct + "%";
    }
    if (!paused && elapsed >= INTERVAL_MS) {
      next();
    }
    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);

  PREV_BTN.addEventListener("click", prev);
  NEXT_BTN.addEventListener("click", next);

  // Keyboard arrows
  window.addEventListener("keydown", (e) => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === "ArrowLeft")  { e.preventDefault(); prev(); }
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
  });

  // ---------- Drag / swipe to scrub ----------
  let drag = null; // {startX, startT, moved}
  CAROUSEL.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button, a, input, .p")) return;
    drag = { startX: e.clientX, startT: performance.now(), moved: false, id: e.pointerId };
    CAROUSEL.setPointerCapture(e.pointerId);
  });
  CAROUSEL.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 5) drag.moved = true;
    // live visual nudge for feedback
    const active = SLIDES_EL.querySelector(".slide.active");
    if (active) active.style.transform = `scale(1) translateX(${dx * 0.15}px)`;
  });
  CAROUSEL.addEventListener("pointerup", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const active = SLIDES_EL.querySelector(".slide.active");
    if (active) active.style.transform = "";
    if (drag.moved) {
      if (dx < -40) next();
      else if (dx > 40) prev();
    } else {
      // click — advance
      next();
    }
    drag = null;
  });
  CAROUSEL.addEventListener("pointercancel", () => {
    const active = SLIDES_EL.querySelector(".slide.active");
    if (active) active.style.transform = "";
    drag = null;
  });

  // Pause on hover (desktop) for readability
  CAROUSEL.addEventListener("mouseenter", () => { paused = true; });
  CAROUSEL.addEventListener("mouseleave", () => { paused = false; tStart = performance.now(); });

  // Pause when tab hidden
  document.addEventListener("visibilitychange", () => {
    paused = document.hidden;
    if (!paused) tStart = performance.now();
  });

  // ---------- Countdown ----------
  // Launch: 2026-05-03 (Sunday), 20:00 CEST  ==  18:00 UTC (CEST = UTC+2)
  function launchTarget() {
    return new Date(Date.UTC(2026, 4, 3, 18, 0, 0)).getTime();
  }
  const TARGET = launchTarget();

  function pad(n) { return String(n).padStart(2, "0"); }
  function updateCountdown() {
    const now = Date.now();
    let diff = Math.max(0, TARGET - now);
    const days  = Math.floor(diff / 86400000); diff -= days * 86400000;
    const hours = Math.floor(diff / 3600000);  diff -= hours * 3600000;
    const mins  = Math.floor(diff / 60000);    diff -= mins * 60000;
    const secs  = Math.floor(diff / 1000);
    document.getElementById("cd-d").textContent = pad(days);
    document.getElementById("cd-h").textContent = pad(hours);
    document.getElementById("cd-m").textContent = pad(mins);
    document.getElementById("cd-s").textContent = pad(secs);
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);
})();
