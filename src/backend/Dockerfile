# src/backend/Dockerfile
# Usamos node:18-slim, que é baseada em Debian, para garantir compatibilidade com better-sqlite3
FROM node:18-slim

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia package.json e package-lock.json primeiro para otimizar o cache da build do Docker
COPY package*.json ./

# Instala as dependências do sistema necessárias para compilar melhor-sqlite3 e outros módulos nativos.
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

# Limpa o cache do npm e força a reinstalação das dependências.
# Isto garante que os módulos nativos (como better-sqlite3) são compilados contra a versão
# correta do Node.js dentro deste contêiner, resolvendo o erro NODE_MODULE_VERSION.
RUN npm cache clean --force && rm -rf node_modules && npm ci --only=production

# Copia o restante do código fonte da aplicação para o contêiner
# Deve ser feito *depois* da instalação dos node_modules para alavancar o cache da build do Docker.
COPY . .

# A linha COPY routes/ ./routes/ é redundante se COPY . . já cobre tudo,
# a menos que tenha um .dockerignore que exclua a pasta routes (o que não é comum).
# Se não tiver um .dockerignore a excluir 'routes', pode remover a linha abaixo.
COPY routes/ ./routes/

# Cria diretórios para dados persistentes (uploads e database) se ainda não existirem.
# Estes serão preenchidos pelos volumes definidos no docker-compose.yml.
RUN mkdir -p uploads
RUN mkdir -p data

# Expõe a porta em que a aplicação Fastify irá ouvir dentro do contêiner.
# IMPORTANTE: Isto deve corresponder à variável de ambiente PORT no seu docker-compose.yml
# para o serviço 'backend', que está definida como 8000.
EXPOSE 8000

# Comando para iniciar a aplicação quando o contêiner for executado
CMD ["node", "index.js"]
