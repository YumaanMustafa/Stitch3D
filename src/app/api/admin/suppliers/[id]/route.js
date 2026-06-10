import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * @file route.js
 * @description Admin Supplier Management API (Single Supplier).
 * Handles updates (status approval/rejection) and deletion of suppliers.
 */

/**
 * PUT handler to update supplier details or status.
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
        console.log(`[Supplier PUT] ID: ${id}, Body:`, body);

        const { company_name, business_registration_number, phone, address, status } = body;

        // 1. Fetch user_id for potential updates
        const [rows] = await db.query("SELECT user_id FROM suppliers WHERE supplier_id = ?", [id]);
        if (rows.length === 0) {
            return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
        }
        const userId = rows[0].user_id;

        // 2. Update Supplier table if details provided
        if (business_registration_number || phone || address) {
            console.log("Updating supplier details...");
            await db.execute(
                "UPDATE suppliers SET business_registration_number = ?, phone = ?, address = ? WHERE supplier_id = ?",
                [business_registration_number || null, phone || null, address || null, id]
            );
        }

        // 3. Update User table (status or first_name/company_name)
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
export async function DELETE(request, { params }) {
    try {
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;

        // Fetch supplier to get linked user_id BEFORE deleting
        const [rows] = await db.query("SELECT user_id FROM suppliers WHERE supplier_id = ?", [id]);

        // 2. Delete Supplier record
        await db.execute("DELETE FROM suppliers WHERE supplier_id = ?", [id]);

        // 3. Delete Linked User and their Data if exists
        if (rows.length > 0 && rows[0].user_id) {
            const userId = rows[0].user_id;
            console.log(`Cascading delete: Removing user ${userId} linked to supplier ${id}`);

            // Cleanup Customer Data (if they were also a customer, though role-wise they are suppliers)
            const [customerRows] = await db.query("SELECT customer_id FROM customers WHERE user_id = ?", [userId]);
            if (customerRows.length > 0) {
                const customerId = customerRows[0].customer_id;
                await db.query(`
                    DELETE order_items FROM order_items 
                    JOIN orders ON order_items.order_id = orders.order_id 
                    WHERE orders.customer_id = ?
                `, [customerId]);
                await db.execute("DELETE FROM orders WHERE customer_id = ?", [customerId]);
                await db.execute("DELETE FROM customers WHERE customer_id = ?", [customerId]);
            }

            // Delete User record
            await db.execute("DELETE FROM users WHERE user_id = ?", [userId]);
        }

        return NextResponse.json({ message: "Supplier and associated user deleted successfully" });
    } catch (error) {
        console.error("Delete Supplier Error:", error);
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}
