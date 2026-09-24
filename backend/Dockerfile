# =======================
#        BUILDER
# =======================
FROM node:20-alpine AS builder

WORKDIR /app

# Installer les dépendances
COPY package.json package-lock.json ./
RUN npm install

# Copier le reste du code
COPY . .

# Générer le client Prisma (OBLIGATOIRE)
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# =======================
#       PRODUCTION
# =======================
FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

# Copier uniquement ce qui est nécessaire
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/views ./dist/views

EXPOSE 3000
CMD ["node", "dist/bin/www.js"]
