# mon-site

Site personnel statique : HTML, CSS et JavaScript vanilla. Pas de framework, pas de build.

## Structure

```
index.html        Accueil
musique.html      Top 50 Suno + vidéos YouTube
passions.html     IA, Power BI, trail
contact.html      Contact (à compléter)
css/style.css     Styles (couleurs en haut du fichier, dans :root)
js/main.js        Menu mobile + affichage de la page Musique
data/musique.json Liste des morceaux et des vidéos
favicon.svg       Icône de l'onglet
```

## Modifier le contenu

- **Ton prénom** : remplace « Prénom » dans les 4 fichiers HTML.
- **Morceaux** : édite `data/musique.json`, tableau `morceaux`. Un morceau =
  `{ "rang": 1, "titre": "...", "style": "...", "date": "AAAA-MM-JJ", "lien": "https://suno.com/song/..." }`.
  Seuls les 50 premiers sont affichés. Les styles du filtre se remplissent tout seuls.
- **Vidéos** : même fichier, tableau `videos`. `youtubeId` = la partie après `v=` dans l'URL YouTube.
  Les vidéos ne se chargent qu'au clic (page plus rapide, pas de cookie YouTube avant le clic).
- **Couleurs** : variables `--accent`, `--bg`, etc. en haut de `css/style.css`.

## Voir le site en local

La page Musique lit un fichier JSON : elle ne fonctionne pas en double-cliquant sur le fichier.
Lance un petit serveur dans ce dossier :

```
python -m http.server 8000
```

puis ouvre http://localhost:8000. (Ou utilise l'extension « Live Server » de VS Code.)

## Mise en ligne (Hostinger)

hPanel → Avancé → Git : dépôt `https://github.com/6vkp5kptzb-tech/mon-site.git`, branche `main`,
dossier d'installation vide (= `public_html`). Après chaque `git push`, clique sur « Déployer »
(ou active le déploiement automatique via le webhook proposé).
