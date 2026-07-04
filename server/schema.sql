-- Database schema for Partition Games
-- This file contains the table definitions for storing game data

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Game records table
CREATE TABLE IF NOT EXISTS game_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_type VARCHAR(10) NOT NULL,  -- e.g., 'ANTI', 'LCTR', 'CRPS', etc.
    partition_data TEXT NOT NULL,    -- e.g., '8 6 6 5 4 3 1 1'
    timestamp_played TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    moves_sequence TEXT,             -- e.g., 'R2C3 R1C2 R3C1' for move sequences
    game_outcome CHAR(1),            -- 'A' for player A wins, 'B' for player B wins
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_game_records_game_type ON game_records(game_type);
CREATE INDEX IF NOT EXISTS idx_game_records_timestamp ON game_records(timestamp_played);
CREATE INDEX IF NOT EXISTS idx_game_records_created_at ON game_records(created_at);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update the updated_at column
CREATE TRIGGER update_game_records_updated_at 
    BEFORE UPDATE ON game_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sample data insertion (for testing)
-- INSERT INTO game_records (game_type, partition_data, timestamp_played, moves_sequence, game_outcome)
-- VALUES 
--     ('ANTI', '4 3 2 1', NOW(), 'R0C3 R1C1 R0C0', 'A'),
--     ('LCTR', '5 4 4 2', NOW(), 'R C R', 'B'),
--     ('CRPS', '8 6 6 5 4 3 1 1', NOW(), 'R2S2 C2S3 R1S1', 'A');