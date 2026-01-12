-- =============================================================================
-- OrbitPayroll - Database Initialization Script
-- =============================================================================
-- This script runs automatically when the PostgreSQL container starts for the
-- first time. It sets up extensions and initial configuration.
-- =============================================================================

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a read-only role for reporting (optional)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'orbitpayroll_readonly') THEN
        CREATE ROLE orbitpayroll_readonly;
    END IF;
END
$$;

-- Grant connect permission
GRANT CONNECT ON DATABASE orbitpayroll TO orbitpayroll_readonly;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'OrbitPayroll database initialized successfully';
END
$$;
