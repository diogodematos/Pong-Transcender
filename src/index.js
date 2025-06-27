import Fastify from "fastify";
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from '@fastify/multipart';
import usersController from "./routes/users-controller.js";
import path from "path";

async function build() {
    const fastify = Fastify({
        logger: true
    });

    // Registar plugins na ordem correta
    await fastify.register(fastifyCors, {
        origin: '*',
    });

    await fastify.register(fastifyWebsocket);

    await fastify.register(fastifyStatic, {
        root: path.join(process.cwd(), 'public'),
        prefix: '/',
    });

    await fastify.register(fastifyMultipart, {
        addToBody: true
    });

    // Registar rotas depois dos plugins
    await fastify.register(usersController, {prefix: '/users'});

    fastify.get('/', async (req, res) => {
        return res.sendFile("index.html");
    });

    return fastify;
}

async function start() {
    try {
        const fastify = await build();
        await fastify.listen({port: 3000, host: '0.0.0.0'});
        console.log('Server listening on port 3000');
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

start();
