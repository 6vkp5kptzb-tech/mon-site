/* =========================================================
   Mon site — script commun à toutes les pages
   ========================================================= */

(function () {
  "use strict";

  // ---------- Menu mobile ----------
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");

  if (toggle && nav) {
    var setMenu = function (open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    };

    toggle.addEventListener("click", function () {
      setMenu(!nav.classList.contains("is-open"));
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setMenu(false);
        toggle.focus();
      }
    });

    // Fermer en cliquant ailleurs ou sur un lien du menu
    document.addEventListener("click", function (e) {
      if (!nav.classList.contains("is-open")) return;
      if (!toggle.contains(e.target) && (!nav.contains(e.target) || e.target.closest("a"))) {
        setMenu(false);
      }
    });
  }

  // ---------- Année du pied de page ----------
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // ---------- Accueil : 5 dernières publications du blog WordPress ----------
  var postsEl = document.getElementById("posts");
  if (postsEl) loadPosts(postsEl);

  // ---------- Page Musique ----------
  var tracksEl = document.getElementById("tracks");
  var videosEl = document.getElementById("videos");
  if (!tracksEl && !videosEl) return;

  fetch("data/musique.json")
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      if (videosEl) renderVideos(videosEl, data.videos || []);
      if (tracksEl) initTop50(tracksEl, data.morceaux || []);
    })
    .catch(function () {
      var msg =
        '<p class="notice">Impossible de charger la liste des morceaux. ' +
        "Si tu ouvres le fichier directement depuis ton disque, lance plutôt " +
        "un petit serveur local (voir le README).</p>";
      if (tracksEl) tracksEl.outerHTML = msg;
      if (videosEl) videosEl.innerHTML = "";
    });

  // ---------- Vidéos YouTube (chargées au clic) ----------
  function renderVideos(container, videos) {
    container.innerHTML = "";
    videos.forEach(function (v) {
      var article = el("article", "video");
      var frame = el("div", "video-frame");

      if (v.youtubeId) {
        var img = document.createElement("img");
        img.src = "https://i.ytimg.com/vi/" + encodeURIComponent(v.youtubeId) + "/hqdefault.jpg";
        img.alt = "";
        img.loading = "lazy";
        img.width = 480;
        img.height = 360;

        var btn = el("button", "video-play");
        btn.type = "button";
        btn.setAttribute("aria-label", "Lire la vidéo : " + v.titre);
        btn.addEventListener("click", function () {
          var iframe = document.createElement("iframe");
          iframe.src =
            "https://www.youtube-nocookie.com/embed/" +
            encodeURIComponent(v.youtubeId) + "?autoplay=1&rel=0";
          iframe.title = v.titre;
          iframe.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
          iframe.allowFullscreen = true;
          frame.innerHTML = "";
          frame.appendChild(iframe);
        });

        frame.appendChild(img);
        frame.appendChild(btn);
      } else {
        var ph = el("div", "video-placeholder");
        ph.textContent = "Vidéo à venir";
        frame.appendChild(ph);
      }

      var body = el("div", "video-body");
      var h3 = el("h3");
      h3.textContent = v.titre;
      body.appendChild(h3);
      if (v.description) {
        var p = el("p");
        p.textContent = v.description;
        body.appendChild(p);
      }

      article.appendChild(frame);
      article.appendChild(body);
      container.appendChild(article);
    });
  }

  // ---------- Top 50 : recherche, filtre, tri ----------
  function initTop50(list, morceaux) {
    var search = document.getElementById("search");
    var styleSel = document.getElementById("style-filter");
    var sortSel = document.getElementById("sort");
    var count = document.getElementById("result-count");

    morceaux = morceaux.slice(0, 50);

    var styles = Array.from(new Set(morceaux.map(function (m) { return m.style; })))
      .filter(Boolean)
      .sort(function (a, b) { return a.localeCompare(b, "fr"); });
    styles.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      styleSel.appendChild(opt);
    });

    function update() {
      var q = normalize(search.value);
      var style = styleSel.value;
      var sort = sortSel.value;

      var rows = morceaux.filter(function (m) {
        return (!style || m.style === style) && (!q || normalize(m.titre).indexOf(q) !== -1);
      });

      rows.sort(function (a, b) {
        if (sort === "date") return (b.date || "").localeCompare(a.date || "");
        if (sort === "titre") return a.titre.localeCompare(b.titre, "fr");
        return a.rang - b.rang;
      });

      list.innerHTML = "";
      rows.forEach(function (m) { list.appendChild(renderTrack(m)); });

      count.textContent = rows.length === morceaux.length
        ? morceaux.length + " morceaux"
        : rows.length + " sur " + morceaux.length + " morceaux";
    }

    search.addEventListener("input", update);
    styleSel.addEventListener("change", update);
    sortSel.addEventListener("change", update);
    update();
  }

  function renderTrack(m) {
    var li = el("li", "track");

    var rank = el("span", "track-rank");
    rank.textContent = String(m.rang).padStart(2, "0");

    var info = el("div");
    var title = el("p", "track-title");
    title.textContent = m.titre;
    var meta = el("div", "track-meta");
    var style = el("span", "track-style");
    style.textContent = m.style;
    var date = document.createElement("time");
    date.dateTime = m.date;
    date.textContent = formatDate(m.date);
    meta.appendChild(style);
    meta.appendChild(date);
    info.appendChild(title);
    info.appendChild(meta);

    var link = el("a", "track-link");
    link.href = m.lien;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Écouter ↗";
    link.setAttribute("aria-label", "Écouter " + m.titre + " sur Suno (nouvel onglet)");

    li.appendChild(rank);
    li.appendChild(info);
    li.appendChild(link);
    return li;
  }

  // ---------- Publications du blog ----------
  // API REST de WordPress (permaliens « simples », d'où ?rest_route=).
  // En cas d'échec, on garde la liste écrite en dur dans index.html.
  function loadPosts(container) {
    var blog = "https://yanncath1967.eu/";
    var api = blog + "?rest_route=/wp/v2/posts&per_page=5&_embed=1";

    fetch(api)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (posts) {
        if (!Array.isArray(posts) || !posts.length) return;
        container.innerHTML = "";
        posts.slice(0, 5).forEach(function (p, i) {
          container.appendChild(renderPost(p, i === 0, blog));
        });
      })
      .catch(function () { /* contenu de secours conservé */ });
  }

  function renderPost(p, featured, blog) {
    var embedded = p._embedded || {};
    var media = (embedded["wp:featuredmedia"] || [])[0] || {};
    var sizes = (media.media_details && media.media_details.sizes) || {};
    var size = (featured ? sizes.large || sizes.medium_large : sizes.medium_large || sizes.large) || sizes.full || {};
    var imgSrc = size.source_url || media.source_url;

    var cats = [].concat.apply([], embedded["wp:term"] || []).filter(function (t) {
      return t && t.taxonomy === "category";
    });

    var article = el("article", featured ? "post post-featured" : "post");

    if (isSafeUrl(imgSrc)) {
      var mediaBox = el("div", "post-media");
      var img = document.createElement("img");
      img.src = imgSrc;
      img.alt = "";
      img.loading = "lazy";
      if (size.width && size.height) { img.width = size.width; img.height = size.height; }
      mediaBox.appendChild(img);
      article.appendChild(mediaBox);
    }

    var body = el("div", "post-body");

    var meta = el("div", "post-meta");
    if (cats.length) {
      var cat = el("span", "post-cat");
      cat.textContent = htmlToText(cats[0].name);
      meta.appendChild(cat);
    }
    var date = document.createElement("time");
    date.dateTime = (p.date || "").slice(0, 10);
    date.textContent = formatDate(date.dateTime, "long");
    meta.appendChild(date);
    body.appendChild(meta);

    var h3 = el("h3", "post-title");
    var link = document.createElement("a");
    link.href = p.link && p.link.indexOf(blog) === 0 ? p.link : blog;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = htmlToText(p.title && p.title.rendered) || "Sans titre";
    h3.appendChild(link);
    body.appendChild(h3);

    var excerpt = htmlToText(p.excerpt && p.excerpt.rendered)
      .replace(/\s*(\[(…|&hellip;|\.\.\.)\]|Lire la suite.*)$/i, "");
    if (excerpt) {
      var ex = el("p", "post-excerpt");
      ex.textContent = truncate(excerpt, featured ? 220 : 120);
      body.appendChild(ex);
    }

    article.appendChild(body);
    return article;
  }

  // Convertit du HTML WordPress en texte brut (le <template> n'exécute rien).
  function htmlToText(html) {
    var t = document.createElement("template");
    t.innerHTML = html || "";
    return (t.content.textContent || "").replace(/\s+/g, " ").trim();
  }

  function truncate(s, max) {
    if (s.length <= max) return s;
    return s.slice(0, s.lastIndexOf(" ", max)).replace(/[\s,;:.]+$/, "") + "…";
  }

  function isSafeUrl(url) {
    return typeof url === "string" && /^https:\/\//.test(url);
  }

  // ---------- Utilitaires ----------
  function el(tag, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }

  function normalize(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function formatDate(iso, month) {
    if (!iso) return "";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: month || "short", year: "numeric" });
  }
})();
