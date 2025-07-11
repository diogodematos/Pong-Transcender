# Usamos node:20-slim, que é baseada em Debian, para garantir compatibilidade com better-sqlite3 e ser LTS
FROM node:20-slim

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia package.json e package-lock.json primeiro para otimizar o cache da build do Docker
COPY package*.json ./

# Instala as dependências do sistema necessárias para compilar better-sqlite3 e outros módulos nativos.
# Usamos apt-get para imagens baseadas em Debian (como 'slim').
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    sqlite3 \
    libsqlite3-dev \
    curl \
    # Limpa os caches do apt para reduzir o tamanho final da imagem
    && rm -rf /var/lib/apt/lists/*

# Limpa o cache do npm e instala as dependências do Node.js de forma limpa
RUN npm cache clean --force && npm ci

COPY . .

RUN mkdir -p uploads

EXPOSE 8000

# Comando para iniciar a aplicação quando o contêiner for executado
CMD ["node", "index.js"]