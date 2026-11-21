FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
COPY public ./public
COPY test ./test
COPY index.html tsconfig*.json vite.config.ts .oxlintrc.json ./
RUN npm run lint && node --experimental-strip-types --test test/*.test.mjs && npm run test:accuracy && npm run build

FROM node:22-alpine
RUN npm install -g serve@14
WORKDIR /app
COPY --from=build /app/dist .
ENV PORT=8080
CMD ["sh", "-c", "serve -s . -l tcp://0.0.0.0:${PORT}"]
