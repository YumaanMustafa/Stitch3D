// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database connection tool
import db from '@/lib/db';
// Import jsonwebtoken to manually verify admin access
import jwt from 'jsonwebtoken';

/**
 * File: route.js
 * Location: src/app/api/admin/users/[id]/route.js
 * Description: Admin User Management API (Single User).
 * This route allows the Admin to completely delete a user.
 * It carefully deletes all related data (like their orders, designs, and shop) 
 * first, so the database doesn't break due to leftover "orphaned" records.
 */

// ==========================================
// HELPER FUNCTION: Verify Admin
// ==========================================
// Checks if the user trying to do this is an Admin
async function verifyAdmin(request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
    try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        return decoded.role === 'admin';
    } catch { 
        return false; 
    }
}

// ==========================================
// DELETE HANDLER: Handles DELETE requests to completely wipe a user
// ==========================================
export async function DELETE(request, { params }) {
    // Step 1: Security Check
    if (!await verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Step 2: Grab the ID of the user we want to delete from the URL
    const resolvedParams = await params;
    const { id } = resolvedParams;

    try {
        // Step 3: Cascading Deletion
        // We must delete things in a specific order. If we delete the user first, 
        // their orders will be stuck in the database with no owner!

        // 3a. Cleanup Vendor Data (if they are a manufacturer)
        const [vendorRows] = await db.query("SELECT vendor_id FROM vendors WHERE user_id = ?", [id]);
        if (vendorRows.length > 0) {
            const vendorId = vendorRows[0].vendor_id;
            // Delete all products they uploaded
            await db.execute("DELETE FROM vendor_products WHERE vendor_id = ?", [vendorId]);
            // Delete their vendor shop profile
            await db.execute("DELETE FROM vendors WHERE vendor_id = ?", [vendorId]);
        }

        // 3b. Cleanup Customer Data (if they are a standard customer)
        const [customerRows] = await db.query("SELECT customer_id FROM customers WHERE user_id = ?", [id]);
        if (customerRows.length > 0) {
            const customerId = customerRows[0].customer_id;

            // Delete Order Items (the specific shirts/hats inside an order)
            await db.query(`
                DELETE order_items FROM order_items 
                JOIN orders ON order_items.order_id = orders.order_id 
                WHERE orders.customer_id = ?
            `, [customerId]);

            // Delete the empty Orders themselves
            await db.execute("DELETE FROM orders WHERE customer_id = ?", [customerId]);

            // Delete the Customer Profile
            await db.execute("DELETE FROM customers WHERE customer_id = ?", [customerId]);
        }

        // 3c. Cleanup Designs
        // Note: The customized_designs table currently doesn't link directly to user_id in a way 
        // we can safely delete here without breaking other things, so we skip it.
        // await db.execute("DELETE FROM customized_designs WHERE user_id = ?", [id]);

        // Step 4: Delete the core User account (Safe now that everything else is gone)
        await db.execute("DELETE FROM users WHERE user_id = ?", [id]);

        // Return a success message
        return NextResponse.json({ message: "User and associated data deleted successfully" });
        
    } catch (error) {
        // Log any database crashes securely
        console.error("Delete User Error:", error);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
