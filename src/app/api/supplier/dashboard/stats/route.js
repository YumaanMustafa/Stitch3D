// Import Next.js tool for sending data back to the browser
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import jsonwebtoken to read login tokens
import jwt from 'jsonwebtoken';

/**
 * File: route.js
 * Location: src/app/api/supplier/dashboard/stats/route.js
 * Description: Supplier Dashboard Statistics API.
 * This route gathers all the numbers (revenue, pending orders, etc.) needed 
 * to draw the charts and metrics on the Supplier's main dashboard screen.
 */

// Get the secret key used to lock and unlock the JWT token
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// ==========================================
// HELPER FUNCTION: Get Supplier ID securely
// ==========================================
async function getSupplierId(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // If they aren't a supplier, block them
        if (decoded.role !== 'supplier') return null;

        // Fetch their specific supplier_id from the database
        const [rows] = await db.query("SELECT supplier_id FROM suppliers WHERE supplier_id = ?", [decoded.id]);
        return rows.length > 0 ? rows[0].supplier_id : null;
    } catch (e) {
        return null;
    }
}

// ==========================================
// GET HANDLER: Handles GET requests when the supplier logs into their dashboard
// ==========================================
export async function GET(request) {
    // Step 1: Security Check
    const supplierId = await getSupplierId(request);
    if (!supplierId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Step 2: Create an empty object to hold all our statistics
    const stats = {};

    try {
        // 1. Calculate Total Revenue
        // We sum up the 'total' column from the 'bills' table, but only for requests this supplier has accepted/completed
        const [revenueRes] = await db.query(`
            SELECT IFNULL(SUM(b.total), 0) as revenue 
            FROM bills b 
            JOIN material_requests r ON b.request_id = r.id 
            WHERE r.supplier_id = ? AND r.status IN ('accepted', 'completed')
        `, [supplierId]);
        stats.revenue = Number(revenueRes[0].revenue);

        // 2. Count Total Successful Orders
        const [ordersRes] = await db.query(`
            SELECT COUNT(*) as orders 
            FROM material_requests 
            WHERE supplier_id = ? AND status IN ('accepted', 'completed')
        `, [supplierId]);
        stats.orders = Number(ordersRes[0].orders);

        // 3. Count Pending Requests (Things waiting for the supplier to review)
        const [pendingRes] = await db.query(`
            SELECT COUNT(*) as pending 
            FROM material_requests 
            WHERE supplier_id = ? AND status = 'pending'
        `, [supplierId]);
        stats.pending = Number(pendingRes[0].pending);

        // Placeholder for growth percentage calculation
        stats.growth = 14.5; // Represents % growth vs previous month in real app

        // 4. Fetch the "Action Needed" Triage Queue (Top 5 pending requests)
        const [actionsRes] = await db.query(`
            SELECT id, material_name as type, urgency 
            FROM material_requests 
            WHERE supplier_id = ? AND status = 'pending' 
            ORDER BY created_at ASC LIMIT 5
        `, [supplierId]);
        stats.actions = actionsRes.map(a => ({
            id: a.id,
            title: `Request #${a.id}`, // Format it nicely for the UI
            type: a.type,
            urgency: a.urgency
        }));

        // 5. Fetch Inventory Alerts
        // Find 4 items where the stock is low so we can warn the supplier
        const [inventoryRes] = await db.query(`
            SELECT name, stock, 50 as threshold 
            FROM supplier_inventory 
            WHERE supplier_id = ? 
            ORDER BY stock ASC LIMIT 4
        `, [supplierId]);
        stats.inventoryAlerts = inventoryRes;

        // 6. Generate the Activity Feed
        // Fetch the 5 most recently updated material requests to show a timeline
        const [activityRes] = await db.query(`
            SELECT id, status, created_at as updated_at 
            FROM material_requests 
            WHERE supplier_id = ? 
            ORDER BY created_at DESC LIMIT 5
        `, [supplierId]);
        
        // Format the activity items to include specific icons and colors based on their status
        stats.activityFeed = activityRes.map(act => {
            let iconStr = 'Clock';
            let colorStr = 'orange';
            if (act.status === 'accepted' || act.status === 'completed') { iconStr = 'CheckCircle'; colorStr = 'emerald'; }
            if (act.status === 'quoted') { iconStr = 'FileText'; colorStr = 'sky'; }
            if (act.status === 'rejected') { iconStr = 'XCircle'; colorStr = 'rose'; }
            return {
                iconName: iconStr,
                color: colorStr,
                text: `Material request #${act.id} marked as ${act.status}`,
                time: new Date(act.updated_at).toLocaleDateString()
            };
        });

        // 7. Generate Data for the Line Chart
        // We group revenue by month (e.g. 'Jan', 'Feb')
        const [chartRes] = await db.query(`
            SELECT DATE_FORMAT(b.created_at, '%b') as name, SUM(b.total) as revenue 
            FROM bills b 
            JOIN material_requests r ON b.request_id = r.id 
            WHERE r.supplier_id = ? AND r.status IN ('accepted', 'completed') 
            GROUP BY name 
            ORDER BY MIN(b.created_at)
        `, [supplierId]);
        
        // If they have chart data, use it. Otherwise, provide dummy data so the chart doesn't break.
        if (chartRes.length > 0) {
            stats.chart = chartRes.map(c => ({ name: c.name, revenue: Number(c.revenue) }));
        } else {
             stats.chart = [
                { name: 'Jan', revenue: 0 },
                { name: 'Feb', revenue: 0 },
                { name: 'Mar', revenue: 0 },
                { name: 'Apr', revenue: 0 },
                { name: 'May', revenue: 0 },
                { name: 'Jun', revenue: stats.revenue }
            ];
        }

        // Send all the compiled statistics back to the dashboard
        return NextResponse.json(stats);
        
    } catch (globalError) {
        // Log severe dashboard crashes
        console.error("Supplier Stats API Error:", globalError);
        return NextResponse.json({
            error: "Critical Failure",
            details: globalError.message
        }, { status: 500 });
    }
}
