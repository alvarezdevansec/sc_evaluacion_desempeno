
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';

import { config } from './config.js';
import { pool } from './db/pool.js';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';

import type { GraphQLContext } from './auth/auth.types.js';
import { evaluacionesService } from './modules/evaluaciones/evaluaciones.service.js';

const app = express();

app.use(cors({
  origin: config.corsOrigin,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'OPTIONS'],
}));

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');

    res.status(200).json({
      status: 'ok',
      database: 'connected',
    });
  } catch (error) {
    console.error('ERROR EN HEALTH CHECK:', error);

    res.status(503).json({
      status: 'error',
      database: 'unavailable',
    });
  }
});


const apollo = new ApolloServer<GraphQLContext>({
  typeDefs,
  resolvers,
});

await apollo.start();

app.use(
  '/graphql',
  express.json({ limit: '1mb' }),
  expressMiddleware(apollo, {
    context: async ({ req }): Promise<GraphQLContext> => {
      const authorization = req.headers.authorization;

      // Permite consultas públicas, como la carga inicial
      // del perfil mediante el token de la URL.
      if (!authorization) {
        return {
          user: null,
          token: null,
        };
      }

      const partes = authorization.trim().split(/\s+/);

      if (
        partes.length !== 2 ||
        partes[0].toLowerCase() !== 'bearer' ||
        !partes[1]
      ) {
        throw new Error('El encabezado de autorización no es válido.');
      }

      const token = partes[1];

      const servidor =
        await evaluacionesService.obtenerServidorPorToken(token);

      if (!servidor) {
        throw new Error('Token de acceso inválido.');
      }

      return {
        user: {
          idServidorPublico: servidor.idServidorPublico,
          idInstitucion: servidor.idInstitucion,
          idEnlace: servidor.idEnlace,
          idEvaluador: servidor.idEvaluador,
        },
        token,
      };
    },
  }),
);


const httpServer = app.listen(config.port, () => {
  console.info(
    `GraphQL API disponible en http://localhost:${config.port}/graphql`,
  );
});

async function shutdown(signal: string): Promise<void> {
  console.info(`Recibida señal ${signal}. Cerrando servidor...`);

  try {
    await apollo.stop();

    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    await pool.end();

    console.info('Servidor y conexiones cerrados correctamente.');
    process.exit(0);
  } catch (error) {
    console.error('ERROR AL CERRAR EL SERVIDOR:', error);
    process.exit(1);
  }
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
