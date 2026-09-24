# Refonte web de Melodia — 11 septembre 2026

## Périmètre et architecture

Le dépôt réunit le client web React/Vite, le client mobile Expo/React Native et une API Express/Prisma/PostgreSQL partagée. Le web gère la découverte musicale, les fiches d'albums et critiques, les playlists, les profils et cosmétiques, les statistiques, le fil social, la messagerie, les notifications, l'administration et les salons d'écoute Spotify. Les intégrations musicales et le temps réel restent à la charge des services existants.

Cette livraison modernise le **site web**, pas les écrans natifs Expo. Elle ne change ni les migrations, ni les dépendances, ni les secrets, ni le déploiement. La seule modification API concerne le statut HTTP de l'accès à un salon privé sans mot de passe. Aucun commit ou push n'est effectué.

## Direction visuelle et réalisation

- Palette partagée encre/lavande, surfaces neutres, bordures et contrastes unifiés. Les thèmes clair, sombre, Cramoisi et Givre utilisent des variables communes.
- Navigation latérale permanente sur grand écran, panneau mobile avec focus clavier, fermeture par Échap et restitution du focus.
- En-tête responsive, boutons accessibles, pied de page avec de vrais liens.
- Accueil public recomposé autour de la marque, des albums et des fonctions existantes.
- Exploration plus compacte pour exposer rapidement recherche et résultats.
- Cartes albums et playlists harmonisées, titres lisibles, nouveaux états vides et d'erreur.
- Catégories de boutique accessibles par ancres, grille adaptée à la largeur disponible.
- Profil plus compact ; surfaces des paramètres, statistiques, activités, messagerie, salons et administration harmonisées.
- Fiche album intégrée à la navigation commune ; la messagerie occupe la hauteur disponible sans pied de page supplémentaire.
- Animations limitées lorsque le système demande une réduction des mouvements.
- 29 nouveaux libellés disponibles dans les cinq langues du site.

Attention : convention historique préservée, la classe HTML `dark` représente le thème **clair**. Ne pas inverser cette convention isolément.

## Corrections et améliorations

1. Le composant Button utilisait mal la prop className : les styles fournis par les pages sont maintenant appliqués.
2. Les labels du composant Input sont reliés à leur champ par un identifiant stable.
3. Les cartes albums utilisent un seul lien de navigation. Les paramètres d'identification de la recherche sont conservés.
4. CoverImage affiche un skeleton par source, avec chargement différé et image de remplacement.
5. La recherche est pilotée par l'URL : lancer une nouvelle recherche globale depuis la page déjà ouverte fonctionne, et le retour navigateur retrouve la recherche.
6. Les requêtes précédentes sont annulées ; une réponse ancienne ne remplace plus la recherche courante.
7. Le tri Pertinence restitue l'ordre original après un tri alphabétique ou par note. Le tri n'altère pas les données stockées.
8. La recherche globale annule ses requêtes et son délai au changement de saisie ou au démontage. Elle est utilisable au clavier et ne dépasse plus la largeur du téléphone.
9. L'accès à un salon privé sans mot de passe renvoie 403 et non 401. Le client affiche la demande de mot de passe sans déclencher l'intercepteur de déconnexion. Les vrais 401 de session restent inchangés.
10. Une incompatibilité TypeScript préexistante dans le callback d'actualisation du fil a été corrigée.
11. Les routes sont chargées à la demande ; une page 404 et un état de chargement sont fournis.
12. Les éléments flex dans les contours cosmétiques conservent leur alignement au lieu d'être forcés en bloc.

## Vérifications effectuées

### Automatiques

- Compilation Vite de production réussie.
- Vérification TypeScript web sans émission réussie, en utilisant le compilateur déjà installé dans backend.
- Compilation TypeScript backend réussie.
- Parité des 29 nouvelles traductions sur FR/EN/ES/DE/IT vérifiée.
- Vérification des espaces et erreurs de patch avec git diff --check.

La compilation signale encore des chunks supérieurs à 500 ko (socle et messagerie/emoji). Le découpage par route réduit le JavaScript initial, mais ne constitue pas une mesure de performance réseau réelle. Le catalogue Browserslist local est ancien ; aucune dépendance n'a été mise à jour pour ce chantier.

### Navigateur avec données fictives locales

Contrôles visuels et de rendu : accueil, exploration, boutique, bibliothèque, détail de playlist, fiche album, profil, statistiques, paramètres, fil vide, notifications vides, messagerie vide et administration. Cas particuliers : accès à un salon, confirmation de participation, écran mot de passe et route 404.

