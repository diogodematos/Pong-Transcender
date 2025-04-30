import Fastify from "fastify";
import fastifyHelmet from "@fastify/helmet";
import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import usersController from "./routes/users-controller.js";
import path from "path";
// import { OAuth2Client } from 'google-auth-library';

// const googleClient = new OAuth2Client('188335469204-dff0bjf48ubspckenk92t6730ade1o0i.apps.googleusercontent.com');

const fastify = Fastify({
	logger: true
});

//fastify.register(fastifyHelmet, {global: true});

// fastify.register(fastifyCors, {
//     origin: 'http://10.11.243.25:8080', // Permitir requisições apenas de http://localhost:8080
//     methods: ['GET', 'POST'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
// });

const allowedOrigins = [
	'http://10.11.243.25:8080',
	'http://10.12.243.25:8080',
	// adicionar mais se necessário
  ];
  
fastify.register(fastifyCors, {
	origin: (origin, cb) => {
		if (!origin) return cb(null, false);
		if (allowedOrigins.includes(origin)) {
			cb(null, true);
		} else {
			cb(new Error("Not allowed by CORS"));
		}
	},
	methods: ['GET', 'POST'],
	allowedHeaders: ['Content-Type', 'Authorization'],
});

fastify.register(fastifyStatic, {
	root: path.join(process.cwd(), 'public'),
	prefix: '/', // optional: default '/'
});

fastify.register(usersController, {prefix: '/users'});

fastify.get('/', async (req, res) => {
	return res.sendFile("index.html");
});

try {
	fastify.listen({port: 3000, host: '0.0.0.0'})
} catch(err) {
	fastify.log.error(err);
	process.exit(1);
}

