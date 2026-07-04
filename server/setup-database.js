#!/usr/bin/env node
/**
 * Database Setup Script for Partition Games
 * 
 * This script sets up the game_records table in your PostgreSQL database.
 * 
 * Usage:
 *   node setup-database.js
 * 
 * Make sure you have set the DATABASE_URL environment variable.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function setupDatabase() {
    // Create a new pool instance using the environment variable
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Required for Neon connections
        }
    });

    try {
        console.log('🔗 Connecting to database...');
        
        // Test the connection
        const client = await pool.connect();
        console.log('✅ Successfully connected to PostgreSQL database!');
        
        // Read and execute the schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('📊 Setting up database schema...');
        await client.query(schemaSql);
        console.log('✅ Database schema created successfully!');
        
        // Insert some sample data for testing
        console.log('🔧 Inserting sample data...');
        await client.query(`
            INSERT INTO game_records (game_type, partition_data, timestamp_played, moves_sequence, game_outcome)
            VALUES 
                ('ANTI', '4 3 2 1', NOW() - INTERVAL '1 hour', 'R0C3 R1C1 R0C0', 'A'),
                ('ANTI', '5 4 3 2 1', NOW() - INTERVAL '30 minutes', 'R2C4 R1C2 R0C1 R0C0', 'B'),
                ('LCTR', '5 4 4 2', NOW() - INTERVAL '15 minutes', 'R C R', 'A')
            ON CONFLICT DO NOTHING;
        `);
        console.log('✅ Sample data inserted!');
        
        // Show some statistics
        const { rows } = await client.query(`
            SELECT 
                game_type,
                COUNT(*) as total_games,
                COUNT(CASE WHEN game_outcome = 'A' THEN 1 END) as player_a_wins,
                COUNT(CASE WHEN game_outcome = 'B' THEN 1 END) as player_b_wins
            FROM game_records 
            GROUP BY game_type 
            ORDER BY game_type;
        `);
        
        console.log('\n📈 Current Database Statistics:');
        console.log('==============================');
        rows.forEach(row => {
            console.log(`${row.game_type}: ${row.total_games} games (A: ${row.player_a_wins} wins, B: ${row.player_b_wins} wins)`);
        });
        
        client.release();
        console.log('\n🎉 Database setup completed successfully!');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the setup
setupDatabase();