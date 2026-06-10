import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * @file route.js
 * @description Admin Vendor Management API (Single Vendor).
 * Handles updates (status approval/rejection) and deletion of vendors.
 */

/**
 * PUT handler to update vendor details or status.
 * Syncs status changes with the linked User account.
 */
export async function PUT(request, { params }) {
    try {
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        console.log(`[Vendor PUT] ID: ${id}, Body:`, body);

        const { name, email, company_name, status } = body;

        if (name || email || company_name) {
            console.log("Updating vendor details...");
            await db.execute(
                "UPDATE vendors SET name = ?, email = ?, company_name = ? WHERE vendor_id = ?",
                [name || null, email || null, company_name || null, id]
            );
        }

        // 2. Status Update (Approve/Reject) requires updating linked USER
        if (status) {
            console.log("Updating vendor status...");
            // db.query returns [rows, fields]
            const [rows] = await db.query("SELECT user_id FROM vendors WHERE vendor_id = ?", [id]);
            console.log("Found vendor rows:", rows);

            if (rows.length > 0 && rows[0].user_id) {
                const userId = rows[0].user_id;
                console.log(`Updating user ${userId} status to ${status}`);
                const [updateResult] = await db.execute("UPDATE users SET status = ? WHERE user_id = ?", [status, userId]);
                console.log("Update result:", updateResult);
            } else {
                console.warn(`Vendor ${id} has no linked user_id, cannot update status.`);
            }
        }

        return NextResponse.json({ message: "Updated", status });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;

        // Fetch vendor to get linked user_id BEFORE deleting
        const [rows] = await db.query("SELECT user_id FROM vendors WHERE vendor_id = ?", [id]);

        // 2. Delete Vendor
        await db.execute("DELETE FROM vendors WHERE vendor_id = ?", [id]);

        // 3. Delete Linked User and their Data if exists
        if (rows.length > 0 && rows[0].user_id) {
            const userId = rows[0].user_id;
            console.log(`Cascading delete: Removing user ${userId} linked to vendor ${id}`);

            // Cleanup Customer Data (Orders, Items, Customer Profile)
            const [customerRows] = await db.query("SELECT customer_id FROM customers WHERE user_id = ?", [userId]);
            if (customerRows.length > 0) {
                const customerId = customerRows[0].customer_id;

                // Delete Order Items
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

            // Cleanup Designs
            // customized_designs does not have user_id
            // await db.execute("DELETE FROM customized_designs WHERE user_id = ?", [userId]);

            // Finally Delete User
            await db.execute("DELETE FROM users WHERE user_id = ?", [userId]);
        }

        return NextResponse.json({ message: "Vendor and associated user deleted successfully" });
    } catch (error) {
        console.error("Delete Vendor Error:", error);
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}
