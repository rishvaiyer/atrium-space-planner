FROM node:22-alpine
RUN npm install -g serve@14
COPY dist /app
WORKDIR /app
CMD ["sh", "-c", "serve -s . -l tcp://0.0.0.0:${PORT:-8080}"]
