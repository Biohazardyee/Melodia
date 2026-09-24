# Messagerie indépendante des abonnements

## Comportement

- Follow et unfollow ne créent, ne suppriment et ne réinitialisent plus de conversation.
- Le bouton Message du profil ouvre volontairement une discussion. Sur le web, la fenêtre Nouvelle conversation propose les abonnements et permet de rechercher tout utilisateur.
- Une nouvelle discussion va directement dans la boîte principale si **le destinataire suit l’expéditeur**. Sinon, l’expéditeur peut envoyer un unique message d’invitation.
- Le destinataire peut accepter ou refuser. Aucun accusé de lecture n’est émis avant acceptation. Seul le destinataire peut revenir sur un refus en rouvrant la discussion depuis le profil.
- L’acceptation est persistante et indépendante des futurs abonnements. Un refus ne supprime pas l’historique et ne peut pas être contourné par un nouveau follow, une réouverture ou la suppression du premier message.
- Les conversations existantes restent acceptées. Les anciennes conversations automatiques vides ne sont pas listées, mais peuvent être rouvertes explicitement. Aucun ancien message n’est supprimé par la migration.
- Sur le web, Retirer de la liste reste un masquage local : cela n’efface pas les messages de l’autre personne. La suppression globale par API est réservée à l’administration.

Le modèle est inspiré des [contrôles de messagerie documentés par Meta](https://about.fb.com/news/2020/09/new-messaging-features-for-instagram/). Ce n’est pas une reproduction de toutes les options Instagram : les comptes adolescents, les paramètres de confidentialité et le blocage global ne sont pas ajoutés ici.

## API et sécurité

- `POST /conversations` : `user2_id` désigne le destinataire ; l’expéditeur est extrait du JWT, pas du corps fourni par le client. Réouverture idempotente d’une paire canonique, avec reprise en cas de concurrence.
- `PATCH /conversations/:id/request` : `{ "action": "accept" }` ou `decline`, réservé au destinataire.
- La liste inclut `status`, `initiated_by` et `invitation_sent`. `?include=<id>` permet d’afficher un brouillon ouvert explicitement, **toujours avec contrôle des participants**.
- Les lectures privées et le marquage lu sont contrôlés. REST et Socket.IO utilisent la même politique d’envoi. Un verrou de ligne dans une transaction sérialise les invitations et leur acceptation.
- Événement `conversation_updated` lors des décisions ; `send_message` propose un accusé technique `{ok}`. Le texte reste dans l’éditeur si l’envoi n’est pas confirmé.

## Déploiement

La migration `20260912120000_independent_message_requests` ajoute trois colonnes et un enum sans supprimer de données. Elle n’a **pas été exécutée sur la base de l’utilisateur**.

Avec Docker Compose, depuis la racine du dépôt :

```sh
docker compose build api frontend
docker compose run --rm --no-deps api npx prisma migrate deploy
docker compose up -d api frontend
```

La base doit déjà être disponible. Vérifier la sauvegarde habituelle et les migrations précédemment en attente avant `migrate deploy`, qui applique toutes les migrations en attente. Le Dockerfile embarque désormais `prisma.config.ts`, nécessaire à la commande Prisma 7. Ne démarrer le nouveau serveur qu’après une migration réussie.

Hors Docker : depuis `backend`, utiliser `npx prisma migrate deploy`, puis `npx prisma generate` et reconstruire/redémarrer les applications.

## Vérification

- Tests avec Prisma simulé, sans accès à une base : `cd backend` puis `node --import tsx --test test/conversations.test.mjs`.
- Build TypeScript backend et contrôles TypeScript web/mobile ; build Vite web.
- Essai navigateur isolé via `clients/web/scripts/preview-fixtures.mjs` : séparation des boîtes, acceptation puis réponse, recherche d’un utilisateur non suivi, première invitation puis blocage du second envoi.
- Cet aperçu utilise uniquement des messages en mémoire ; il ne remplace pas un essai multi-comptes après migration sur une base de développement.
