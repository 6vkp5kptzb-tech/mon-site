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

  // ---------- Articles : carrousel (accueil), liste et page article ----------
  initArticles();

  // ---------- Page Vidéos ----------
  initVideos();

  // ---------- Page Musique ----------
  var tracksEl = document.getElementById("tracks");
  if (!tracksEl) return;

  fetch("data/musique.json", { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      initCompositions(tracksEl, data.morceaux || []);
    })
    .catch(function () {
      tracksEl.outerHTML =
        '<p class="notice">Impossible de charger la liste des morceaux. ' +
        "Si tu ouvres le fichier directement depuis ton disque, lance plutôt " +
        "un petit serveur local (voir le README).</p>";
    });

  // ---------- Mes compositions : recherche, filtre, tri ----------
  function initCompositions(list, morceaux) {
    var search = document.getElementById("search");
    var styleSel = document.getElementById("style-filter");
    var sortSel = document.getElementById("sort");
    var count = document.getElementById("result-count");

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
        if (sort === "titre") return a.titre.localeCompare(b.titre, "fr");
        return (b.date || "").localeCompare(a.date || "");
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

    li.appendChild(info);

    if (m.sunoId) {
      // Lecteur Suno embarqué, chargé seulement au clic
      var btn = el("button", "track-link");
      btn.type = "button";
      btn.textContent = "▶ Écouter";
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", "Écouter " + m.titre);
      var player = el("div", "track-player");
      player.hidden = true;

      btn.addEventListener("click", function () {
        var open = player.hidden;
        if (open && !player.firstChild) {
          var iframe = document.createElement("iframe");
          iframe.src = "https://suno.com/embed/" + encodeURIComponent(m.sunoId);
          iframe.title = "Lecteur Suno : " + m.titre;
          iframe.allow = "autoplay; encrypted-media; fullscreen";
          iframe.allowFullscreen = true;
          iframe.loading = "lazy";
          iframe.referrerPolicy = "no-referrer-when-downgrade";
          player.appendChild(iframe);
        }
        if (!open) player.innerHTML = ""; // arrête la lecture en refermant
        player.hidden = !open;
        btn.textContent = open ? "✕ Fermer" : "▶ Écouter";
        btn.setAttribute("aria-expanded", String(open));
      });

      li.appendChild(btn);
      li.appendChild(player);
    } else {
      var link = el("a", "track-link");
      link.href = m.lien;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Écouter ↗";
      link.setAttribute("aria-label", "Écouter " + m.titre + " sur Suno (nouvel onglet)");
      li.appendChild(link);
    }
    return li;
  }

  // ---------- Vidéos YouTube (data/videos.json), chargées au clic ----------
  function initVideos() {
    var container = document.getElementById("videos");
    if (!container) return;

    fetch("data/videos.json", { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var videos = (data.videos || []).filter(function (v) { return youtubeId(v.lien); });
        container.innerHTML = "";
        if (!videos.length) {
          container.innerHTML = '<p class="notice">Aucune vidéo pour le moment.</p>';
          return;
        }
        videos.forEach(function (v) { container.appendChild(renderVideo(v)); });
      })
      .catch(function () {
        container.innerHTML =
          '<p class="notice">Impossible de charger les vidéos. Si tu ouvres le fichier directement ' +
          "depuis ton disque, lance plutôt un petit serveur local (voir le README).</p>";
      });
  }

  // Accepte un lien YouTube complet (watch?v=, youtu.be/, embed/, shorts/) ou l'identifiant seul
  function youtubeId(lien) {
    if (!lien) return "";
    var m = String(lien).match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
    if (m) return m[1];
    return /^[\w-]{11}$/.test(lien) ? lien : "";
  }

  function renderVideo(v) {
    var id = youtubeId(v.lien);
    var article = el("article", "video");
    var frame = el("div", "video-frame");

    var img = document.createElement("img");
    img.src = "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
    img.alt = "";
    img.loading = "lazy";

    var btn = el("button", "video-play");
    btn.type = "button";
    btn.setAttribute("aria-label", "Lire la vidéo : " + v.titre);
    btn.addEventListener("click", function () {
      var iframe = document.createElement("iframe");
      iframe.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
      iframe.title = v.titre;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allowFullscreen = true;
      frame.replaceChildren(iframe);
    });

    frame.appendChild(img);
    frame.appendChild(btn);

    var body = el("div", "video-body");
    if (v.chaine) {
      var src = el("p", "video-source");
      src.textContent = v.chaine;
      body.appendChild(src);
    }
    var h3 = el("h3");
    h3.textContent = v.titre;
    body.appendChild(h3);
    if (v.commentaire) {
      var p = el("p");
      p.textContent = v.commentaire;
      body.appendChild(p);
    }

    article.appendChild(frame);
    article.appendChild(body);
    return article;
  }

  // ---------- Articles (data/articles.json) ----------
  function initArticles() {
    var carouselEl = document.getElementById("carousel");
    var listEl = document.getElementById("articles-list");
    var articleEl = document.getElementById("article");
    if (!carouselEl && !listEl && !articleEl) return;

    fetch("data/articles.json", { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var articles = (data.articles || []).slice().sort(function (a, b) {
          return (b.date || "").localeCompare(a.date || "");
        });
        // Les articles marqués "passions": true ne s'affichent que sur la page Passions
        var publies = articles.filter(function (a) { return !a.passions; });
        if (carouselEl) initCarousel(carouselEl, publies.slice(0, 5));
        if (listEl) renderList(listEl, publies);
        if (articleEl) renderArticle(articleEl, articles);
      })
      .catch(function () {
        var msg = el("p", "notice");
        msg.textContent =
          "Impossible de charger les articles. Si tu ouvres le fichier directement " +
          "depuis ton disque, lance plutôt un petit serveur local (voir le README).";
        if (carouselEl) { carouselEl.hidden = false; carouselEl.replaceChildren(msg); }
        if (listEl) listEl.replaceWith(msg);
        if (articleEl) articleEl.querySelector(".container").replaceChildren(msg);
      });
  }

  function articleUrl(a) {
    return "article.html?a=" + encodeURIComponent(a.slug);
  }

  // Carte d'article (carrousel et liste)
  function renderCard(a, tag) {
    var card = el(tag || "article", "post");

    if (a.image) {
      var media = el("div", "post-media");
      var img = document.createElement("img");
      img.src = a.image;
      img.alt = "";
      img.loading = "lazy";
      media.appendChild(img);
      card.appendChild(media);
    }

    var body = el("div", "post-body");
    body.appendChild(renderMeta(a));

    var h3 = el("h3", "post-title");
    var link = el("a");
    link.href = articleUrl(a);
    link.textContent = a.titre;
    h3.appendChild(link);
    body.appendChild(h3);

    if (a.extrait) {
      var ex = el("p", "post-excerpt");
      ex.textContent = a.extrait;
      body.appendChild(ex);
    }

    card.appendChild(body);
    return card;
  }

  function renderMeta(a) {
    var meta = el("div", "post-meta");
    if (a.categorie) {
      var cat = el("span", "post-cat");
      cat.textContent = a.categorie;
      meta.appendChild(cat);
    }
    var date = document.createElement("time");
    date.dateTime = a.date;
    date.textContent = formatDate(a.date, "long");
    meta.appendChild(date);
    return meta;
  }

  // ---------- Carrousel de l'accueil ----------
  function initCarousel(root, articles) {
    var track = document.getElementById("carousel-track");
    var dotsBox = document.getElementById("carousel-dots");
    var pauseBtn = document.getElementById("carousel-pause");
    var DELAY = 5000;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var current = 0;
    var timer = null;
    var paused = reduceMotion; // pas de défilement auto si l'utilisateur limite les animations
    var hovered = false;

    var dots = articles.map(function (a, i) {
      var li = renderCard(a, "li");
      li.className = "post carousel-slide";
      li.setAttribute("role", "group");
      li.setAttribute("aria-roledescription", "diapositive");
      li.setAttribute("aria-label", (i + 1) + " sur " + articles.length);
      track.appendChild(li);

      var dot = el("button", "carousel-dot");
      dot.type = "button";
      dot.setAttribute("aria-label", "Aller à l'article " + (i + 1));
      dot.addEventListener("click", function () { goTo(i); });
      dotsBox.appendChild(dot);
      return dot;
    });
    var slides = Array.from(track.children);
    root.hidden = false;

    // Nombre de cartes entièrement visibles (3, 2 ou 1 selon la largeur)
    function perView() {
      var w = slides[0].getBoundingClientRect().width;
      return w ? Math.max(1, Math.round(track.clientWidth / w)) : 1;
    }
    function lastIndex() { return Math.max(0, slides.length - perView()); }
    function slideLeft(i) { return slides[i].offsetLeft - slides[0].offsetLeft; }

    function goTo(i) {
      var max = lastIndex();
      current = i > max ? 0 : i < 0 ? max : i; // on boucle aux extrémités
      track.scrollTo({ left: slideLeft(current), behavior: reduceMotion ? "auto" : "smooth" });
      restart();
    }

    function updateDots() {
      var max = lastIndex();
      dots.forEach(function (d, i) {
        d.hidden = i > max;
        d.setAttribute("aria-current", i === current ? "true" : "false");
      });
    }

    // Suit le défilement manuel (doigt, molette, pavé tactile)
    var scrollTimer;
    track.addEventListener("scroll", function () {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        var left = track.scrollLeft;
        var best = 0;
        slides.forEach(function (s, i) {
          if (Math.abs(slideLeft(i) - left) < Math.abs(slideLeft(best) - left)) best = i;
        });
        current = Math.min(best, lastIndex());
        updateDots();
      }, 80);
    });

    root.querySelectorAll("[data-dir]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        goTo(current + Number(btn.getAttribute("data-dir")));
      });
    });

    function restart() {
      clearInterval(timer);
      updateDots();
      if (!paused && !hovered) timer = setInterval(function () { goTo(current + 1); }, DELAY);
    }

    function setPaused(p) {
      paused = p;
      root.classList.toggle("is-paused", p);
      pauseBtn.setAttribute("aria-label", p ? "Relancer le défilement" : "Mettre le défilement en pause");
      restart();
    }
    pauseBtn.addEventListener("click", function () { setPaused(!paused); });

    // Pause pendant le survol ou quand le focus clavier est dans le carrousel
    root.addEventListener("mouseenter", function () { hovered = true; restart(); });
    root.addEventListener("mouseleave", function () { hovered = false; restart(); });
    root.addEventListener("focusin", function () { hovered = true; restart(); });
    root.addEventListener("focusout", function (e) {
      if (!root.contains(e.relatedTarget)) { hovered = false; restart(); }
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) clearInterval(timer); else restart();
    });
    window.addEventListener("resize", updateDots);

    setPaused(paused);
  }

  // ---------- Page Articles ----------
  function renderList(container, articles) {
    container.replaceChildren.apply(container, articles.map(function (a) { return renderCard(a); }));
  }

  // ---------- Page Article ----------
  function renderArticle(root, articles) {
    var box = root.querySelector(".container");
    var slug = new URLSearchParams(location.search).get("a");
    var a = articles.find(function (x) { return x.slug === slug; });

    if (!a) {
      document.title = "Article introuvable — Yannick";
      var empty = el("div", "empty-state");
      var h1 = el("h1");
      h1.textContent = "Article introuvable";
      var p = el("p");
      p.textContent = "Cet article n'existe pas ou a été déplacé.";
      var back = el("a", "btn btn-primary");
      back.href = "articles.html";
      back.textContent = "Voir tous les articles";
      empty.append(h1, p, back);
      box.replaceChildren(empty);
      return;
    }

    document.title = a.titre + " — Yannick";
    var desc = document.querySelector('meta[name="description"]');
    if (desc && a.extrait) desc.content = a.extrait;

    var backLink = el("a", "back-link");
    backLink.href = "articles.html";
    backLink.textContent = "← Toutes les publications";

    var head = el("header", "article-head");
    var title = el("h1");
    title.textContent = a.titre;
    head.append(renderMeta(a), title);

    box.replaceChildren(backLink, head);

    // Image principale, sauf si l'article commence déjà par cette image
    var first = (a.contenu || [])[0];
    if (a.image && !(first && first.type === "image" && first.src === a.image)) {
      var cover = el("figure", "article-cover");
      var img = document.createElement("img");
      img.src = a.image;
      img.alt = a.imageAlt || "";
      cover.appendChild(img);
      box.appendChild(cover);
    }

    var body = el("div", "article-body");
    (a.contenu || []).forEach(function (b) {
      var node = renderBlock(b);
      if (node) body.appendChild(node);
    });
    box.appendChild(body);
  }

  // Un bloc de contenu = un objet { "type": ..., ... } dans data/articles.json
  function renderBlock(b) {
    var node;
    switch (b.type) {
      case "titre":
        node = el("h2");
        node.textContent = b.texte;
        return node;

      case "texte":
        node = el("p");
        node.textContent = b.texte;
        return node;

      case "image":
        node = el("figure");
        var img = document.createElement("img");
        img.src = b.src;
        img.alt = b.alt || "";
        img.loading = "lazy";
        node.appendChild(img);
        if (b.legende) {
          var cap = el("figcaption");
          cap.textContent = b.legende;
          node.appendChild(cap);
        }
        return node;

      case "youtube":
        node = el("div", "video-frame article-video" + (b.format === "vertical" ? " is-vertical" : ""));
        var iframe = document.createElement("iframe");
        iframe.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(b.id) + "?rel=0";
        iframe.title = b.titre || "Vidéo YouTube";
        iframe.loading = "lazy";
        iframe.allow = "accelerometer; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        node.appendChild(iframe);
        return node;

      case "code":
        node = el("figure", "code-block");
        if (b.legende) {
          var codeCap = el("figcaption");
          codeCap.textContent = b.legende;
          node.appendChild(codeCap);
        }
        var pre = el("pre");
        var code = el("code");
        code.textContent = b.code;
        pre.appendChild(code);
        node.appendChild(pre);
        return node;

      case "liste":
        node = el("ul");
        (b.elements || []).forEach(function (t) {
          var li = el("li");
          li.textContent = t;
          node.appendChild(li);
        });
        return node;

      case "tableau":
        node = el("div", "table-wrap");
        var table = el("table");
        if (b.entetes) {
          var thead = el("thead");
          var hr = el("tr");
          b.entetes.forEach(function (t) {
            var th = el("th");
            th.scope = "col";
            th.textContent = t;
            hr.appendChild(th);
          });
          thead.appendChild(hr);
          table.appendChild(thead);
        }
        var tbody = el("tbody");
        (b.lignes || []).forEach(function (ligne) {
          var tr = el("tr");
          ligne.forEach(function (t) {
            var td = el("td");
            td.textContent = t;
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        node.appendChild(table);
        return node;

      case "compte-a-rebours":
        node = el("div", "countdown");
        var label = el("p", "countdown-label");
        var value = el("p", "countdown-value");
        node.append(label, value);
        var target = new Date(b.date + "T00:00:00").getTime();
        var tick = function () {
          var ms = target - Date.now();
          label.textContent = (b.texte || "") + " :";
          if (ms <= 0) {
            value.textContent = "C'est maintenant ! 🎉";
            return;
          }
          var days = Math.floor(ms / 864e5);
          var h = Math.floor(ms % 864e5 / 36e5);
          var m = Math.floor(ms % 36e5 / 6e4);
          var s = Math.floor(ms % 6e4 / 1e3);
          value.textContent = days + " j " + pad(h) + " h " + pad(m) + " min " + pad(s) + " s";
          setTimeout(tick, 1000);
        };
        tick();
        return node;
    }
    return null;
  }

  function pad(n) { return String(n).padStart(2, "0"); }

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
