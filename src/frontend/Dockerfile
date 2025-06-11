# Development build
FROM node:18-alpine
WORKDIR /app

# Copiar package files
COPY package*.json ./
# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Expor porta para Vite dev server
EXPOSE 3000

# Comando para iniciar servidor de desenvolvimento
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
