// Import Next.js tool for sending responses back to the browser
import { NextResponse } from 'next/server';
// Import the database connection tool
import db from '@/lib/db';
// Import jsonwebtoken to manually check the admin's login token
import jwt from 'jsonwebtoken';
// Import date-fns library helpers to easily manipulate dates and times
import { format, subDays } from 'date-fns';

/**
 * File: route.js
 * Location: src/app/api/admin/dashboard/chart/route.js
 * Description: Admin Dashboard Chart API.
 * This route gathers data for the last 7 days of activity (specifically design requests) 
 * so the Admin dashboard can draw a line chart showing daily activity.
 */

// ==========================================
// HELPER FUNCTION: Verify Admin
// ==========================================
// A small helper to check if the user requesting this data is an admin
async function verifyAdmin(request) {
    const authHeader = request.headers.get("authorization");
    
    // Stop if there is no token
    if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
    
    try {
        const token = authHeader.split(" ")[1];
        // Decrypt the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        // Return true if they are an admin, false if they are a customer/vendor
        return decoded.role === 'admin';
    } catch { 
        return false; 
    }
}

// ==========================================
// GET HANDLER: Handles GET requests when the Admin Dashboard loads the chart
// ==========================================
export async function GET(request) {
    // Step 1: Security Check using our helper above
    if (!await verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Step 2: Figure out the dates for the last 7 days
        const days = [];
        // Loop backwards from 6 days ago up to today (0)
        for (let i = 6; i >= 0; i--) {
            days.push(subDays(new Date(), i)); // Calculate the exact date for each step
        }

        // Format these dates into nice labels for the bottom of the chart (e.g., 'Oct 14')
        const categories = days.map(day => format(day, 'MMM dd'));

        // Step 3: Ask the database how many design requests were made on each of those days
        // We use the DATE() function in MySQL to ignore the exact time (hours/minutes) and just group by the day
        const [requestCounts] = await db.query(`
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM design_requests 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
            GROUP BY DATE(created_at)
        `);

        // Step 4: Match the database results to our 7-day array
        // The database only returns days where activity actually happened.
        // We need to fill in '0' for quiet days so the chart doesn't break.
        const data = days.map(day => {
            // Format the day like '2023-10-14' to compare it with the database
            const dateStr = format(day, 'yyyy-MM-dd');
            
            // Search the database results to see if anything happened on this day
            const found = requestCounts.find(r => {
                // Ensure date format matches exactly before comparing
                const rDate = new Date(r.date).toISOString().split('T')[0];
                return rDate === dateStr;
            });
            
            // If we found activity, return the count. Otherwise, return 0.
            return found ? found.count : 0;
        });

        // Step 5: Send the formatted labels (categories) and numbers (data) back to the chart
        return NextResponse.json({
            categories,
            data
        });
    } catch (error) {
        // Log errors securely
        console.error("Dashboard Chart Error:", error);
        return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 });
    }
}
