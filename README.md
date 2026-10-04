# mon-site

Site personnel statique : HTML, CSS et JavaScript vanilla. Pas de framework, pas de build.

## Structure

```
index.html        Accueil
musique.html      Mes compositions Suno (lecteur embarqué)
videos.html       Vidéos YouTube coup de cœur
passions.html     IA, course à pied, trail
articles.html     Liste de tous les articles
article.html      Page d'un article (article.html?a=slug)
contact.html      Contact (à compléter)
css/style.css     Styles (couleurs en haut du fichier, dans :root)
js/main.js        Menu, page Musique, carrousel et articles
data/musique.json Liste des morceaux
data/videos.json  Vidéos YouTube de la page Vidéos
data/articles.json Articles (titre, date, image, contenu)
images/articles/  Images des articles
favicon.svg       Icône de l'onglet
```

## Modifier le contenu

- **Morceaux** : édite `data/musique.json`, tableau `morceaux`. Un morceau =
  `{ "titre": "...", "style": "...", "date": "AAAA-MM-JJ", "lien": "https://suno.com/song/...", "sunoId": "..." }`.
  `sunoId` = l'identifiant du morceau (la partie après `suno.com/embed/` ou `suno.com/song/`) :
  il active le lecteur embarqué, chargé seulement au clic sur « Écouter ». Sans `sunoId`,
  le bouton ouvre `lien` dans un nouvel onglet. Les styles du filtre se remplissent tout seuls.
- **Vidéos** : édite `data/videos.json`, tableau `videos`. Une vidéo =
  `{ "titre": "...", "chaine": "...", "lien": "https://www.youtube.com/watch?v=...", "commentaire": "..." }`.
  Colle simplement le lien YouTube (watch, youtu.be ou shorts) ; `chaine` et `commentaire` sont facultatifs.
  Les vidéos ne se chargent qu'au clic (page plus rapide, pas de cookie YouTube avant le clic).
- **Articles** : édite `data/articles.json`, tableau `articles`. Un article =
  `{ "slug": "mon-article", "titre": "...", "date": "AAAA-MM-JJ", "categorie": "...",
  "image": "images/articles/mon-image.jpg", "imageAlt": "...", "extrait": "...", "contenu": [ ... ] }`.
  Ajoute `"passions": true` pour qu'un article n'apparaisse ni dans la liste Articles ni dans le carrousel
  (il reste lisible via son lien, par exemple depuis la page Passions).
  Le `slug` (minuscules, tirets) donne l'adresse : `article.html?a=mon-article`. Les images vont dans `images/articles/`.
  `contenu` est une liste de blocs :
  `{ "type": "texte", "texte": "..." }`, `{ "type": "titre", "texte": "..." }`,
  `{ "type": "image", "src": "...", "alt": "...", "legende": "..." }`,
  `{ "type": "youtube", "id": "...", "titre": "..." }`,
  `{ "type": "compte-a-rebours", "date": "AAAA-MM-JJ", "texte": "..." }`.
  Les articles sont triés par date : les 5 plus récents défilent dans le carrousel de l'accueil,
  tous apparaissent sur `articles.html`.
- **Couleurs** : variables `--accent`, `--bg`, etc. en haut de `css/style.css`.

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
