/**
 * OrbitPayroll API Server Entry Point
 */

import 'dotenv/config';
import { createApp } from './app.js';
import { loadApiConfig } from '@orbitpayroll/config';
import { logger } from './lib/logger.js';
import { connectDatabase, disconnectDatabase } from './lib/db.js';

async function main() {
  try {
    // Load and validate configuration
    const config = loadApiConfig();

    // Connect to database
    await connectDatabase();

    // Create Express application
    const app = createApp(config);

    // Start server
    const server = app.listen(config.PORT, config.HOST, () => {
      logger.info(
        { port: config.PORT, host: config.HOST, env: config.NODE_ENV },
        'OrbitPayroll API server started'
      );
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutdown signal received');
      server.close(async () => {
        await disconnectDatabase();
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }
}

main();
