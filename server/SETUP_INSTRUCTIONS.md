# Database Setup Instructions

Since Node.js isn't available in the current environment, please follow these steps in your local terminal:

## Step 1: Navigate to the Server Directory
```bash
cd /Users/soumitroshovondwip/Desktop/Partition-Games/server
```

## Step 2: Install Dependencies (if not already done)
```bash
npm install
```

## Step 3: Create the Database Schema
Run the setup script to create the tables:
```bash
node setup-database.js
```

This will:
- Connect to your Neon database
- Create the `game_records` table
- Add sample data for testing
- Show current statistics

## Step 4: Start the Server (Optional)
```bash
npm start
```

## Alternative: Manual Database Setup

If you prefer to set up the database manually, you can run the SQL directly in your Neon dashboard:

1. Go to your Neon dashboard
2. Open the SQL Editor
3. Copy and paste the contents of `schema.sql`
4. Execute the SQL

## Expected Output

After running the setup script, you should see:
```
🔗 Connecting to database...
✅ Successfully connected to PostgreSQL database!
📊 Setting up database schema...
✅ Database schema created successfully!
🔧 Inserting sample data...
✅ Sample data inserted!

📈 Current Database Statistics:
==============================
ANTI: 2 games (A: 1 wins, B: 1 wins)
LCTR: 1 games (A: 1 wins, B: 0 wins)

🎉 Database setup completed successfully!
```

## Verify the Setup

You can verify the database was created by checking your Neon dashboard or running:
```sql
SELECT * FROM game_records ORDER BY created_at DESC;
```

This should show the sample records and any new games played.

## Troubleshooting

If you get connection errors:
1. Check that your `.env` file has the correct DATABASE_URL
2. Verify the Neon database is running
3. Make sure the connection string includes SSL settings

The current .env file should contain:
```
DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@<NEON_HOST>/<DB_NAME>?sslmode=require&channel_binding=require
JWT_SECRET=<your-secure-random-jwt-secret>
NODE_ENV=development
PORT=3001
```

> **Note:** Get your `DATABASE_URL` from your Neon dashboard under "Connection Details". Generate a strong random `JWT_SECRET` (e.g. `openssl rand -base64 32`).