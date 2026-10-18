# mon-site

Site personnel statique : HTML, CSS et JavaScript vanilla. Pas de framework, pas de build.

## Structure

```
index.html        Accueil
musique.html      Mes compositions Suno et mes coups de cœur YouTube Music (lecteurs embarqués)
videos.html       Vidéos YouTube coup de cœur
sport.html        Course à pied (route) et trail, articles sport
articles.html     Liste de tous les articles
article.html      Page d'un article (article.html?a=slug)
contact.html      Contact (à compléter)
css/style.css     Styles (couleurs en haut du fichier, dans :root)
js/main.js        Menu, page Musique, carrousel et articles
data/musique.xlsx Liste des morceaux (à modifier dans Excel)
data/musique.json Généré depuis l'Excel (ne pas modifier à la main)
mettre-a-jour-musique.bat  Convertit l'Excel en JSON (double-clic)
outils/           Script de conversion Excel → JSON (Python)
data/videos.json  Vidéos YouTube de la page Vidéos
data/coups-de-coeur.json  Morceaux YouTube Music que j'aime (page Musique)
data/articles.json Articles (titre, date, image, contenu)
data/site.json    Date de dernière mise à jour du site (pied de page)
data/derniere-sortie.json  Ma dernière sortie Strava (page Sport)
images/articles/  Images des articles
favicon.svg       Icône de l'onglet
```

## Modifier le contenu

- **Morceaux** : ouvre `data/musique.xlsx` dans Excel, une ligne par morceau
  (colonnes `titre`, `style`, `date` au format JJ/MM/AAAA, `lien`, `sunoId`, `auteur`). Enregistre,
  puis **double-clique sur `mettre-a-jour-musique.bat`** : il régénère `data/musique.json`.
  `sunoId` est facultatif : s'il est vide et que le lien est de la forme `https://suno.com/song/...`,
  il est repris tout seul. Avec un `sunoId`, « Écouter » ouvre le lecteur embarqué ; sinon le lien
  s'ouvre dans un nouvel onglet. Les styles du filtre se remplissent tout seuls.
  `auteur` est facultatif : remplis-le uniquement pour un morceau qui n'est pas de toi
  (ex. `Cadidscha`), le site affiche alors « de Cadidscha » sous le titre.
  Pense à envoyer les deux fichiers (`.xlsx` et `.json`) sur GitHub. Seul Python est nécessaire.
- **Coups de cœur musique** : édite `data/coups-de-coeur.json`, tableau `morceaux`. Un morceau =
  `{ "titre": "...", "artiste": "...", "lien": "https://music.youtube.com/watch?v=...", "commentaire": "..." }`.
  Dans YouTube Music : « Partager » → « Copier le lien », puis colle-le dans `lien`.
  `artiste` et `commentaire` sont facultatifs. Le lecteur ne se charge qu'au clic sur « Écouter ».
- **Vidéos** : édite `data/videos.json`, tableau `videos`. Une vidéo =
  `{ "titre": "...", "chaine": "...", "lien": "https://www.youtube.com/watch?v=...", "commentaire": "..." }`.
  Colle simplement le lien YouTube (watch, youtu.be ou shorts) ; `chaine` et `commentaire` sont facultatifs.
  Les vidéos ne se chargent qu'au clic (page plus rapide, pas de cookie YouTube avant le clic).
- **Articles** : édite `data/articles.json`, tableau `articles`. Un article =
  `{ "slug": "mon-article", "titre": "...", "date": "AAAA-MM-JJ", "categorie": "...",
  "image": "images/articles/mon-image.jpg", "imageAlt": "...", "extrait": "...", "contenu": [ ... ] }`.
  Ajoute `"sport": true` pour qu'un article n'apparaisse ni dans la liste Articles ni dans le carrousel :
  il est réservé à la page Sport (ajoute sa carte dans `sport.html`) et son lien retour pointe vers elle.
  De même, `"video": true` réserve un article à la page Vidéos (sa carte s'y affiche toute seule, section « Mes articles vidéo »).
  Le `slug` (minuscules, tirets) donne l'adresse : `article.html?a=mon-article`. Les images vont dans `images/articles/`.
  `contenu` est une liste de blocs :
  `{ "type": "texte", "texte": "..." }`, `{ "type": "titre", "texte": "..." }`,
  `{ "type": "image", "src": "...", "alt": "...", "legende": "..." }`,
  `{ "type": "youtube", "id": "...", "titre": "..." }` (ajoute `"format": "vertical"` pour un Short),
  `{ "type": "code", "legende": "JavaScript", "code": "..." }` (retours à la ligne en `\n`),
  `{ "type": "liste", "elements": ["...", "..."] }`,
  `{ "type": "tableau", "entetes": ["...", "..."], "lignes": [["...", "..."], ["...", "..."]] }`,
  `{ "type": "compte-a-rebours", "date": "AAAA-MM-JJ", "texte": "..." }`,
  `{ "type": "diaporama", "photos": [{ "src": "...", "alt": "...", "legende": "..." }, ...] }`
  (une photo à la fois, flèches/points/clavier/glissement ; une photo introuvable est simplement ignorée).
  Les articles sont triés par date : les 5 plus récents, toutes rubriques confondues (sport et vidéo compris),
  défilent dans le carrousel de l'accueil,
  tous apparaissent sur `articles.html`, avec un filtre par catégorie (créé tout seul à partir des `categorie`,
  lien direct possible : `articles.html?cat=Sciences`). Les 3 morceaux les plus récents s'affichent aussi sur l'accueil.
- **Dernière sortie (page Sport)** : `data/derniere-sortie.json`, relevé depuis Strava (distance, durée,
  allure, FC, splits…). Le site ne lit pas Strava en direct : demande à Claude de remettre ce fichier à jour
  après une nouvelle sortie. Sans ce fichier, la section est simplement masquée.
  Elle compte aussi comme une publication : sa carte entre dans le carrousel de l'accueil, à sa date.
- **Date de mise à jour** : change `miseAJour` (format AAAA-MM-JJ) dans `data/site.json` ; elle s'affiche
  dans le pied de page de toutes les pages (« Mis à jour le … »).
- **Couleurs** : variables `--accent`, `--bg`, etc. en haut de `css/style.css`.
- **Cache** : après une modification de `css/style.css` ou `js/main.js`, augmente le numéro
  `?v=...` dans les balises `<link>` et `<script>` de toutes les pages, sinon les navigateurs
  gardent l'ancienne version.

## Voir le site en local

Les pages Musique et Articles (et le carrousel de l'accueil) lisent des fichiers JSON : elle ne fonctionne pas en double-cliquant sur le fichier.
Lance un petit serveur dans ce dossier :

```
python -m http.server 8000
```

puis ouvre http://localhost:8000. (Ou utilise l'extension « Live Server » de VS Code.)

## Mise en ligne (Hostinger)

hPanel → Avancé → Git : dépôt `https://github.com/6vkp5kptzb-tech/mon-site.git`, branche `main`,
dossier d'installation vide (= `public_html`). Après chaque `git push`, clique sur « Déployer »
(ou active le déploiement automatique via le webhook proposé).
