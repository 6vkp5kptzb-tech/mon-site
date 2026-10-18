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

  // ---------- Date de mise à jour du site (data/site.json) ----------
  initMiseAJour();

  // ---------- Articles : carrousel (accueil), liste et page article ----------
  initArticles();

  // ---------- Page Vidéos ----------
  initVideos();

  // ---------- Page Sport : dernière sortie Strava ----------
  initDerniereSortie();

  // ---------- Page Musique : coups de cœur YouTube Music ----------
  initCoupsDeCoeur();

  // ---------- Page Musique et aperçu de l'accueil ----------
  var tracksEl = document.getElementById("tracks") || document.getElementById("tracks-preview");
  if (!tracksEl) return;

  fetch("data/musique.json", { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      var morceaux = data.morceaux || [];
      if (tracksEl.dataset.limit) {
        // Accueil : les N morceaux les plus récents
        morceaux.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); })
          .slice(0, Number(tracksEl.dataset.limit))
          .forEach(function (m) { tracksEl.appendChild(renderTrack(m)); });
      } else {
        initCompositions(tracksEl, morceaux);
      }
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
    if (m.auteur) {
      // Morceau d'un autre créateur : on le signale clairement
      var auteur = el("span", "track-auteur");
      auteur.textContent = "Morceau de " + m.auteur;
      meta.appendChild(auteur);
    }
    info.appendChild(title);
    info.appendChild(meta);

    li.appendChild(info);

    if (m.sunoId) {
      ajouterLecteur(li, m.titre, function () {
        var iframe = document.createElement("iframe");
        iframe.src = "https://suno.com/embed/" + encodeURIComponent(m.sunoId);
        iframe.title = "Lecteur Suno : " + m.titre;
        iframe.allow = "autoplay; encrypted-media; fullscreen";
        iframe.referrerPolicy = "no-referrer-when-downgrade";
        return iframe;
      });
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

  // Bouton « Écouter » + lecteur embarqué, chargé seulement au clic
  // zoneBouton (facultatif) : élément où placer le bouton, sinon directement dans li
  function ajouterLecteur(li, titre, creerIframe, classe, zoneBouton) {
    var btn = el("button", "track-link");
    btn.type = "button";
    btn.textContent = "▶ Écouter";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Écouter " + titre);
    var player = el("div", "track-player" + (classe ? " " + classe : ""));
    player.hidden = true;

    btn.addEventListener("click", function () {
      var open = player.hidden;
      if (open && !player.firstChild) {
        var iframe = creerIframe();
        iframe.allowFullscreen = true;
        iframe.loading = "lazy";
        player.appendChild(iframe);
      }
      if (!open) player.innerHTML = ""; // arrête la lecture en refermant
      player.hidden = !open;
      btn.textContent = open ? "✕ Fermer" : "▶ Écouter";
      btn.setAttribute("aria-expanded", String(open));
    });

    (zoneBouton || li).appendChild(btn);
    li.appendChild(player);
  }

  // ---------- Page Musique : coups de cœur YouTube Music (data/coups-de-coeur.json) ----------
  function initCoupsDeCoeur() {
    var list = document.getElementById("coups-de-coeur");
    if (!list) return;

    fetch("data/coups-de-coeur.json", { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var morceaux = (data.morceaux || []).filter(function (m) { return youtubeId(m.lien); });
        if (!morceaux.length) {
          list.outerHTML = '<p class="notice">Aucun coup de cœur pour le moment.</p>';
          return;
        }
        morceaux.forEach(function (m) { list.appendChild(renderCoupDeCoeur(m)); });
      })
      .catch(function () {
        list.outerHTML =
          '<p class="notice">Impossible de charger les coups de cœur. Si tu ouvres le fichier directement ' +
          "depuis ton disque, lance plutôt un petit serveur local (voir le README).</p>";
      });
  }

  function renderCoupDeCoeur(m) {
    var id = youtubeId(m.lien);
    var li = el("li", "track track-coeur");

    // Pochette : miniature YouTube recadrée en carré
    var pochette = el("img", "track-cover");
    pochette.src = "https://i.ytimg.com/vi/" + id + "/mqdefault.jpg";
    pochette.alt = "";
    pochette.loading = "lazy";
    li.appendChild(pochette);

    var info = el("div");
    var title = el("p", "track-title");
    title.textContent = m.titre;
    info.appendChild(title);
    var meta = el("div", "track-meta");
    if (m.artiste) {
      var artiste = el("span", "track-style");
      artiste.textContent = m.artiste;
      meta.appendChild(artiste);
    }
    if (m.commentaire) {
      var com = el("span");
      com.textContent = m.commentaire;
      meta.appendChild(com);
    }
    if (m.ia) {
      var ia = el("span", "track-auteur");
      ia.textContent = "Généré par IA";
      meta.appendChild(ia);
    }
    info.appendChild(meta);
    li.appendChild(info);

    var actions = el("div", "track-actions");
    li.appendChild(actions);

    var nomComplet = m.titre + (m.artiste ? " de " + m.artiste : "");
    ajouterLecteur(li, nomComplet, function () {
      var iframe = document.createElement("iframe");
      iframe.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
      iframe.title = "Lecteur YouTube : " + m.titre;
      iframe.allow = "autoplay; encrypted-media; picture-in-picture";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      return iframe;
    }, "track-player-video", actions);
    return li;
  }

  // ---------- Pied de page : « Mis à jour le … » ----------
  function initMiseAJour() {
    var footer = document.querySelector(".footer-inner");
    if (!footer) return;
    fetch("data/site.json", { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data.miseAJour) return;
        var span = el("span", "footer-maj");
        var date = document.createElement("time");
        date.dateTime = data.miseAJour;
        date.textContent = formatDate(data.miseAJour, "long");
        span.append("Mis à jour le ", date);
        footer.insertBefore(span, footer.children[1] || null);
      })
      .catch(function () { /* pas de date : rien à afficher */ });
  }

  // ---------- Dernière sortie (data/derniere-sortie.json, relevé depuis Strava) ----------
  function initDerniereSortie() {
    var box = document.getElementById("derniere-sortie");
    if (!box) return;
    fetch("data/derniere-sortie.json", { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (s) {
        var jour = (s.date || "").slice(0, 10);
        var heure = (s.date || "").slice(11, 16).replace(":", " h ");
        var quand = document.getElementById("derniere-quand");
        quand.textContent = [s.type, formatDate(jour, "long"), heure, s.lieu].filter(Boolean).join(" · ");
        if (s.activite) document.getElementById("derniere-lien").href = "https://www.strava.com/activities/" + s.activite;

        // Chiffres clés
        var stats = el("dl", "sortie-stats");
        [
          ["Distance", String(s.distanceKm).replace(".", ","), "km"],
          ["Durée", s.duree],
          ["Allure moyenne", s.allure, "/ km"],
          ["Dénivelé positif", s.denivele, "m"],
          ["FC moyenne", s.fcMoyenne, "bpm"],
          ["FC max", s.fcMax, "bpm"],
          ["Cadence", s.cadence, "pas / min"],
          ["Calories", s.calories, "kcal"]
        ].forEach(function (st) {
          if (st[1] === undefined || st[1] === null) return;
          var item = el("div", "sortie-stat");
          var dt = el("dt");
          dt.textContent = st[0];
          var dd = el("dd");
          dd.textContent = st[1];
          if (st[2]) {
            var unit = el("small");
            unit.textContent = " " + st[2];
            dd.appendChild(unit);
          }
          item.append(dt, dd);
          stats.appendChild(item);
        });
        box.appendChild(stats);

        if (s.commentaire) {
          var com = el("p", "sortie-comment");
          com.textContent = s.commentaire;
          box.appendChild(com);
        }

        // Tableau kilomètre par kilomètre, barre = vitesse (plus longue = plus rapide)
        var splits = s.splits || [];
        if (splits.length) {
          var vMax = Math.max.apply(null, splits.map(function (k) { return 1 / k.secondes; }));
          var table = el("table", "sortie-splits");
          var cap = el("caption");
          cap.textContent = "// kilomètre par kilomètre";
          var thead = el("thead");
          var hr = el("tr");
          ["Km", "Allure", "FC moy.", "Vitesse"].forEach(function (h) {
            var th = el("th");
            th.scope = "col";
            th.textContent = h;
            hr.appendChild(th);
          });
          thead.appendChild(hr);
          var tbody = el("tbody");
          splits.forEach(function (k) {
            var tr = el("tr");
            tr.title = "Km " + k.km + " : " + k.allure + " / km, " + k.fc + " bpm";
            var bar = el("span", "sortie-bar");
            bar.style.width = Math.round((1 / k.secondes) / vMax * 100) + "%";
            [k.km, k.allure + " / km", k.fc + " bpm", bar].forEach(function (v, i) {
              var td = el("td", i === 3 ? "sortie-bar-cell" : "");
              if (i === 3) td.setAttribute("aria-hidden", "true");
              td.append(v);
              tr.appendChild(td);
            });
            tbody.appendChild(tr);
          });
          table.append(cap, thead, tbody);
          box.appendChild(table);
        }

        var note = el("p", "sortie-note");
        var best = (s.meilleursEfforts || []).map(function (b) { return b.distance + " en " + b.temps; }).join(", ");
        note.textContent = (best ? "Meilleurs efforts de la sortie : " + best + ". " : "") +
          (s.effortRelatif ? "Effort relatif : " + s.effortRelatif + ". " : "") + "Données : " + (s.source || "Strava") + ".";
        box.appendChild(note);

        box.closest("section").hidden = false;
      })
      .catch(function () { /* pas de données : la section reste masquée */ });
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
          // Pas de vidéo seule : la section disparaît s'il y a des articles vidéo au-dessus
          if (document.getElementById("videos-articles")) container.closest("section").hidden = true;
          else container.innerHTML = '<p class="notice">Aucune vidéo pour le moment.</p>';
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
    var videoPostsEl = document.getElementById("videos-articles");
    if (!carouselEl && !listEl && !articleEl && !videoPostsEl) return;

    fetch("data/articles.json", { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var articles = (data.articles || []).slice().sort(function (a, b) {
          return (b.date || "").localeCompare(a.date || "");
        });
        // Le carrousel montre les 5 dernières publications, toutes rubriques confondues.
        // Les articles "sport": true ou "video": true sont réservés à la page Sport ou Vidéos.
        var publies = articles.filter(function (a) { return !a.sport && !a.video; });
        if (carouselEl) {
          // La dernière sortie Strava (page Sport) compte aussi comme une publication
          sortieCommePublication()
            .then(function (sortie) {
              var tout = sortie ? articles.concat(sortie) : articles;
              tout.sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
              initCarousel(carouselEl, tout.slice(0, 5));
            });
        }
        if (listEl) initArticleFilters(listEl, publies);
        if (videoPostsEl) {
          var videoPosts = articles.filter(function (a) { return a.video; });
          renderList(videoPostsEl, videoPosts);
          videoPostsEl.closest("section").hidden = !videoPosts.length;
        }
        if (articleEl) renderArticle(articleEl, articles);
      })
      .catch(function () {
        var msg = el("p", "notice");
        msg.textContent =
          "Impossible de charger les articles. Si tu ouvres le fichier directement " +
          "depuis ton disque, lance plutôt un petit serveur local (voir le README).";
        if (carouselEl) { carouselEl.hidden = false; carouselEl.replaceChildren(msg); }
        if (listEl) listEl.replaceWith(msg);
        if (videoPostsEl) videoPostsEl.closest("section").hidden = true;
        if (articleEl) articleEl.querySelector(".container").replaceChildren(msg);
      });
  }

  function articleUrl(a) {
    return a.lien || "article.html?a=" + encodeURIComponent(a.slug);
  }

  // data/derniere-sortie.json présenté comme une carte du carrousel (null si absent)
  function sortieCommePublication() {
    return fetch("data/derniere-sortie.json", { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (s) {
        var km = String(s.distanceKm).replace(".", ",");
        return {
          titre: "Ma dernière sortie : " + km + " km" + (s.lieu ? " à " + s.lieu : ""),
          date: (s.date || "").slice(0, 10),
          categorie: "Sport",
          image: "images/articles/derniere-sortie.svg",
          extrait: km + " km en " + s.duree + ", à " + s.allure + " / km de moyenne et " +
            s.fcMoyenne + " bpm. Le détail kilomètre par kilomètre, d'après Strava.",
          lien: "sport.html#derniere"
        };
      })
      .catch(function () { return null; });
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
  // Liste des articles avec filtre par catégorie (articles.html?cat=...)
  function initArticleFilters(listEl, articles) {
    var bar = document.getElementById("articles-filters");
    var cats = Array.from(new Set(articles.map(function (a) { return a.categorie; })))
      .filter(Boolean)
      .sort(function (a, b) { return a.localeCompare(b, "fr"); });
    var current = new URLSearchParams(location.search).get("cat") || "";
    if (cats.indexOf(current) === -1) current = "";

    if (!bar || cats.length < 2) { renderList(listEl, articles); return; }

    var buttons = [""].concat(cats).map(function (c) {
      var n = c ? articles.filter(function (a) { return a.categorie === c; }).length : articles.length;
      var btn = el("button", "filter-chip");
      btn.type = "button";
      btn.textContent = (c || "Tout") + " (" + n + ")";
      btn.addEventListener("click", function () { select(c, true); });
      bar.appendChild(btn);
      return { cat: c, btn: btn };
    });

    function select(c, push) {
      current = c;
      buttons.forEach(function (b) { b.btn.setAttribute("aria-pressed", String(b.cat === c)); });
      renderList(listEl, c ? articles.filter(function (a) { return a.categorie === c; }) : articles);
      if (push) {
        var url = new URL(location.href);
        if (c) url.searchParams.set("cat", c); else url.searchParams.delete("cat");
        history.replaceState(null, "", url);
      }
    }

    bar.hidden = false;
    select(current, false);
  }

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
    backLink.href = a.sport ? "sport.html" : a.video ? "videos.html" : "articles.html";
    backLink.textContent = a.sport ? "← Sport" : a.video ? "← Vidéos" : "← Toutes les publications";

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

      case "diaporama":
        return renderSlideshow(b.photos || []);

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

  // ---------- Diaporama (bloc "diaporama" d'un article) ----------
  // Une photo à la fois : flèches, points, clavier et glissement au doigt.
  // Les photos introuvables sont retirées ; sans aucune photo, le diaporama disparaît.
  function renderSlideshow(photos) {
    var root = el("figure", "slideshow");
    root.setAttribute("role", "region");
    root.setAttribute("aria-roledescription", "diaporama");
    root.setAttribute("aria-label", "Diaporama photo");
    root.tabIndex = 0;

    var track = el("ul", "slideshow-track");
    var caption = el("figcaption", "slideshow-caption");
    var controls = el("div", "carousel-controls");
    var prev = slideshowBtn("Photo précédente", "m15 18-6-6 6-6");
    var next = slideshowBtn("Photo suivante", "m9 18 6-6-6-6");
    var dotsBox = el("div", "carousel-dots");
    var counter = el("span", "slideshow-counter");
    controls.append(prev, dotsBox, next, counter);
    root.append(track, caption, controls);

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var items = [];
    var current = 0;

    photos.forEach(function (p) {
      var li = el("li", "slideshow-slide");
      li.setAttribute("role", "group");
      li.setAttribute("aria-roledescription", "diapositive");
      var img = document.createElement("img");
      img.src = p.src;
      img.alt = p.alt || "";
      img.loading = "lazy";
      img.decoding = "async";
      li.appendChild(img);
      track.appendChild(li);

      var dot = el("button", "carousel-dot");
      dot.type = "button";
      dotsBox.appendChild(dot);

      var item = { li: li, dot: dot, photo: p };
      items.push(item);
      dot.addEventListener("click", function () { goTo(items.indexOf(item)); });
      img.addEventListener("error", function () {
        li.remove();
        dot.remove();
        items.splice(items.indexOf(item), 1);
        refresh();
      });
    });

    function goTo(i) {
      if (!items.length) return;
      current = (i + items.length) % items.length; // on boucle aux extrémités
      track.scrollTo({ left: current * track.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
      update();
    }

    function update() {
      var n = items.length;
      items.forEach(function (it, i) {
        it.li.setAttribute("aria-label", (i + 1) + " sur " + n);
        it.dot.setAttribute("aria-label", "Aller à la photo " + (i + 1));
        it.dot.setAttribute("aria-current", i === current ? "true" : "false");
      });
      var p = n ? items[current].photo : null;
      caption.textContent = p && p.legende ? p.legende : "";
      caption.hidden = !caption.textContent;
      counter.textContent = n ? (current + 1) + " / " + n : "";
    }

    function refresh() {
      root.hidden = !items.length;
      controls.hidden = items.length < 2;
      current = Math.min(current, Math.max(0, items.length - 1));
      update();
    }

    // Suit le glissement manuel (doigt, pavé tactile)
    var scrollTimer;
    track.addEventListener("scroll", function () {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        var w = track.clientWidth;
        if (!w || !items.length) return;
        current = Math.min(items.length - 1, Math.round(track.scrollLeft / w));
        update();
      }, 80);
    });

    prev.addEventListener("click", function () { goTo(current - 1); });
    next.addEventListener("click", function () { goTo(current + 1); });
    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(current - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(current + 1); }
    });

    refresh();
    return root;
  }

  function slideshowBtn(label, path) {
    var btn = el("button", "carousel-btn");
    btn.type = "button";
    btn.setAttribute("aria-label", label);
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + path + '"/></svg>';
    return btn;
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
