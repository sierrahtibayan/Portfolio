(function () {
  "use strict";

  /* =========================================================
     0. CONFIG — plug your own Google Apps Script Web App URL
        here to log "Send Message" submissions into a Google
        Sheet. See README.md for setup steps. Leave blank to
        fall back to opening the visitor's email client instead.
  ========================================================= */
  var SHEETS_ENDPOINT = ""; // e.g. "https://script.google.com/macros/s/XXXX/exec"
  var FALLBACK_EMAIL = "hello@sierrahtibayan.com";

  /* =========================================================
     1. Catalog — one entry per nav category. `photos` holds
        every image for that category: the first 4 are used
        for the 2x2 preview grid (cropped 3:4); the full list
        is shown on the detail page in a mixed-ratio masonry.
        ratio: "3/4" | "4/3" | "1/1" | "4/5" | "2/3"
  ========================================================= */
  var CATALOG = {
    featured: {
      label: "Featured",
      photos: [
        { seed: "feat-1", title: "Study in grey", meta: "Portrait · Studio", ratio: "3/4" },
        { seed: "feat-2", title: "Quiet hour", meta: "Street · 35mm", ratio: "4/3" },
        { seed: "feat-3", title: "Table light", meta: "Product · Studio", ratio: "1/1" },
        { seed: "feat-4", title: "Between sets", meta: "Event · Reception", ratio: "3/4" },
        { seed: "feat-5", title: "Morning window", meta: "Portrait · Natural light", ratio: "4/5" },
        { seed: "feat-6", title: "Corner store", meta: "Street · Documentary", ratio: "2/3" },
        { seed: "feat-7", title: "Getting ready", meta: "Pre-event · Suite", ratio: "3/4" },
        { seed: "feat-8", title: "Toast", meta: "Event · Reception", ratio: "4/3" }
      ]
    },
    portraits: {
      label: "Portraits",
      photos: [
        { seed: "port-1", title: "The architect", meta: "Studio · 6x7", ratio: "3/4" },
        { seed: "port-2", title: "Morning window", meta: "Natural light · 4x5", ratio: "4/5" },
        { seed: "port-3", title: "Half turn", meta: "Studio · 35mm", ratio: "3/4" },
        { seed: "port-4", title: "Wool coat", meta: "Location · 6x6", ratio: "1/1" },
        { seed: "port-5", title: "Close read", meta: "Studio · 4x5", ratio: "4/5" },
        { seed: "port-6", title: "Second take", meta: "Natural light · 35mm", ratio: "3/4" },
        { seed: "port-7", title: "Side profile", meta: "Studio · 6x7", ratio: "2/3" },
        { seed: "port-8", title: "Low light", meta: "Location · 35mm", ratio: "4/3" },
        { seed: "port-9", title: "Held gaze", meta: "Studio · 4x5", ratio: "3/4" }
      ]
    },
    food: {
      label: "Food / Product",
      photos: [
        { seed: "food-1", title: "Still life no. 1", meta: "Studio · 4x5", ratio: "1/1" },
        { seed: "food-2", title: "Cast iron", meta: "Studio · 6x7", ratio: "3/4" },
        { seed: "food-3", title: "Bread and salt", meta: "Natural light · 4x5", ratio: "4/3" },
        { seed: "food-4", title: "Glassware", meta: "Studio · 6x6", ratio: "1/1" },
        { seed: "food-5", title: "Morning pour", meta: "Natural light · 35mm", ratio: "4/5" },
        { seed: "food-6", title: "Market crate", meta: "On location · 6x7", ratio: "2/3" },
        { seed: "food-7", title: "Tabletop", meta: "Studio · 4x5", ratio: "3/4" },
        { seed: "food-8", title: "Packaging study", meta: "Studio · 6x6", ratio: "1/1" }
      ]
    },
    preevents: {
      label: "Pre-Events",
      photos: [
        { seed: "pre-1", title: "Getting ready", meta: "Bridal suite · 4x5", ratio: "3/4" },
        { seed: "pre-2", title: "Last fitting", meta: "Studio · 35mm", ratio: "4/5" },
        { seed: "pre-3", title: "Sound check", meta: "Venue · 6x6", ratio: "1/1" },
        { seed: "pre-4", title: "Table setting", meta: "Venue · 4x5", ratio: "4/3" },
        { seed: "pre-5", title: "Steamed and pressed", meta: "Suite · 35mm", ratio: "2/3" },
        { seed: "pre-6", title: "First look prep", meta: "Suite · 6x7", ratio: "3/4" },
        { seed: "pre-7", title: "Rehearsal", meta: "Venue · 35mm", ratio: "4/3" },
        { seed: "pre-8", title: "Final details", meta: "Venue · 4x5", ratio: "1/1" }
      ]
    },
    events: {
      label: "Events",
      photos: [
        { seed: "ev-1", title: "First dance", meta: "Wedding · 35mm", ratio: "3/4" },
        { seed: "ev-2", title: "Toast", meta: "Reception · 6x6", ratio: "1/1" },
        { seed: "ev-3", title: "Backstage", meta: "Concert · 35mm", ratio: "4/5" },
        { seed: "ev-4", title: "Panel light", meta: "Conference · 6x7", ratio: "4/3" },
        { seed: "ev-5", title: "Dance floor", meta: "Reception · 35mm", ratio: "2/3" },
        { seed: "ev-6", title: "Speeches", meta: "Reception · 6x6", ratio: "1/1" },
        { seed: "ev-7", title: "Golden exit", meta: "Wedding · 35mm", ratio: "3/4" },
        { seed: "ev-8", title: "Crowd light", meta: "Concert · 6x7", ratio: "4/3" },
        { seed: "ev-9", title: "Last call", meta: "Reception · 35mm", ratio: "3/4" }
      ]
    }
  };

  var RATIO_DIMS = {
    "3/4": [900, 1200],
    "4/3": [1200, 900],
    "1/1": [1000, 1000],
    "4/5": [800, 1000],
    "2/3": [800, 1200]
  };

  function imgUrl(seed, ratio) {
    var d = RATIO_DIMS[ratio] || RATIO_DIMS["3/4"];
    return "https://picsum.photos/seed/sierrah-" + seed + "/" + d[0] + "/" + d[1];
  }

  /* =========================================================
     2. Build gallery preview + detail pages from CATALOG
  ========================================================= */
  var root = document.getElementById("galleryRoot");
  var frag = document.createDocumentFragment();

  function buildFrame(photo, opts) {
    opts = opts || {};
    var frame = document.createElement("figure");
    frame.className = "frame";
    frame.tabIndex = 0;
    frame.setAttribute("role", "button");
    frame.setAttribute("aria-label", photo.title);
    if (opts.forDetail) frame.dataset.lightbox = "1";
    if (opts.forPreview) frame.dataset.categoryLink = opts.categoryKey;

    var img = document.createElement("img");
    img.src = imgUrl(photo.seed, photo.ratio);
    img.alt = photo.title;
    img.loading = "lazy";
    frame.appendChild(img);

    var overlay = document.createElement("figcaption");
    overlay.className = "frame-overlay";
    overlay.innerHTML =
      '<span class="frame-title">' + photo.title + '</span>' +
      '<span class="frame-meta">' + photo.meta + '</span>';
    frame.appendChild(overlay);

    frame.dataset.title = photo.title;
    frame.dataset.meta = photo.meta;
    frame.dataset.img = img.src;

    return frame;
  }

  Object.keys(CATALOG).forEach(function (key) {
    var cat = CATALOG[key];

    /* ---- preview page (2x2 grid, 3:4 crop) ---- */
    var previewSection = document.createElement("section");
    previewSection.className = "page";
    previewSection.id = "page-" + key;

    var previewHeader = document.createElement("div");
    previewHeader.className = "page-header";
    previewHeader.innerHTML = '<h1 class="page-title">' + cat.label + '</h1>';
    previewSection.appendChild(previewHeader);

    var previewGrid = document.createElement("div");
    previewGrid.className = "gallery-grid";
    cat.photos.slice(0, 4).forEach(function (photo) {
      previewGrid.appendChild(buildFrame(photo, { forPreview: true, categoryKey: key }));
    });
    previewSection.appendChild(previewGrid);
    frag.appendChild(previewSection);

    /* ---- detail page (masonry, mixed ratios, back button) ---- */
    var detailSection = document.createElement("section");
    detailSection.className = "page";
    detailSection.id = "page-" + key + "-detail";

    var backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "back-btn";
    backBtn.dataset.backTo = key;
    backBtn.innerHTML = '<i class="bi bi-arrow-left"></i> Back';
    detailSection.appendChild(backBtn);

    var detailHeader = document.createElement("div");
    detailHeader.className = "page-header";
    detailHeader.innerHTML = '<h1 class="page-title">' + cat.label + '</h1>';
    detailSection.appendChild(detailHeader);

    var masonry = document.createElement("div");
    masonry.className = "masonry";
    cat.photos.forEach(function (photo) {
      masonry.appendChild(buildFrame(photo, { forDetail: true }));
    });
    detailSection.appendChild(masonry);
    frag.appendChild(detailSection);
  });

  root.appendChild(frag);

  /* set the first category (featured) active by default */
  document.getElementById("page-featured").classList.add("active");

  /* =========================================================
     3. SPA routing
  ========================================================= */
  var navLinks = document.querySelectorAll("#pageNav .nav-link");
  var allPages = document.querySelectorAll(".page");
  var offcanvasEl = document.getElementById("sidebar");
  var topCategoryKeys = Object.keys(CATALOG);

  function showPage(pageId, navKey) {
    allPages.forEach(function (p) { p.classList.toggle("active", p.id === pageId); });
    navLinks.forEach(function (l) { l.classList.toggle("active", l.dataset.page === navKey); });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function closeMobileNav() {
    if (window.innerWidth < 992 && offcanvasEl) {
      var oc = bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl);
      oc.hide();
    }
  }

  navLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      var key = link.dataset.page;
      showPage("page-" + key, key);
      closeMobileNav();
    });
  });

  /* brand name / mobile brand -> home (featured) */
  document.querySelectorAll("[data-page='featured']").forEach(function (el) {
    if (el.classList.contains("nav-link")) return; // already handled above
    el.addEventListener("click", function (e) {
      e.preventDefault();
      showPage("page-featured", "featured");
      closeMobileNav();
    });
  });

  /* =========================================================
     4. Frame interactions: hover-hold on touch, click routing
        - preview frame click  -> open that category's detail page
        - detail frame click   -> open fullscreen lightbox
  ========================================================= */
  var isTouch = window.matchMedia("(hover: none)").matches;

  document.addEventListener("click", function (e) {
    var frame = e.target.closest(".frame");
    if (!frame) {
      var backBtn = e.target.closest(".back-btn");
      if (backBtn) {
        var key = backBtn.dataset.backTo;
        showPage("page-" + key, key);
      }
      return;
    }

    if (isTouch && !frame.classList.contains("touched")) {
      document.querySelectorAll(".frame.touched").forEach(function (f) {
        if (f !== frame) f.classList.remove("touched");
      });
      frame.classList.add("touched");
      e.preventDefault();
      return;
    }

    if (frame.dataset.categoryLink) {
      var catKey = frame.dataset.categoryLink;
      showPage("page-" + catKey + "-detail", catKey);
    } else if (frame.dataset.lightbox) {
      openLightbox(frame);
    }
  });

  document.querySelectorAll(".frame").forEach(function (frame) {
    frame.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      if (frame.dataset.categoryLink) {
        showPage("page-" + frame.dataset.categoryLink + "-detail", frame.dataset.categoryLink);
      } else if (frame.dataset.lightbox) {
        openLightbox(frame);
      }
    });
  });

  /* =========================================================
     5. Fullscreen lightbox (detail-page images only)
  ========================================================= */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightboxImg");
  var lightboxTitle = document.getElementById("lightboxTitle");
  var lightboxMeta = document.getElementById("lightboxMeta");
  var lightboxClose = document.getElementById("lightboxClose");
  var lastFocused = null;

  function openLightbox(frame) {
    lightboxImg.src = frame.dataset.img;
    lightboxImg.alt = frame.dataset.title;
    lightboxTitle.textContent = frame.dataset.title;
    lightboxMeta.textContent = frame.dataset.meta;
    lastFocused = document.activeElement;
    lightbox.classList.add("open");
    lightboxClose.focus();
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.remove("open");
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }

  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && lightbox.classList.contains("open")) closeLightbox();
  });

  /* =========================================================
     6. Contact form — posts to a Google Apps Script Web App
        (logs rows into a Google Sheet) when SHEETS_ENDPOINT is
        set; otherwise falls back to opening the visitor's email
        client with the message pre-filled. See README.md.
  ========================================================= */
  var form = document.getElementById("contactForm");
  var statusEl = document.getElementById("formStatus");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("cf-name").value.trim();
      var email = document.getElementById("cf-email").value.trim();
      var message = document.getElementById("cf-message").value.trim();
      if (!name || !email || !message) return;

      var submitBtn = form.querySelector(".submit-btn");
      submitBtn.disabled = true;
      statusEl.textContent = "Sending…";

      if (SHEETS_ENDPOINT) {
        fetch(SHEETS_ENDPOINT, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name, email: email, message: message, date: new Date().toISOString() })
        })
          .then(function () {
            statusEl.textContent = "Thanks — your message has been sent.";
            form.reset();
          })
          .catch(function () {
            statusEl.textContent = "Something went wrong. Please email us directly instead.";
          })
          .finally(function () { submitBtn.disabled = false; });
      } else {
        var subject = encodeURIComponent("New message from " + name);
        var body = encodeURIComponent(message + "\n\n— " + name + " (" + email + ")");
        window.location.href = "mailto:" + FALLBACK_EMAIL + "?subject=" + subject + "&body=" + body;
        statusEl.textContent = "Opening your email app to send this message…";
        submitBtn.disabled = false;
      }
    });
  }
})();
