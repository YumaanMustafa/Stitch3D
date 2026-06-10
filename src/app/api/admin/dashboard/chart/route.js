import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';
import { format, subDays } from 'date-fns';

/**
 * @file route.js
 * @description Admin Dashboard Chart API.
 * Fetches activity data (design requests) for the last 7 days to display in a chart.
 * Requires Admin authentication.
 */

/**
 * Verify if the request is from an authenticated admin.
 * @param {Request} request 
 * @returns {Promise<boolean>}
 */
async function verifyAdmin(request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
    try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        return decoded.role === 'admin';
    } catch { return false; }
}

export async function GET(request) {
    if (!await verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Get last 7 days dates
        const days = [];
        for (let i = 6; i >= 0; i--) {
            days.push(subDays(new Date(), i));
        }

        const categories = days.map(day => format(day, 'MMM dd'));

        // Fetch activity counts per day
        // Using DATE() function to group by day
        // Note: This query might be slow on large datasets, but fine for now
        const [requestCounts] = await db.query(`
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM design_requests 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
            GROUP BY DATE(created_at)
        `);

        // Map database results to the 7-day array, filling 0s for missing days
        const data = days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const found = requestCounts.find(r => {
                // Handle different date formats returned by MySQL driver (Date object or string)
                const rDate = new Date(r.date).toISOString().split('T')[0];
                return rDate === dateStr;
            });
            return found ? found.count : 0;
        });

        return NextResponse.json({
            categories,
            data
        });
    } catch (error) {
        console.error("Dashboard Chart Error:", error);
        return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 });
    }
}
