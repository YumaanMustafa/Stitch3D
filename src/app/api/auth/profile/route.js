
import { NextResponse } from "next/server";
import { getUserFromRequest } from '@/lib/auth';
import db from '@/lib/db';

/**
 * @file route.js
 * @description User Profile Management API.
 * - GET: Fetch current user profile (including customer details if applicable).
 * - PUT: Update user profile and customer-specific fields.
 */

// Helper: Find user by ID
async function findUserById(id) {
    const [rows] = await db.query(
        "SELECT user_id, first_name, last_name, email, role, status, created_at, deletion_requested_at FROM users WHERE user_id = ?",
        [id]
    );
    return rows.length ? rows[0] : null;
}

// Helper: Find customer
async function findCustomerByUserId(userId) {
    const [rows] = await db.query("SELECT * FROM customers WHERE user_id = ?", [userId]);
    return rows.length ? rows[0] : null;
}

/**
 * GET handler to retrieve user profile.
 */
export async function GET(req) {
    try {
        const userPayload = getUserFromRequest(req);
        const user = await findUserById(userPayload.id);

        if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

        if (user.role === "customer") {
            const customer = await findCustomerByUserId(user.user_id);
            return NextResponse.json({ ...user, customer });
        }

        return NextResponse.json(user);

    } catch (err) {
        console.error("Profile GET error:", err.message);
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
}

export async function PUT(req) {
    try {
        const userPayload = getUserFromRequest(req);
        const body = await req.json();
        const { firstName, lastName } = body;
        const { id } = userPayload;

        const hasUserFields = !!(firstName || lastName);
        const hasCustomer = !!body.customer;

        if (!hasUserFields && !hasCustomer) {
            return NextResponse.json({ message: "At least one field is required" }, { status: 400 });
        }

        // Update User Fields
        const fields = [];
        const values = [];
        if (firstName) { fields.push("first_name = ?"); values.push(firstName); }
        if (lastName) { fields.push("last_name = ?"); values.push(lastName); }

        if (fields.length) {
            values.push(id);
            await db.query(`UPDATE users SET ${fields.join(", ")} WHERE user_id = ?`, values);
        }

        // Update Customer Fields
        if (hasCustomer) {
            const customer = body.customer || {};
            const cFields = [];
            const cValues = [];
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

export async function POST(req) {
    try {
        const userPayload = getUserFromRequest(req);
        if (!userPayload || !userPayload.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { action } = body;

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

export async function DELETE(req) {
    try {
        const userPayload = getUserFromRequest(req);
        if (!userPayload || !userPayload.id) {
             return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const { reason } = body;
        
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
