import Fastify from "fastify";
import fastifyHelmet from "@fastify/helmet";
import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from '@fastify/multipart';
import usersController from "./routes/users-controller.js";
import path from "path";

const fastify = Fastify({
	logger: true
});

// Configuração de CORS - ajustado para Docker
const allowedOrigins = [
	'http://localhost:8080',
	'http://localhost:3000',
	'http://frontend:3000', // Nome do serviço Docker
	'http://nginx:80',      // Nome do serviço nginx
	process.env.FRONTEND_URL || 'http://localhost:8080'
];

fastify.register(fastifyCors, {
	origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
	methods: ['GET', 'POST', 'PUT', 'DELETE'],
	allowedHeaders: ['Content-Type', 'Authorization'],
});

// Registrar helmet (remover em desenvolvimento se causar problemas)
if (process.env.NODE_ENV === 'production') {
	fastify.register(fastifyHelmet);
}

// Servir arquivos estáticos (remover esta parte pois agora é só API)
// fastify.register(fastifyStatic, {
//	root: path.join(process.cwd(), 'public'),
//	prefix: '/',
// });

// Registrar plugin de multipart
fastify.register(fastifyMultipart, {
	addToBody: true,
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB
	}
});

// Registrar rotas
fastify.register(usersController, {prefix: '/api/users'});

// Servir uploads
fastify.register(fastifyStatic, {
	root: path.join(process.cwd(), 'uploads'),
	prefix: '/uploads/',
}, (err) => {
	if (err) console.log('Error serving uploads:', err);
});

// Rota principal (API info)
fastify.get('/', async (req, res) => {
	return { 
		message: 'Pong Transcender API', 
		version: '1.0.0',
		endpoints: ['/api/users', '/health']
	};
});

// Health check endpoint
fastify.get('/health', async (req, res) => {
	return { status: 'ok', timestamp: new Date().toISOString() };
});

// Configuração do servidor
const start = async () => {
	try {
		const port = process.env.PORT || 3001; // Mudança de porta para não conflitar
		const host = process.env.HOST || '0.0.0.0';
		
		await fastify.listen({ 
			port: parseInt(port), 
			host: host 
		});
		
		fastify.log.info(`Server listening on ${host}:${port}`);
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();
