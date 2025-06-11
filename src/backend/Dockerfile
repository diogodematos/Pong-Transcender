# src/backend/Dockerfile
FROM node:18-alpine

# Instalar dependências do sistema necessárias para better-sqlite3
RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .
COPY routes/ ./routes/

# Criar diretório para uploads
RUN mkdir -p uploads

# Criar diretório para database
RUN mkdir -p data

# Expor porta
EXPOSE 3001

# Comando para produção
CMD ["node", "index.js"]
