import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { sendAccountStatusEmail } from '@/lib/email';

/**
 * @file route.js
 * @description Admin Vendor Management API (Single Vendor).
 * Handles updates (status approval/rejection) and deletion of vendors.
 */

/**
 * PUT handler to update vendor details or status.
 * Syncs status changes with the linked User account.
 */
// ==========================================
// PUT HANDLER: Handles PUT requests for src/app/api/admin/vendors/[id]/route.js
// ==========================================
export async function PUT(request, { params }) {
    try {
        // 1. Confirm that the request is initiated by a verified administrator
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        console.log(`[Vendor PUT] ID: ${id}, Body:`, body);

        const { name, email, company_name, status } = body;

        // 2. If name, email, or company name is provided, update the record in the 'vendors' table
        if (name || email || company_name) {
            console.log("Updating vendor details...");
            await db.execute(
                "UPDATE vendors SET name = ?, email = ?, company_name = ? WHERE vendor_id = ?",
                [name || null, email || null, company_name || null, id]
            );
        }

        // 3. Sync Status Updates (Approve/Reject) with the linked user account in the 'users' table
        if (status) {
            console.log("Updating vendor status...");
            // Query user_id and email from linked user account to verify relations
            const [rows] = await db.query(
                "SELECT v.user_id, u.email, u.status as old_status FROM vendors v JOIN users u ON v.user_id = u.user_id WHERE v.vendor_id = ?",
                [id]
            );
            console.log("Found vendor rows:", rows);

            if (rows.length > 0 && rows[0].user_id) {
                const userId = rows[0].user_id;
                const emailAddress = rows[0].email;
                const oldStatus = rows[0].old_status;

                console.log(`Updating user ${userId} status to ${status}`);
                const [updateResult] = await db.execute("UPDATE users SET status = ? WHERE user_id = ?", [status, userId]);
                console.log("Update result:", updateResult);

                // Send email if status is changing and transition is to active or rejected
                if ((status === 'active' || status === 'rejected') && status !== oldStatus && emailAddress) {
                    await sendAccountStatusEmail(emailAddress, status);
                }
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

// ==========================================
// DELETE HANDLER: Handles DELETE requests for src/app/api/admin/vendors/[id]/route.js
// ==========================================
export async function DELETE(request, { params }) {
    try {
        // 1. Confirm admin credentials prior to performing delete
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;

        // 2. Fetch vendor to get linked user_id BEFORE deleting from the vendors table
        const [rows] = await db.query("SELECT user_id FROM vendors WHERE vendor_id = ?", [id]);

        // 3. Delete the Vendor record from the 'vendors' table
        await db.execute("DELETE FROM vendors WHERE vendor_id = ?", [id]);

        // 4. Cascading Delete: Clean up all customer data, order history, custom designs, 
        // and finally the user account linked to this vendor.
        if (rows.length > 0 && rows[0].user_id) {
            const userId = rows[0].user_id;
            console.log(`Cascading delete: Removing user ${userId} linked to vendor ${id}`);

            // Fetch if this user also has a customer profile associated with their account
            const [customerRows] = await db.query("SELECT customer_id FROM customers WHERE user_id = ?", [userId]);
            if (customerRows.length > 0) {
                const customerId = customerRows[0].customer_id;

                // Delete associated Order Items
                await db.query(`
                    DELETE order_items FROM order_items 
                    JOIN orders ON order_items.order_id = orders.order_id 
                    WHERE orders.customer_id = ?
                `, [customerId]);

                // Delete associated Orders
                await db.execute("DELETE FROM orders WHERE customer_id = ?", [customerId]);

                // Delete Customer Profile
                await db.execute("DELETE FROM customers WHERE customer_id = ?", [customerId]);
            }

            // Finally delete the core user record from the 'users' table
            await db.execute("DELETE FROM users WHERE user_id = ?", [userId]);
        }

        return NextResponse.json({ message: "Vendor and associated user deleted successfully" });
    } catch (error) {
        console.error("Delete Vendor Error:", error);
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}
