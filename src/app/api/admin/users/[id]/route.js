import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

/**
 * @file route.js
 * @description Admin User Management API (Single User).
 * Handles deletion of users with cascading cleanup of associated data (vendors, customers, orders).
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

/**
 * DELETE handler to remove a user and all their related data.
 * @param {Request} request 
 * @param {Object} params - { id }
 */
export async function DELETE(request, { params }) {
    if (!await verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const resolvedParams = await params;
    const { id } = resolvedParams;

    try {
        // 1. Get associated vendor_id for cleanup
        const [vendorRows] = await db.query("SELECT vendor_id FROM vendors WHERE user_id = ?", [id]);
        if (vendorRows.length > 0) {
            const vendorId = vendorRows[0].vendor_id;
            await db.execute("DELETE FROM vendor_products WHERE vendor_id = ?", [vendorId]);
            await db.execute("DELETE FROM vendors WHERE vendor_id = ?", [vendorId]);
        }

        // 2. Cleanup Customer Data (Orders, Items, Customer Profile)
        const [customerRows] = await db.query("SELECT customer_id FROM customers WHERE user_id = ?", [id]);
        if (customerRows.length > 0) {
            const customerId = customerRows[0].customer_id;

            // Delete Order Items linked to Customer's Orders
            await db.query(`
                DELETE order_items FROM order_items 
                JOIN orders ON order_items.order_id = orders.order_id 
                WHERE orders.customer_id = ?
            `, [customerId]);

            // Delete Orders
            await db.execute("DELETE FROM orders WHERE customer_id = ?", [customerId]);

            // Delete Customer Profile
            await db.execute("DELETE FROM customers WHERE customer_id = ?", [customerId]);
        }

        // 3. Cleanup Designs
        // The customized_designs table does not have a user_id column, so we skip it to prevent SQL errors.
        // await db.execute("DELETE FROM customized_designs WHERE user_id = ?", [id]);

        // 4. Delete User (Safe now)
        await db.execute("DELETE FROM users WHERE user_id = ?", [id]);

        return NextResponse.json({ message: "User and associated data deleted successfully" });
    } catch (error) {
        console.error("Delete User Error:", error);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
