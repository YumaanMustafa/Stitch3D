import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * @file route.js
 * @description Vendor Dashboard Statistics API.
 * Aggregates key metrics for the vendor strictly by vendor_id.
 */

async function getVendorId(request) {
    try {
        const payload = getVendorFromRequest(request);
        if (!payload) return null;
        return await getVendorIdFromUser(payload);
    } catch (e) {
        return null;
    }
}

/**
 * GET handler to fetch vendor stats.
 */
export async function GET(request) {
    const vendorId = await getVendorId(request);
    if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const stats = {
        revenue: 0,
        orders: 0,
        pending: 0,
        requests: 0,
        growth: 0,
        chart: [],
        actions: [],
        errors: [] // Debug info
    };

    try {
        // 1. Orders Stats
        try {
            const [revenueRows] = await db.query(`
                SELECT 
                    SUM(total) as revenue, 
                    COUNT(*) as count 
                FROM orders
                WHERE vendor_id = ?
            `, [vendorId]);
            stats.revenue = Number(revenueRows[0].revenue || 0);
            stats.orders = revenueRows[0].count || 0;

            // Mock growth based on revenue (just for visuals)
            stats.growth = stats.revenue > 0 ? 12.5 : 0;

        } catch (e) {
            console.error("Orders Query Error:", e);
            stats.errors.push("Orders: " + e.message);
        }

        // 2. Pending Orders
        try {
            const [pendingRows] = await db.query(`
                SELECT COUNT(*) as count 
                FROM orders
                WHERE (status = 'Pending' OR status = 'Processing' OR status = 'accepted')
                AND vendor_id = ?
            `, [vendorId]);
            stats.pending = pendingRows[0].count || 0;
        } catch (e) {
            console.error("Pending Orders Query Error:", e);
            // Non-critical
        }

        // 3. Design Requests
        try {
            const [requestRows] = await db.query(`
                SELECT COUNT(*) as count 
                FROM design_requests 
                WHERE status = 'pending' AND vendor_id = ?
            `, [vendorId]);
            stats.requests = requestRows[0].count || 0;
        } catch (e) {
            console.error("Design Requests Query Error:", e);
            stats.errors.push("Requests: " + e.message);
        }

        // 4. Reviews Count
        try {
            const [reviewRows] = await db.query(`
                SELECT SUM(total_reviews) as count 
                FROM vendor_products 
                WHERE vendor_id = ?
            `, [vendorId]);
            stats.total_reviews = reviewRows[0].count || 0;
        } catch (e) {
            console.error("Reviews Count Error:", e);
            stats.total_reviews = 0;
        }

        // 5. Actions List
        try {
            const [actions] = await db.query(`
                SELECT 
                    design_id as id,
                    title,
                    created_at,
                    'Design Review' as type
                FROM design_requests
                WHERE status = 'pending' AND vendor_id = ?
                ORDER BY created_at DESC
                LIMIT 3
            `, [vendorId]);
            stats.actions = actions || [];
        } catch (e) {
            console.error("Actions Query Error:", e);
            stats.actions = [];
        }

        // 6. Chart (Mock based on revenue)
        stats.chart = [
            { name: 'Jan', revenue: stats.revenue * 0.1 },
            { name: 'Feb', revenue: stats.revenue * 0.15 },
            { name: 'Mar', revenue: stats.revenue * 0.12 },
            { name: 'Apr', revenue: stats.revenue * 0.2 },
            { name: 'May', revenue: stats.revenue * 0.18 },
            { name: 'Jun', revenue: stats.revenue * 0.25 },
        ];

        return NextResponse.json(stats);

    } catch (globalError) {
        console.error("Stats API Critical Error:", globalError);
        return NextResponse.json({
            error: "Critical Failure",
            details: globalError.message
        }, { status: 500 });
    }
}
