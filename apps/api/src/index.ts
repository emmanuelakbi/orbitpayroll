/**
 * OrbitPayroll API Server Entry Point
 *
 * This module initializes and starts the Express server with proper
 * configuration, database connection, and graceful shutdown handling.
 *
 * @module index
 */

import 'dotenv/config';
import { createApp } from './app.js';
import { loadApiConfig } from '@orbitpayroll/config';
import { logger } from './lib/logger.js';
import { connectDatabase, disconnectDatabase } from './lib/db.js';

/**
 * Main entry point for the OrbitPayroll API server.
 * Initializes configuration, database connection, and starts the HTTP server.
 *
 * @returns Promise that resolves when server is started
 */
async function main(): Promise<void> {
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

    /**
     * Handles graceful shutdown of the server.
     * Closes HTTP connections and disconnects from database.
     *
     * @param signal - The signal that triggered shutdown (SIGTERM or SIGINT)
     */
    const shutdown = (signal: string): void => {
      logger.info({ signal }, 'Shutdown signal received');
      server.close(() => {
        void disconnectDatabase().then(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }
}

void main();
