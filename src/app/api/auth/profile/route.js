// Import Next.js response helper to send data back to the browser
import { NextResponse } from "next/server";
// Import our custom auth tool to decrypt the user's login token
import { getUserFromRequest } from '@/lib/auth';
// Import the database tool
import db from '@/lib/db';

/**
 * File: route.js
 * Location: src/app/api/auth/profile/route.js
 * Description: User Profile Management API.
 * This file has multiple handlers (GET, PUT, POST, DELETE) that allow a user 
 * to view, edit, and request deletion of their account profile.
 */

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Helper function to find basic user details from the 'users' table
async function findUserById(id) {
    const [rows] = await db.query(
        "SELECT user_id, first_name, last_name, email, role, status, created_at, deletion_requested_at FROM users WHERE user_id = ?",
        [id]
    );
    return rows.length ? rows[0] : null;
}

// Helper function to find extra details from the 'customers' table 
// (Things like address and phone number)
async function findCustomerByUserId(userId) {
    const [rows] = await db.query("SELECT * FROM customers WHERE user_id = ?", [userId]);
    return rows.length ? rows[0] : null;
}


// ==========================================
// GET HANDLER: Get the user's current profile data
// ==========================================
export async function GET(req) {
    try {
        // Step 1: Make sure the user is logged in by checking their token
        // PRIVILEGE 1: Secure Data Access
        // Customers (and other users) can only fetch their own profile data.
        // We use the decoded token to identify their exact user_id securely.
        const userPayload = getUserFromRequest(req);
        
        // Step 2: Fetch their basic info from the database
        const user = await findUserById(userPayload.id);

        // If they don't exist anymore, return an error
        if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

        // Step 3: If they are a customer, they have extra details we should fetch
        if (user.role === "customer") {
            const customer = await findCustomerByUserId(user.user_id);
            // Combine basic user info and customer info together and send it back
            return NextResponse.json({ ...user, customer });
        }

        // If they aren't a customer, just send their basic info
        return NextResponse.json(user);

    } catch (err) {
        console.error("Profile GET error:", err.message);
        // If the token fails, tell the browser they are Unauthorized
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
}

// ==========================================
// PUT HANDLER: Update the user's profile data
// ==========================================
export async function PUT(req) {
    try {
        // Step 1: Check if they are logged in
        const userPayload = getUserFromRequest(req);
        const { id } = userPayload;

        // Step 2: Get the new data they want to save
        const body = await req.json();
        const { firstName, lastName } = body;

        // Figure out what they are actually trying to update
        const hasUserFields = !!(firstName || lastName);
        const hasCustomer = !!body.customer;

        // If they sent nothing to update, return an error
        if (!hasUserFields && !hasCustomer) {
            return NextResponse.json({ message: "At least one field is required" }, { status: 400 });
        }

        // Step 3: Update Basic User Fields (First name, Last name)
        const fields = [];
        const values = [];
        
        // Build the SQL query dynamically based on what they provided
        if (firstName) { fields.push("first_name = ?"); values.push(firstName); }
        if (lastName) { fields.push("last_name = ?"); values.push(lastName); }

        if (fields.length) {
            values.push(id);
            await db.query(`UPDATE users SET ${fields.join(", ")} WHERE user_id = ?`, values);
        }

        // Step 4: Update Customer-Specific Fields (Address, Phone, etc)
        if (hasCustomer) {
            const customer = body.customer || {};
            const cFields = [];
            const cValues = [];
            
            // Build the SQL query for the customer table dynamically
            if (customer.phone_number !== undefined) { cFields.push("phone_number = ?"); cValues.push(customer.phone_number || null); }
            if (customer.address !== undefined) { cFields.push("address = ?"); cValues.push(customer.address || null); }
            if (customer.city !== undefined) { cFields.push("city = ?"); cValues.push(customer.city || null); }
            if (customer.country !== undefined) { cFields.push("country = ?"); cValues.push(customer.country || null); }
            if (customer.postal_code !== undefined) { cFields.push("postal_code = ?"); cValues.push(customer.postal_code || null); }

            if (cFields.length) {
                cValues.push(id);
                await db.query(`UPDATE customers SET ${cFields.join(", ")} WHERE user_id = ?`, cValues);
            }
        }

        // Step 5: Fetch the freshly updated profile and send it back to the browser
        const updated = await findUserById(id);
        if (updated.role === "customer") {
            const customer = await findCustomerByUserId(id);
            return NextResponse.json({ message: "Profile updated successfully", user: updated, customer });
        }
        return NextResponse.json({ message: "Profile updated successfully", user: updated });

    } catch (err) {
        console.error("Profile PUT error:", err.message);
        return NextResponse.json({ message: err.message === "Missing token" ? "Unauthorized" : "Server error" }, { status: err.message === "Missing token" ? 401 : 500 });
    }
}

// ==========================================
// POST HANDLER: Special actions like canceling an account deletion
// ==========================================
export async function POST(req) {
    try {
        const userPayload = getUserFromRequest(req);
        if (!userPayload || !userPayload.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { action } = body;

        // If they clicked "Cancel Deletion", restore their account back to active
        if (action === "cancel_deletion") {
            await db.query("UPDATE users SET status = 'active', deletion_requested_at = NULL, deletion_reason = NULL WHERE user_id = ?", [userPayload.id]);
            return NextResponse.json({ message: "Deletion request cancelled successfully" });
        }

        return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    } catch (err) {
        console.error("Profile POST error:", err.message);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ==========================================
// DELETE HANDLER: Request to delete account
// ==========================================
export async function DELETE(req) {
    try {
        const userPayload = getUserFromRequest(req);
        if (!userPayload || !userPayload.id) {
             return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Get the reason why they are leaving (if provided)
        const body = await req.json().catch(() => ({}));
        const { reason } = body;
        
        // Instead of instantly deleting, we set their status to 'deletion_requested'.
        // This gives them 72 hours to change their mind.
        await db.query(
            "UPDATE users SET status = 'deletion_requested', deletion_requested_at = NOW(), deletion_reason = ? WHERE user_id = ?", 
            [reason || "No reason provided", userPayload.id]
        );
        
        return NextResponse.json({ message: "Deletion scheduled. Your account will be removed in 72 hours." });
    } catch (err) {
        console.error("Profile DELETE error:", err.message);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