Parcours exercés :
- recherche avec résultats, sans résultats et avec erreur ;
- deux recherches successives dont la première répond plus lentement ;
- tri par note puis retour à la pertinence ;
- recherche globale depuis une exploration déjà ouverte ;
- navigation vers la fiche album avec ses paramètres ;
- compteur de playlist affiché une seule fois ;
- refus 403 d'un salon sans déconnexion de l'interface ;
- traduction anglaise des catégories et produits de boutique ;
- activation des thèmes clair, Cramoisi et Givre avec possession fictive ;
- recherche globale et menu en viewport 390 × 844 ;
- cycle clavier dans le menu mobile, fermeture Échap, focus rendu au bouton ;
- absence de débordement horizontal sur les surfaces mobiles contrôlées.

Ces vérifications n'utilisent pas la base de production. Elles ne valident pas la lecture audio Spotify réelle, les achats, OAuth, les mails, la synchronisation multiutilisateur ou tous les états de chaque formulaire. Une recette connectée avec des comptes de test Spotify Premium reste nécessaire pour ces intégrations ; le moteur de lecture n'a pas été modifié.

### Reproduire l'aperçu sans données réelles

Depuis clients/web, lancer `node scripts/preview-fixtures.mjs` avec Node 25 (version utilisée pour la recette). Il écoute uniquement sur 127.0.0.1:5174 et ne lit pas les fichiers .env. Connexion fictive : demo@example.test / demo.

Les recherches `empty`, `error`, `slow` et `fast` exposent les scénarios dédiés. Les écritures non simulées renvoient 405. Les refus d'accès aux salons sont intentionnels dans cet aperçu. Les données sont en mémoire et les pochettes géométriques portent la mention DEMO. Le script n'est importé par aucune page et ne fait pas partie de la compilation de production. Ne pas le déployer comme API.

## Idées à ajouter, par priorité proposée

### 1. Clubs d'écoute et album de la semaine — meilleur prochain gros chantier

Des groupes persistants autour d'un genre ou d'un cercle d'amis : proposition d'albums, vote hebdomadaire, date d'écoute, salon associé et discussion après la session. Cela donne aux salons existants une raison de revenir, avec un historique collectif.

MVP : créer/rejoindre un club, proposer un album, voter, choisir l'album de la semaine et ouvrir son salon. Ensuite seulement : événements récurrents, rôles, modération et archives.

### 2. Journal musical personnel

Une chronologie des albums écoutés, avec date, humeur, note et petite anecdote. Distinguer les écoutes déclarées des écoutes réellement importées pour éviter de présenter des statistiques inventées.

### 3. Bilan mensuel partageable

Artistes et albums marquants, découvertes, critiques préférées et évolution des goûts. Reprendre les données réellement disponibles, sans annoncer de minutes écoutées si elles ne sont pas mesurées.

### 4. Affinités musicales entre membres

Albums favoris communs, goûts divergents et suggestions de profils. Expliquer le score et laisser l'utilisateur choisir si cette comparaison est publique.

### 5. Liste « à découvrir » enrichie

Pourquoi un album a été enregistré, qui l'a conseillé, priorité et rappel facultatif. Un bouton « choisir mon prochain album » peut sélectionner dans cette liste selon quelques critères simples.

### 6. Sessions programmées

Créer un événement d'écoute avec horaire, inscriptions et rappel opt-in. Le salon s'ouvre au moment prévu ; les utilisateurs retrouvent les prochaines sessions dans un agenda.

### 7. File d'attente collaborative avancée

Vote pour le prochain morceau, limites par participant, rôle DJ et historique des titres. Prévoir une protection contre le spam et un arbitrage clair de l'hôte.

### 8. Blind tests multijoueurs

Manches, scores et classement d'une session. Valider d'abord les contraintes de diffusion et les possibilités des fournisseurs audio ; ne pas supposer que le SDK Spotify permet n'importe quel usage ludique.

### 9. Recommandations expliquées

Au lieu d'un simple catalogue, afficher « proposé parce que vous avez aimé… », avec possibilité de masquer un artiste ou de préciser ce qui plaît. Commencer avec les favoris, genres et relations déjà disponibles.

### 10. Collections éditoriales

Guides créés par la communauté : découvrir un genre, une discographie ou une scène locale, avec un ordre d'écoute et de courtes annotations. Les playlists existantes peuvent servir de fondation.

### 11. Recherche globale approfondie

Un écran unifié utilisateurs/albums/playlists/salons, avec filtres, historique local optionnel et navigation clavier. Conserver la recherche rapide de l'en-tête comme accès léger.

### 12. PWA et consultation hors connexion

Installation du site et accès hors ligne à des listes récemment consultées. Ne pas promettre la lecture Spotify hors ligne dans le navigateur.

## Suite technique utile

Avant d'ajouter une très grosse fonctionnalité : renforcer les tests de navigation et de salons, mesurer le chargement réel, isoler davantage le sélecteur d'emoji et traiter séparément les grands composants de profil, album et paramètres. Les salons méritent notamment une recette à deux comptes et deux onglets, avec changements de route, reconnexions et fin de piste.
