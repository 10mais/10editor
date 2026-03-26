# ── Base image com Node 20 ──────────────────────────────────
FROM node:20-bookworm-slim

# Instala FFmpeg + dependências do Chrome (Remotion headless)
RUN apt-get update && apt-get install -y \
  ffmpeg \
  chromium \
  fonts-liberation \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libpango-1.0-0 \
  libcairo2 \
  && rm -rf /var/lib/apt/lists/*

# Diz ao Remotion para usar o Chromium do sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV REMOTION_CHROME_EXECUTABLE=/usr/bin/chromium

WORKDIR /app

# Copia dependências e instala
COPY package*.json ./
RUN npm ci --omit=dev || npm install

# Copia código fonte
COPY . .

# Cria pastas necessárias
RUN mkdir -p out uploads public

# Porta padrão
ENV PORT=3333
EXPOSE 3333

# Inicia o servidor web
CMD ["npx", "ts-node", "src/server.ts"]
