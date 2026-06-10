import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

/**
 * @file route.js
 * @description Supplier Dashboard Statistics API.
 * Returns mocked data mimicking the structure of the vendor's stats dashboard.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

async function getSupplierId(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'supplier') return null;

        const [rows] = await db.query("SELECT supplier_id FROM suppliers WHERE supplier_id = ?", [decoded.id]);
        return rows.length > 0 ? rows[0].supplier_id : null;
    } catch (e) {
        return null;
    }
}

export async function GET(request) {
    const supplierId = await getSupplierId(request);
    if (!supplierId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const stats = {};

    try {
        // 1. Revenue
        const [revenueRes] = await db.query(`
            SELECT IFNULL(SUM(b.total), 0) as revenue 
            FROM bills b 
            JOIN material_requests r ON b.request_id = r.id 
            WHERE r.supplier_id = ? AND r.status IN ('accepted', 'completed')
        `, [supplierId]);
        stats.revenue = Number(revenueRes[0].revenue);

        // 2. Orders
        const [ordersRes] = await db.query(`
            SELECT COUNT(*) as orders 
            FROM material_requests 
            WHERE supplier_id = ? AND status IN ('accepted', 'completed')
        `, [supplierId]);
        stats.orders = Number(ordersRes[0].orders);

        // 3. Pending
        const [pendingRes] = await db.query(`
            SELECT COUNT(*) as pending 
            FROM material_requests 
            WHERE supplier_id = ? AND status = 'pending'
        `, [supplierId]);
        stats.pending = Number(pendingRes[0].pending);

        stats.growth = 14.5; // Represents % growth vs previous month in real app

        // 4. Actions (Triage Queue)
        const [actionsRes] = await db.query(`
            SELECT id, material_name as type, urgency 
            FROM material_requests 
            WHERE supplier_id = ? AND status = 'pending' 
            ORDER BY created_at ASC LIMIT 5
        `, [supplierId]);
        stats.actions = actionsRes.map(a => ({
            id: a.id,
            title: `Request #${a.id}`,
            type: a.type,
            urgency: a.urgency
        }));

        // 5. Inventory Alerts
        const [inventoryRes] = await db.query(`
            SELECT name, stock, 50 as threshold 
            FROM supplier_inventory 
            WHERE supplier_id = ? 
            ORDER BY stock ASC LIMIT 4
        `, [supplierId]);
        stats.inventoryAlerts = inventoryRes;

        // 6. Activity Feed
        const [activityRes] = await db.query(`
            SELECT id, status, created_at as updated_at 
            FROM material_requests 
            WHERE supplier_id = ? 
            ORDER BY created_at DESC LIMIT 5
        `, [supplierId]);
        
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

        // 7. Chart 
        const [chartRes] = await db.query(`
            SELECT DATE_FORMAT(b.created_at, '%b') as name, SUM(b.total) as revenue 
            FROM bills b 
            JOIN material_requests r ON b.request_id = r.id 
            WHERE r.supplier_id = ? AND r.status IN ('accepted', 'completed') 
            GROUP BY name 
            ORDER BY MIN(b.created_at)
        `, [supplierId]);
        
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

        return NextResponse.json(stats);
    } catch (globalError) {
        console.error("Supplier Stats API Error:", globalError);
        return NextResponse.json({
            error: "Critical Failure",
            details: globalError.message
        }, { status: 500 });
    }
}
