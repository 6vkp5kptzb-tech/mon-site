/* =========================================================
   Mon site — script commun à toutes les pages
   ========================================================= */

(function () {
  "use strict";

  // ---------- Menu mobile ----------
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  // ---------- Année du pied de page ----------
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

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

  // ---------- Utilitaires ----------
  function el(tag, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }

  function normalize(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  }
})();
