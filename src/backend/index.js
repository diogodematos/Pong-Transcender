import Fastify from "fastify";
import fastifyHelmet from "@fastify/helmet";
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from '@fastify/multipart';
import fastifyJwt from '@fastify/jwt';
import usersController from "./routes/users-controller.js";
import tournamentController from "./routes/tournament-controller.js";
import path from "path";
import 'dotenv/config';


async function build() {
    const fastify = Fastify({
        logger: true,
        bodyLimit: 1048576, // Request body limit (1MB)
    });
    
    await fastify.register(fastifyWebsocket);
    // 1. Security and Utility Configurations
    const allowedOrigins = [
        'http://localhost', // Allow access from localhost (no explicit port if Nginx redirects)
        'https://localhost', // HTTPS access via Nginx
        'http://localhost:3000', // Frontend Vite dev server (if accessed directly, less common with Nginx)
        'https://pokepong.42.fr', // Your domain
        process.env.FRONTEND_URL, // Environment variable for frontend URL in production
    ].filter(Boolean);

    fastify.register(fastifyCors, {
        origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    if (process.env.NODE_ENV === 'production') {
        await fastify.register(fastifyHelmet);
    }

    await fastify.register(fastifyMultipart, {
        addToBody: false,
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB file limit
        }
    });


    if (!process.env.JWT_SECRET) {
        fastify.log.error("JWT_SECRET environment variable is not set. Please set it for security.");
    }
    await fastify.register(fastifyJwt, {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-dev',
    });

    fastify.decorate('authenticate', async function (request, reply) {
        try {
            await request.jwtVerify();
        } catch (err) {
            reply.status(401).send({ error: 'Unauthorized', details: err.message });
        }
    });

    // 2. Route Registration (APIs)
    await fastify.register(usersController, { prefix: '/api/users' });
    await fastify.register(tournamentController, { prefix: '/api/tournaments' });

    // 3. Static File Service (only for uploads)
    // Serve files from 'uploads' (e.g., avatars)
    await fastify.register(fastifyStatic, {
        root: path.join(process.cwd(), 'uploads'),
        prefix: '/uploads/',
        decorateReply: false,
    });

    // --- IMPORTANT: REMOVE THE FASTIFY STATIC FOR 'PUBLIC' ---
    // The frontend container (Vite) will serve the frontend files.
    // So, this block is removed from the backend:
    /*
    await fastify.register(fastifyStatic, {
        root: path.join(process.cwd(), 'public'),
        prefix: '/',
        wildcard: false,
        preCompressed: true,
        setHeaders: (res, path, stat) => { ... },
        rewriteRequest: (req) => { ... }
    });
    */

    // 4. Basic Routes (Health Check, Root Route)
    fastify.get('/', async (req, res) => {
        return {
            message: 'Pong Transcender API',
            version: '1.0.0',
            endpoints: ['/api/users', '/api/tournaments', '/health', '/uploads/*']
        };
    });

    fastify.get('/health', async (req, res) => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });

    return fastify;
}

/**
 * Starts the Fastify server.
 */
async function start() {
    try {
        const fastify = await build();
        const port = process.env.PORT || 8000; // Backend listens on 8000
        const host = process.env.HOST || '0.0.0.0';

        await fastify.listen({
            port: parseInt(port),
            host: host
        });

        fastify.log.info(`Server listening on ${host}:${port}`);
        console.log("Database tables (users, scores, friends, games) created/checked successfully");
    } catch (err) {
        console.error("Server failed to start:", err);
        process.exit(1);
    }
}

start();