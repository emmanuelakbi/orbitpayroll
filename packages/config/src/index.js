"use strict";
/**
 * OrbitPayroll Configuration Module
 *
 * Provides environment variable validation with fail-fast behavior.
 * Import and call the appropriate config loader at application startup.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadContractsConfig = exports.contractsConfigSchema = exports.loadWebConfig = exports.webConfigSchema = exports.loadApiConfig = exports.apiConfigSchema = exports.ConfigValidationError = exports.validateConfig = void 0;
var validator_1 = require("./validator");
Object.defineProperty(exports, "validateConfig", { enumerable: true, get: function () { return validator_1.validateConfig; } });
Object.defineProperty(exports, "ConfigValidationError", { enumerable: true, get: function () { return validator_1.ConfigValidationError; } });
var api_1 = require("./schemas/api");
Object.defineProperty(exports, "apiConfigSchema", { enumerable: true, get: function () { return api_1.apiConfigSchema; } });
Object.defineProperty(exports, "loadApiConfig", { enumerable: true, get: function () { return api_1.loadApiConfig; } });
var web_1 = require("./schemas/web");
Object.defineProperty(exports, "webConfigSchema", { enumerable: true, get: function () { return web_1.webConfigSchema; } });
Object.defineProperty(exports, "loadWebConfig", { enumerable: true, get: function () { return web_1.loadWebConfig; } });
var contracts_1 = require("./schemas/contracts");
Object.defineProperty(exports, "contractsConfigSchema", { enumerable: true, get: function () { return contracts_1.contractsConfigSchema; } });
Object.defineProperty(exports, "loadContractsConfig", { enumerable: true, get: function () { return contracts_1.loadContractsConfig; } });
//# sourceMappingURL=index.js.map