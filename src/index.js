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

// const allowedOrigins = [
// 	'http://10.11.243.25:8080',
// 	'http://10.12.243.25:8080',
// 	'http://10.12.243.25:3000',
// 	'http://localhost:8080',
// 	'http://localhost:3000'
// 	// adicionar mais se necessário
//   ];
  
fastify.register(fastifyCors, {
	origin: '*',
	// origin: (origin, cb) => {
	// 	if (!origin) return cb(null, false);
	// 	if (allowedOrigins.includes(origin)) {
	// 		cb(null, true);
	// 	} else {
	// 		cb(new Error("Not allowed by CORS"));
	// 	}
	// },
	// methods: ['GET', 'POST'],
	// allowedHeaders: ['Content-Type', 'Authorization'],
});

fastify.register(fastifyStatic, {
	root: path.join(process.cwd(), 'public'),
	prefix: '/', // optional: default '/'
});

// Registra o plugin de multipart
fastify.register(fastifyMultipart, {
	addToBody: true
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

