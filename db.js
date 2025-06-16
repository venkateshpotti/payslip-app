const { Pool } = require('pg');

// *******************************************************************
// IMPORTANT: Double-check these details! This is the most common
// point of failure.
// *******************************************************************
const pool = new Pool({
    user: 'postgres',           // Your PostgreSQL username
    host: 'localhost',
    database: 'payroll_system', // The database you created
    password: '1234',  // Your PostgreSQL password
    port: 5432,
});

// NEW: Function to test the database connection on startup
const testConnection = async () => {
    let client;
    try {
        client = await pool.connect();
        console.log("✅ Database Connection Test SUCCESSFUL. Connected to 'payroll_system'.");
        client.release();
    } catch (err) {
        console.error("❌ FATAL: Database Connection Test FAILED.");
        console.error(`   Reason: ${err.message}`);
        console.error("   Please check your connection details in db.js and ensure PostgreSQL is running.");
        // Exit the process if the database connection fails, as the app cannot run.
        process.exit(1); 
    }
};

const createTable = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS payslips (
            id SERIAL PRIMARY KEY,
            employee_name VARCHAR(100) NOT NULL,
            employee_id VARCHAR(10) NOT NULL,
            email VARCHAR(100) NOT NULL,
            password VARCHAR(100) NOT NULL, 
            start_month DATE NOT NULL,
            end_month DATE,
            status VARCHAR(20) DEFAULT 'pending',
            submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await pool.query(createTableQuery);
        console.log("✅ 'payslips' table is ready.");
    } catch (err) {
        console.error("❌ Error creating table:", err.stack);
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    createTable,
    testConnection, // Export the new function
};