-- SQL script to clear data from the database while preserving user accounts
-- This script will delete data from tables in a specific order to respect foreign key constraints

-- Start a transaction
BEGIN;

-- Disable triggers temporarily to avoid trigger-based constraints
SET session_replication_role = 'replica';

-- Clear sports database tables (if they exist)
DO $$
BEGIN
    -- Check if sports tables exist and clear them
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leagues') THEN
        TRUNCATE TABLE leagues CASCADE;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'teams') THEN
        TRUNCATE TABLE teams CASCADE;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'players') THEN
        TRUNCATE TABLE players CASCADE;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'games') THEN
        TRUNCATE TABLE games CASCADE;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stadiums') THEN
        TRUNCATE TABLE stadiums CASCADE;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'broadcasts') THEN
        TRUNCATE TABLE broadcasts CASCADE;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'productions') THEN
        TRUNCATE TABLE productions CASCADE;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'brands') THEN
        TRUNCATE TABLE brands CASCADE;
    END IF;
END $$;

-- Clear data tables
-- First, clear any data that might reference structured_data
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'data_rows') THEN
        TRUNCATE TABLE data_rows CASCADE;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'data_columns') THEN
        TRUNCATE TABLE data_columns CASCADE;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'data_cells') THEN
        TRUNCATE TABLE data_cells CASCADE;
    END IF;
END $$;

-- Clear structured data
TRUNCATE TABLE structured_data CASCADE;

-- Clear messages (this will remove all chat content)
TRUNCATE TABLE messages;

-- Clear conversations but preserve user references
-- This deletes all conversations but keeps the users table intact
DELETE FROM conversations;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Commit the transaction
COMMIT;

-- Verify the cleanup
SELECT 'Users count: ' || COUNT(*) FROM users;
SELECT 'Conversations count: ' || COUNT(*) FROM conversations;
SELECT 'Messages count: ' || COUNT(*) FROM messages;
SELECT 'Structured data count: ' || COUNT(*) FROM structured_data; 