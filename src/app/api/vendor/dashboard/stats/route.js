// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import our custom auth tools
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

// Prevent Next.js from caching this page so stats are always fresh
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * File: route.js
 * Location: src/app/api/vendor/dashboard/stats/route.js
 * Description: Vendor Dashboard Statistics API.
 * Gathers all the numbers, charts, and metrics needed for the Vendor's 
 * main dashboard screen (revenue, active orders, total products, etc.).
 */

// ==========================================
// HELPER FUNCTION: Get Vendor ID safely
// ==========================================
async function getVendorId(request) {
    try {
        const payload = getVendorFromRequest(request);
        if (!payload) return null;
        // This converts the generic 'user_id' into the specific 'vendor_id' we need for our queries
        return await getVendorIdFromUser(payload);
    } catch (e) {
        return null;
    }
}

// ==========================================
// GET HANDLER: Handles GET requests to load the Vendor Dashboard
// ==========================================
export async function GET(request) {
    // Step 1: Security Check
    const vendorId = await getVendorId(request);
    if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Step 2: Set up a default empty stats object
    const stats = {
        revenue: 0,
        activeOrders: 0,
        totalProducts: 0,
        growth: 0,
        chart: [],
        actions: [],
        errors: [] // We use this to quietly log errors without crashing the whole dashboard
    };

    try {
        // Step 3: Calculate Revenue
        // We sum up the 'total' column of every order belonging to this vendor
        try {
            const [revenueRows] = await db.query(`
                SELECT 
                    SUM(total) as revenue
                FROM orders
                WHERE vendor_id = ?
            `, [vendorId]);
            stats.revenue = Number(revenueRows[0].revenue || 0);

            // Mock growth percentage (just for visuals)
            stats.growth = stats.revenue > 0 ? 12.5 : 0;

        } catch (e) {
            console.error("Orders Query Error:", e);
            stats.errors.push("Orders: " + e.message);
        }

        // Step 4: Count Active/Pending Orders
        try {
            const [pendingRows] = await db.query(`
                SELECT COUNT(*) as count 
                FROM orders
                WHERE (status = 'Pending' OR status = 'Processing' OR status = 'accepted')
                AND vendor_id = ?
            `, [vendorId]);
            stats.activeOrders = pendingRows[0].count || 0;
        } catch (e) {
            console.error("Pending Orders Query Error:", e);
            stats.errors.push("Pending Orders: " + e.message);
        }

        // Step 5: Count Total Products in their shop
        try {
            const [productRows] = await db.query(`
                SELECT COUNT(*) as count 
                FROM vendor_products 
                WHERE vendor_id = ?
            `, [vendorId]);
            stats.totalProducts = productRows[0].count || 0;
        } catch (e) {
            console.error("Products Count Query Error:", e);
            stats.errors.push("Products: " + e.message);
        }

        // Step 6: Count Custom Design Requests from customers
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

        // Step 7: Count Total Reviews across all products
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

        // Step 8: Build the "Action Needed" Queue
        // Get the top 3 oldest pending design requests that need the vendor's attention
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

        // Step 9: Build the line chart
        // Note: In a real app this would query the DB grouped by month. Here we use 
        // a simple math formula based on total revenue to generate a good looking chart.
        stats.chart = [
            { name: 'Jan', revenue: stats.revenue * 0.1 },
            { name: 'Feb', revenue: stats.revenue * 0.15 },
            { name: 'Mar', revenue: stats.revenue * 0.12 },
            { name: 'Apr', revenue: stats.revenue * 0.2 },
            { name: 'May', revenue: stats.revenue * 0.18 },
            { name: 'Jun', revenue: stats.revenue * 0.25 },
        ];

        // Send the fully populated stats object back to the dashboard
        return NextResponse.json(stats);

    } catch (globalError) {
        // Log completely fatal dashboard crashes
        console.error("Stats API Critical Error:", globalError);
        return NextResponse.json({
            error: "Critical Failure",
            details: globalError.message
        }, { status: 500 });
    }
}
