import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { sendAccountStatusEmail } from '@/lib/email';

/**
 * @file route.js
 * @description Admin Supplier Management API (Single Supplier).
 * Handles updates (status approval/rejection) and deletion of suppliers.
 */

/**
 * PUT handler to update supplier details or status.
 * Syncs status changes with the linked User account.
 */
// ==========================================
// PUT HANDLER: Handles PUT requests for src/app/api/admin/suppliers/[id]/route.js
// ==========================================
export async function PUT(request, { params }) {
    try {
        // Ensure request is from an authenticated administrator
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        console.log(`[Supplier PUT] ID: ${id}, Body:`, body);

        const { company_name, business_registration_number, phone, address, status } = body;

        // 1. Fetch the linked user_id, email, and the previous status from the database.
        // This is necessary to sync statuses and send email alerts if status changes.
        const [rows] = await db.query(
            "SELECT s.user_id, u.email, u.status as old_status FROM suppliers s JOIN users u ON s.user_id = u.user_id WHERE s.supplier_id = ?",
            [id]
        );
        if (rows.length === 0) {
            return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
        }
        const userId = rows[0].user_id;
        const emailAddress = rows[0].email;
        const oldStatus = rows[0].old_status;

        // 2. Update Supplier table if details (BRN, phone, address) are provided in the payload
        if (business_registration_number || phone || address) {
            console.log("Updating supplier details...");
            await db.execute(
                "UPDATE suppliers SET business_registration_number = ?, phone = ?, address = ? WHERE supplier_id = ?",
                [business_registration_number || null, phone || null, address || null, id]
            );
        }

        // 3. Update User table (status or company_name)
        // Suppliers are backed by a record in the 'users' table, so we must sync changes there.
        if (status || company_name) {
            console.log("Updating user details...");
            const updates = [];
            const params = [];
            if (status) {
                updates.push("status = ?");
                params.push(status);
            }
            if (company_name) {
                updates.push("first_name = ?");
                params.push(company_name);
            }
            params.push(userId);
            await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`, params);

            // 4. Send account status email if the status is transitionining to 'active' or 'rejected'
            if (status && (status === 'active' || status === 'rejected') && status !== oldStatus && emailAddress) {
                await sendAccountStatusEmail(emailAddress, status);
            }
        }

        return NextResponse.json({ message: "Updated", status });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}

/**
 * DELETE handler to remove a supplier and their associated user account.
 */
// ==========================================
// DELETE HANDLER: Handles DELETE requests for src/app/api/admin/suppliers/[id]/route.js
// ==========================================
export async function DELETE(request, { params }) {
    try {
        // Enforce admin-only access for supplier deletion
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;

        // 1. Fetch supplier record to retrieve their linked user_id BEFORE deleting from suppliers table
        const [rows] = await db.query("SELECT user_id FROM suppliers WHERE supplier_id = ?", [id]);

        // 2. Delete Supplier record from the 'suppliers' table
        await db.execute("DELETE FROM suppliers WHERE supplier_id = ?", [id]);

        // 3. Cascading Delete: Delete Linked User account and any associated customer records if they exist.
        // This keeps the database clean and avoids orphaned records.
        if (rows.length > 0 && rows[0].user_id) {
            const userId = rows[0].user_id;
            console.log(`Cascading delete: Removing user ${userId} linked to supplier ${id}`);

            // Fetch if this user has a customer profile as well
            const [customerRows] = await db.query("SELECT customer_id FROM customers WHERE user_id = ?", [userId]);
            if (customerRows.length > 0) {
                const customerId = customerRows[0].customer_id;
                
                // Remove order items associated with the customer's orders
                await db.query(`
                    DELETE order_items FROM order_items 
                    JOIN orders ON order_items.order_id = orders.order_id 
                    WHERE orders.customer_id = ?
                `, [customerId]);
                
                // Remove orders and customer profile
                await db.execute("DELETE FROM orders WHERE customer_id = ?", [customerId]);
                await db.execute("DELETE FROM customers WHERE customer_id = ?", [customerId]);
            }

            // Finally delete the core user record from the 'users' table
            await db.execute("DELETE FROM users WHERE user_id = ?", [userId]);
        }

        return NextResponse.json({ message: "Supplier and associated user deleted successfully" });
    } catch (error) {
        console.error("Delete Supplier Error:", error);
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}
