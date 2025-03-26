const fastify = require('fastify')();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');

// Conectar ao banco de dados SQLite
const db = new sqlite3.Database('./pong_game.db', (err) => {
    if (err) {
        console.error("Erro ao conectar ao banco de dados:", err);
    } else {
        console.log("Conectado ao banco de dados SQLite");
    }
});

// Promisificar a execução do db.get() e db.run()
function getUserByUsername(username) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
}

function getUserByEmail(email) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
}

function insertUser(username, password, email) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', [username, password, email], function (err) {
            if (err) reject(err);
            resolve(this.lastID);
        });
    });
}

// Função para validar a senha
function validatePassword(password) {
    const passwordRegex = /^(?=(.*[a-z]){1})(?=(.*[A-Z]){1})(?=(.*\d){1})(?=(.*[a-zA-Z\d]){7})/;
    return passwordRegex.test(password);
}

const bcrypt = require('bcrypt');

// Registrar o novo usuário com hash de senha
fastify.post('/register', async (request, reply) => {
    const { username, password, email } = request.body;

    if (!username || !password || !email) {
        return reply.status(400).send({ error: "Nome de usuário, senha e email são necessários!" });
    }

    if (!validatePassword(password)) {
        return reply.status(400).send({ error: "A senha deve conter pelo menos 1 letra maiúscula, 1 minúscula e 1 dígito!" });
    }

    try {
        // Verificar se o nome de usuário já existe
        const userExists = await getUserByUsername(username);
        if (userExists) {
            return reply.status(400).send({ error: "Nome de usuário já está em uso!" });
        }

        const emailExists = await getUserByEmail(email);
        if (emailExists) {
            return reply.status(400).send({ error: "Email de usuário já está em uso!" });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Inserir o novo usuário no banco de dados
        const userId = await insertUser(username, hashedPassword, email);
        reply.status(201).send({ id: userId, username });
    } catch (err) {
        return reply.status(500).send({ error: "Erro ao registrar usuário: " + err.message });
    }
});

// Rota para login com comparação de senha (usando bcrypt)
fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body;

    if (!username || !password) {
        return reply.status(400).send({ error: "Nome de usuário e senha são necessários!" });
    }

    try {
        const user = await getUserByUsername(username);
        if (!user) {
            return reply.status(401).send({ error: "Usuário não encontrado!" });
        }

        // Comparar a senha fornecida com o hash armazenado
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (passwordMatch) {
            const token = jwt.sign({ username }, 'segredo_super_secreto', { expiresIn: '1h' });
            return reply.send({ message: "Login bem-sucedido!", token });
        } else {
            return reply.status(401).send({ error: "Senha incorreta!" });
        }
    } catch (err) {
        return reply.status(500).send({ error: "Erro ao fazer login: " + err.message });
    }
});

// Servindo arquivos estáticos
fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, 'public'),
});

// Configurar CORS
const fastifyCors = require('@fastify/cors');
fastify.register(fastifyCors, {
    origin: 'http://localhost:8080', // Permitir requisições apenas de http://localhost:8080
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
});

// Rota para servir o frontend
fastify.get('/', async (request, reply) => {
    return reply.sendFile('index.html'); // Isso vai servir o arquivo index.html como página principal
});

// Iniciar o servidor
fastify.listen({ port: 3000, host: '127.0.0.1' }).then((address) => {
    console.log(`Servidor Fastify rodando em ${address}`);
}).catch((err) => {
    console.error(err);
    process.exit(1);
});