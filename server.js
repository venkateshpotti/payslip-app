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
app.use(express.static('public'));

// === API ENDPOINTS ===

// Endpoint for employee to submit (no changes)
app.post('/api/payslip', async (req, res) => {
    try {
        let { employeeName, employeeId, email, password, startMonth, endMonth } = req.body;
        if (!employeeName || !employeeId || !email || !password || !startMonth) {
            return res.status(400).json({ error: 'All required fields must be provided.' });
        }
        const formattedStartMonth = `${startMonth}-01`;
        const formattedEndMonth = endMonth ? `${endMonth}-01` : null;
        const insertQuery = `
            INSERT INTO payslips(employee_name, employee_id, email, password, start_month, end_month)
            VALUES($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const values = [employeeName, employeeId, email, password, formattedStartMonth, formattedEndMonth];
        const result = await db.query(insertQuery, values);
        res.status(201).json({ message: 'Payslip submitted successfully!', data: result.rows[0] });
    } catch (err) {
        console.error("Error during submission:", err.stack);
        res.status(500).json({ error: 'Database error occurred.', details: err.message });
    }
});

// Endpoint to get ALL payslips for the HR portal (no changes from last step)
app.get('/api/payslips/all', async (req, res) => {
    try {
        const query = `
            SELECT * FROM payslips
            ORDER BY
                CASE status
                    WHEN 'pending' THEN 1
                    WHEN 'approved' THEN 2
                    WHEN 'rejected' THEN 3
                    ELSE 4
                END,
                submission_date DESC;
        `;
        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching all payslips:', err);
        res.status(500).json({ error: 'Database error occurred.' });
    }
});

// Endpoint for HR to approve a payslip (no changes)
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

//  Endpoint for HR to reject a payslip (no reason needed)
app.put('/api/payslip/reject/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const updateQuery = `
            UPDATE payslips
            SET status = 'rejected'
            WHERE id = $1
            RETURNING *;
        `;
        const result = await db.query(updateQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payslip not found.' });
        }
        res.status(200).json({ message: 'Payslip rejected successfully!', data: result.rows[0] });
    } catch (err) {
        console.error(`Error rejecting payslip ${id}:`, err);
        res.status(500).json({ error: 'Database error occurred.' });
    }
});


// === PAGE SERVING ROUTES ===
app.get('/hr', (req, res) => res.sendFile(path.join(__dirname, 'public', 'hr.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'employee.html')));

app.listen(PORT, () => {
    console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
    console.log(`\n🚀 HR Portal is running on http://localhost:${PORT}/hr`);
    
}); 