# Découpage des pages Profil, Album et Paramètres

Le chantier du 25 septembre 2026 extrait 16 composants d'affichage et quatre hooks métier. Les pages composent ces sections et conservent l'état partagé nécessaire à la navigation entre onglets.

| Page | Avant ce chantier | Après | Responsabilités extraites |
| --- | ---: | ---: | --- |
| Profil | 1 927 lignes | 850 lignes | En-tête, playlists et leur détail, badges, activité, fenêtres de cosmétiques et de participants aux relations de suivi |
| Album | 1 646 lignes | 631 lignes | Formulaire d'avis, avis et réponses, albums similaires, ajout à une playlist, signalement |
| Paramètres | 1 028 lignes | 332 lignes | Panneaux Profil, Sécurité, Connexions et Données |

## Organisation

- `clients/web/src/components/profile/` : les sept sections du profil.
- `clients/web/src/components/album/` : les cinq sections de la fiche album.
- `clients/web/src/components/settings/` : les quatre panneaux des paramètres.
- `useProfileCosmetics` : catalogue, sélection et équipement des cosmétiques, avec les événements de mise à jour du profil existants.
- `useAlbumReviews` : chargement, publication, édition, likes et réponses aux avis.
- `useAccountSecurity` : changement de mot de passe, configuration 2FA et codes de secours.
- `useSpotifyConnection` : statut du compte Spotify, liaison/déliaison et traitement du retour OAuth.

Les hooks restent appelés par les pages, avant leurs retours conditionnels. Un changement d'onglet ne réinitialise donc pas les saisies des paramètres ou des avis. Les panneaux de sécurité et de connexion utilisent le type de retour de leur hook pour éviter la duplication de leurs contrats. Les autres sections exposent des propriétés explicites ; les structures API historiquement typées `any` n'ont pas fait l'objet d'une refonte complète.

La sauvegarde du profil et le changement de mot de passe ont maintenant chacun leur état de chargement. La recherche de l'artiste préféré utilise des paramètres encodés et annule les anciennes requêtes, ainsi que le délai de recherche à la fermeture de la page.

## Validation

- Vérification TypeScript web réussie, y compris les contrôles d'importations et variables inutilisées.
- Compilation Vite de production réussie. Les avertissements déjà présents sur la taille du fichier principal et les données Browserslist persistent. Ce chantier vise la maintenance ; il ne prétend pas réduire le poids total téléchargé.
- Deux tests existants du retour de navigation réussis.
- Recette navigateur sur l'API locale fictive : maintien du formulaire Profil après changement d'onglet, quatre panneaux de paramètres, retour Spotify ouvrant Connexions et nettoyant le paramètre d'URL, ouverture/fermeture des cosmétiques, liste et détail des playlists, accès à une fiche album, édition/annulation d'avis, refus d'un titre vide, affichage des réponses imbriquées, fenêtre de choix de playlist et état vide des albums similaires.
- L'aperçu local contient désormais deux avis et une réponse imbriquée pour reproduire ces contrôles. Aucun compte Spotify réel ni identifiant de sécurité n'a été modifié pendant la recette.

Les commandes de vérification, depuis `clients/web`, sont :

```sh
node ../../backend/node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node --test scripts/navigation.test.mjs
npm run build
```

Pour la recette locale : `node scripts/preview-fixtures.mjs`, puis ouvrir `http://127.0.0.1:5174` et utiliser le compte fictif `demo@example.test` / `demo`. Arrêter ce serveur après utilisation. Les écritures non implémentées par les fixtures sont refusées.
