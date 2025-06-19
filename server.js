const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
// Note: express.static is not needed for this workflow, but doesn't hurt.
app.use(express.static('public')); 

// === API ENDPOINTS (No changes here) ===

app.post('/api/payslip', async (req, res) => {
    try {
        let { employeeName, employeeId, email, password, startMonth, endMonth } = req.body;
        if (!employeeName || !employeeId || !email || !password || !startMonth) {
            return res.status(400).json({ error: 'All required fields must be provided.' });
        }
        const formattedStartMonth = `${startMonth}-01`;
        const formattedEndMonth = endMonth ? `${endMonth}-01` : null;
        const result = await db.query(
            'INSERT INTO payslips(employee_name, employee_id, email, password, start_month, end_month) VALUES($1, $2, $3, $4, $5, $6) RETURNING *;',
            [employeeName, employeeId, email, password, formattedStartMonth, formattedEndMonth]
        );
        res.status(201).json({ message: 'Payslip submitted successfully!', data: result.rows[0] });
    } catch (err) {
        console.error("Error during submission:", err.stack);
        res.status(500).json({ error: 'Database error occurred.', details: err.message });
    }
});

app.get('/api/payslips/all', async (req, res) => {
    try {
        const query = `
            SELECT * FROM payslips ORDER BY
                CASE status WHEN 'pending' THEN 1 WHEN 'approved' THEN 2 WHEN 'rejected' THEN 3 ELSE 4 END,
                submission_date DESC;
        `;
        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching all payslips:', err);
        res.status(500).json({ error: 'Database error occurred.' });
    }
});

// Other endpoints (approve, reject) are unchanged...
app.put('/api/payslip/approve/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query("UPDATE payslips SET status = 'approved' WHERE id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Payslip not found.' });
        res.status(200).json({ message: 'Payslip approved successfully!', data: result.rows[0] });
    } catch (err) {
        console.error(`Error approving payslip ${id}:`, err);
        res.status(500).json({ error: 'Database error occurred.' });
    }
});
app.put('/api/payslip/reject/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query("UPDATE payslips SET status = 'rejected' WHERE id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Payslip not found.' });
        res.status(200).json({ message: 'Payslip rejected successfully!', data: result.rows[0] });
    } catch (err) {
        console.error(`Error rejecting payslip ${id}:`, err);
        res.status(500).json({ error: 'Database error occurred.' });
    }
});


// === NEW: BULLETPROOF STARTUP FUNCTION ===
const startServer = async () => {
    try {
        // Step 1: Test the database connection. This will fail early if creds are wrong.
        await db.testConnection();

        // Step 2: Ensure the required table exists. This prevents crashes on first request.
        await db.createTable();

        // Step 3: Only if the above succeed, start the server.
        app.listen(PORT, () => {
            console.log(`\n✅✅✅ Server successfully started! ✅✅✅`);
            console.log(`🚀 Now listening on http://localhost:${PORT}`);
            console.log(`\nOpen the employee.html or hr.html file in your browser to use the application.`);
            console.log(`(Keep this terminal window open.)`);
        });

    } catch (error) {
        // This block will catch any errors from testConnection or createTable
        // The process will exit, preventing a "zombie" server.
        // The error reason is already logged by the function that failed.
    }
};

// --- Let's go! ---
startServer();
