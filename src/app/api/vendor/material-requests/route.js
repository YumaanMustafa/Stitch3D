// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import authentication tools
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/vendor/material-requests/route.js
 * Description: Vendor Material Requests API (Business-to-Business).
 * This allows a Vendor (Manufacturer) to view all the raw materials (leather, zippers) 
 * they have ordered from Suppliers (GET), and allows them to place new orders (POST).
 */

// ==========================================
// HELPER FUNCTION: Verify Token and get Vendor ID
// ==========================================
async function getVendorFromToken(request) {
    try {
        const payload = getVendorFromRequest(request);
        if (!payload) return null;
        const vendorId = await getVendorIdFromUser(payload);
        return vendorId ? { vendor_id: vendorId } : null;
    } catch (e) {
        return null;
    }
}

// =========================================================================
// GET HANDLER: Fetch all B2B material requests made by this vendor
// =========================================================================
export async function GET(request) {
    try {
        // Step 1: Security Check
        const vendor = await getVendorFromToken(request);
        if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Fetch the list of requests from the database
        // We JOIN the suppliers and users tables so we can show the supplier's actual name.
        // We JOIN the bills table so we can show the quoted price (if the supplier sent one).
        const [requests] = await db.query(`
            SELECT mr.*, s_user.first_name as supplier_first_name, s_user.last_name as supplier_last_name, 
                   b.item_price, b.tax, b.shipping, b.total
            FROM material_requests mr
            JOIN suppliers s ON mr.supplier_id = s.supplier_id
            JOIN users s_user ON s.user_id = s_user.user_id
            LEFT JOIN bills b ON mr.id = b.request_id
            WHERE mr.vendor_id = ?
            ORDER BY mr.created_at DESC
        `, [vendor.vendor_id]);

        // Send the list back to the browser
        return NextResponse.json(requests);
        
    } catch (error) {
        // Log crashes securely
        console.error("Vendor Requests GET Error:", error);
        return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
    }
}

// =========================================================================
// POST HANDLER: Create a new B2B material request (ask a supplier for materials)
// =========================================================================
export async function POST(request) {
    try {
        // Step 1: Security Check
        const vendor = await getVendorFromToken(request);
        if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Read the form data the vendor filled out
        const body = await request.json();
        const { material_name, type, quantity, size, urgency, supplier_id } = body;

        // Step 3: Validate that they filled out all required fields
        if (!material_name || !type || !quantity || !size || !urgency || !supplier_id) {
            return NextResponse.json({ message: "All necessary fields must be filled" }, { status: 400 });
        }

        // Step 4: Insert the new request into the database with a status of 'pending'
        const [result] = await db.query(`
            INSERT INTO material_requests (vendor_id, supplier_id, material_name, type, quantity, size, urgency, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `, [vendor.vendor_id, supplier_id, material_name, type, quantity, size, urgency]);

        // Step 5: Notify the Supplier that they have a new order waiting!
        try {
            // Find the supplier's main user account ID
            const [suppliers] = await db.query("SELECT user_id FROM suppliers WHERE supplier_id = ?", [supplier_id]);
            if (suppliers.length > 0) {
                // Send the alert
                await db.query(
                    "INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, 'supplier', ?, ?, 'request')",
                    [suppliers[0].user_id, "New Material Request", `A vendor has requested ${quantity}x ${material_name}.`, "request"]
                );
            }
        } catch (err) {
            // Log notification errors safely
            console.error("Non-fatal notification error:", err);
        }

        // Tell the vendor their request was sent successfully
        return NextResponse.json({ 
            message: "Material request generated successfully", 
            requestId: result.insertId // The ID of the newly created request
        }, { status: 201 });

    } catch (error) {
        // Log severe crashes securely
        console.error("Vendor Requests POST Error:", error);
        return NextResponse.json({ 
            message: "Unable to generate material request, please try again later" 
        }, { status: 500 });
    }
}
