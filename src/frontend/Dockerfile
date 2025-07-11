# Development build
FROM node:20-alpine
WORKDIR /app

# Instalar dependências do sistema necessárias para compilação (para módulos nativos como o Rollup)
# 'build-base' fornece ferramentas essenciais como gcc, g++, make, etc.
RUN apk update && apk add --no-cache build-base && rm -rf /var/cache/apk/*

# Copiar package files
COPY package*.json ./
# Instalar dependências do Node.js
RUN npm ci

# Copiar código fonte
COPY . .

# Expor porta para Vite dev server
EXPOSE 3000

# Comando para iniciar servidor de desenvolvimento
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]