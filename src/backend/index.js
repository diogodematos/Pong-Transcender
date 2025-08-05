import Fastify from "fastify";
   import fastifyHelmet from "@fastify/helmet";
   import fastifyWebsocket from '@fastify/websocket';
   import fastifyCors from "@fastify/cors";
   import fastifyStatic from "@fastify/static";
   import fastifyMultipart from '@fastify/multipart';
   import fastifyJwt from '@fastify/jwt';
   import usersController from "./routes/users-controller.js";
   import tournamentController from "./routes/tournament-controller.js";
   import gameController from "./routes/game-controller.js"; // Added
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
           'http://localhost',
           'https://localhost',
           'http://localhost:3000',
           'https://pokepong.42.fr',
           process.env.FRONTEND_URL,
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
       await fastify.register(gameController, { prefix: '/api/game' }); // Added

       // 3. Static File Service (only for uploads)
       await fastify.register(fastifyStatic, {
           root: path.join(process.cwd(), 'uploads'),
           prefix: '/uploads/',
           decorateReply: false,
       });

       // 4. Basic Routes (Health Check, Root Route)
       fastify.get('/', async (req, res) => {
           return {
               message: 'Pong Transcender API',
               version: '1.0.0',
               endpoints: ['/api/users', '/api/tournaments', '/api/game', '/health', '/uploads/*']
           };
       });

       fastify.get('/health', async (req, res) => {
           return { status: 'ok', timestamp: new Date().toISOString() };
       });

       return fastify;
   }

   async function start() {
       try {
           const fastify = await build();
           const port = process.env.PORT || 8000;
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