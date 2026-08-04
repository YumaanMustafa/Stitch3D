// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database connection tool
import db from '@/lib/db';
// Import our custom auth tool to check admin status
import { getUserFromRequest } from '@/lib/auth';
// Import our custom email tool to send approval/rejection emails
import { sendAccountStatusEmail } from '@/lib/email';

/**
 * File: route.js
 * Location: src/app/api/admin/suppliers/[id]/route.js
 * Description: Admin Supplier Management API (For a single supplier).
 * This route allows an Admin to do two dangerous actions:
 * 1. PUT: Change a supplier's details or approve/reject their account.
 * 2. DELETE: Completely wipe a supplier's account from the system.
 */

// ==========================================
// PUT HANDLER: Handles PUT requests to update or approve/reject a supplier
// ==========================================
export async function PUT(request, { params }) {
    try {
        // Step 1: Security Check. Ensure the request is from an authenticated admin.
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Step 2: Grab the ID of the supplier we are editing from the URL
        const { id } = await params;
        
        // Read the new data sent by the Admin
        const body = await request.json();
        const { company_name, business_registration_number, phone, address, status } = body;

        // Step 3: Fetch the linked user_id, email, and their current status from the database.
        // We need this information to know if the status is actually changing, so we know whether to send an email.
        const [rows] = await db.query(
            "SELECT s.user_id, u.email, u.status as old_status FROM suppliers s JOIN users u ON s.user_id = u.user_id WHERE s.supplier_id = ?",
            [id]
        );
        
        // If the supplier doesn't exist, stop here
        if (rows.length === 0) {
            return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
        }
        
        // Store the old details for later comparison
        const userId = rows[0].user_id;
        const emailAddress = rows[0].email;
        const oldStatus = rows[0].old_status;

        // Step 4: Update the 'suppliers' table with new business details (if any were provided)
        if (business_registration_number || phone || address) {
            await db.execute(
                "UPDATE suppliers SET business_registration_number = ?, phone = ?, address = ? WHERE supplier_id = ?",
                [business_registration_number || null, phone || null, address || null, id]
            );
        }

        // Step 5: Update the core 'users' table
        // Because Suppliers are backed by a master record in the 'users' table, we must update things like their status there.
        if (status || company_name) {
            // We use an array to build the SQL query dynamically based on what needs to change
            const updates = [];
            const sqlParams = [];
            
            if (status) {
                updates.push("status = ?");
                sqlParams.push(status);
            }
            if (company_name) {
                updates.push("first_name = ?");
                sqlParams.push(company_name);
            }
            
            sqlParams.push(userId); // Add the user ID to the end for the WHERE clause
            
            // Execute the dynamic update
            await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`, sqlParams);

            // Step 6: Send an email to the supplier if the Admin just approved ('active') or 'rejected' them
            // We only send it if the status actually changed from what it was before.
            if (status && (status === 'active' || status === 'rejected') && status !== oldStatus && emailAddress) {
                await sendAccountStatusEmail(emailAddress, status);
            }
        }

        // Tell the admin dashboard it was successful
        return NextResponse.json({ message: "Updated", status });
        
    } catch (error) {
        // Log crashes securely
        console.error(error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}


// ==========================================
// DELETE HANDLER: Handles DELETE requests to completely remove a supplier
// ==========================================
export async function DELETE(request, { params }) {
    try {
        // Step 1: Security Check. Enforce admin-only access for supplier deletion.
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Grab the ID of the supplier to delete
        const { id } = await params;

        // Step 2: Look up the supplier BEFORE deleting them so we can find their linked 'user_id'
        const [rows] = await db.query("SELECT user_id FROM suppliers WHERE supplier_id = ?", [id]);

        // Step 3: Delete the Supplier's business record from the 'suppliers' table
        await db.execute("DELETE FROM suppliers WHERE supplier_id = ?", [id]);

        // Step 4: Cascading Delete
        // We must also delete their linked User account and any associated customer records to keep the database clean.
        if (rows.length > 0 && rows[0].user_id) {
            const userId = rows[0].user_id;

            // Check if this specific user also happens to have a customer profile
            const [customerRows] = await db.query("SELECT customer_id FROM customers WHERE user_id = ?", [userId]);
            
            if (customerRows.length > 0) {
                const customerId = customerRows[0].customer_id;
                
                // If they are a customer, they might have orders. We must delete those first.
                // We delete the line items (shirts, hats, etc.) inside the orders first...
                await db.query(`
                    DELETE order_items FROM order_items 
                    JOIN orders ON order_items.order_id = orders.order_id 
                    WHERE orders.customer_id = ?
                `, [customerId]);
                
                // ...then we can safely delete the empty orders themselves...
                await db.execute("DELETE FROM orders WHERE customer_id = ?", [customerId]);
                // ...and finally delete the customer profile.
                await db.execute("DELETE FROM customers WHERE customer_id = ?", [customerId]);
            }

            // Finally, delete the core user record from the main 'users' table
            await db.execute("DELETE FROM users WHERE user_id = ?", [userId]);
        }

        // Return a success message
        return NextResponse.json({ message: "Supplier and associated user deleted successfully" });
        
    } catch (error) {
        // Log any crashes securely
        console.error("Delete Supplier Error:", error);
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}
