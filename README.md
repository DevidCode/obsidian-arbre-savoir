# obsidian-arbre-savoir

Dessine l'Arbre du savoir comme une carte qui **pousse vers le haut**, tronc en
bas — déduite de la numérotation Antinet portée par les noms de fichiers.

**Lecture seule, par choix de conception** — pas parce que le vault
l'interdirait. Plusieurs outils y écrivent (Obsidian, le serveur MCP,
`vault-outils`, `vault-obsidian-web`), et depuis le 2026-08-28 l'Arbre lui-même
s'écrira depuis l'outil de cartes. Ce plugin-ci ne fait que refléter.

## À quoi ça sert

Le navigateur de fichiers d'Obsidian range par dossier, et sa vue graphique ne
dessine que les liens : ni l'un ni l'autre ne connaît la numérotation. Un
Zettelkasten numéroté (`4000 → 4200 → 4280 → 4280.A`) n'a donc aucun endroit où
se **voir** en entier. On peut y lire une note, mais pas sentir où elle est.

Ce plugin ajoute un onglet qui dessine cet emboîtement, et rien d'autre. Il
n'écrit jamais dans le vault.

## Usage

Icône dans le ruban, ou commande **« Ouvrir l'Arbre du savoir »**.

- Tout arrive **replié** sauf les domaines de tête.
- Un **appui** sur un nœud déplie ou replie sa branche, et cadre ce qui vient de
  s'ouvrir. Au doigt comme à la souris : c'est le même chemin.
- **Sur un volet de moins de 640 px** — un téléphone, ou un panneau serré sur un
  grand écran — la carte passe au sens **latéral** : les frères s'empilent et on
  défile. L'arbre vertical n'y tient pas, et aucun réglage n'y changerait rien.
- Le nœud choisi ouvre un panneau avec son numéro, son titre et un bouton qui
  ouvre la note **dans un volet à côté** — la carte reste sous les yeux.
- Les exercices, exemples et formulaires ne prennent pas de nœud : ils laissent
  une marque sur leur chapitre (`✏️ 2 exercices`, `🖥 1 exemple`).

Le dossier lu se règle dans les paramètres du plugin (par défaut
`3 Garden/Mon arbre du savoir`).

```bash
npm test      # les règles de numérotation, sur le code réellement livré
npm run build # main.js + styles.css
```

## Comment ça marche

Le nom du fichier porte le numéro et le titre — `4221.E Power Query M`. C'est
la seule source : ni en-tête, ni index, ni configuration. Une note écrite dans
Obsidian entre dans l'arbre au rechargement suivant.

- `src/antinet.ts` — qui est le parent de qui, et dans quel ordre. Le squelette
  à quatre chiffres est **décimal** (`4221 → 4220 → 4200 → 4000`), un maillon
  manquant ne coupe pas la branche, et `.10` se range après `.2`.
- `src/carte.ts` — la liste plate devient l'arbre que Mind Elixir dessine.
- `src/vue.ts` — l'onglet. Les notes se lisent dans l'index d'Obsidian, jamais
  sur le disque : demander l'en-tête par une lecture ouvrirait quatre cents
  fichiers à chaque ouverture.
- `src/styles-carte.css` — le miroir qui fait pousser l'arbre vers le haut.

Deux choses valent d'être sues avant de toucher au code :

- **Mind Elixir est un éditeur.** Il est entièrement bridé ici : la vérité, ce
  sont les fichiers. Un rangement accepté à l'écran et perdu au rechargement
  serait pire qu'une carte figée.
- **Le miroir se pose sur le contenu, pas sur le cadre.** Posé sur le cadre, il
  inverse aussi le déplacement à la souris — mesuré : 120 px de glissement vers
  le bas, 120 px de déplacement vers le haut. Et le recentrage ne peut plus
  venir de la bibliothèque, qui calcule sur des positions ignorant le miroir :
  il se mesure à l'écran.

## État

En service. Vérifié dans un vrai Obsidian, piloté : 429 notes lues, tronc
centré, branches au-dessus, glissement dans le bon sens, dépliages, panneau, et
la note qui s'ouvre dans un volet à côté sans fermer la carte.

⚠️ **Deux pièges de la bibliothèque de cartes**, tous deux invisibles aux tests
logiques et trouvés en pilotant un vrai Obsidian en tactile :

- sa **sélection ne marche pas au doigt** — son gestionnaire abandonne dès que
  son détecteur croit que le pointeur a bougé, ce qui arrive à chaque appui. On
  détecte donc l'appui soi-même, avec une tolérance de 12 px ;
- `expandNode(el, valeur)` **avec** second argument change la donnée **sans
  redessiner** : le nœud passe « déplié » et rien n'apparaît.

⚠️ **Le prix du sens vertical** : il étale l'arbre en largeur, et des titres en
phrases pèsent lourd. Mesuré à trois étages dépliés : 6854 px dans un cadre de
1376 ; titres repliés sur deux ou trois lignes, 4360. On se déplace
latéralement — c'est la contrepartie de la forme d'arbre.

⚠️ Les règles de numérotation sont une **copie** de celles de `vault-outils`.
Le plugin doit rester autonome, mais une règle qui change doit changer **aux
deux endroits**.

## Lien

Note du vault : `4 Tools/Boîte à outils — Mes process en écrans.md` (la carte
équivalente côté boîte à outils).
