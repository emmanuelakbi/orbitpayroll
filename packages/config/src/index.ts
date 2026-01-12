/**
 * OrbitPayroll Configuration Module
 *
 * Provides environment variable validation with fail-fast behavior.
 * Import and call the appropriate config loader at application startup.
 */

export { validateConfig, ConfigValidationError } from './validator';
export { apiConfigSchema, loadApiConfig, type ApiConfig } from './schemas/api';
export { webConfigSchema, loadWebConfig, type WebConfig } from './schemas/web';
export { contractsConfigSchema, loadContractsConfig, type ContractsConfig } from './schemas/contracts';
