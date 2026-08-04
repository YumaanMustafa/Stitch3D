// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import jsonwebtoken to read login tokens
import jwt from 'jsonwebtoken';

/**
 * File: route.js
 * Location: src/app/api/supplier/vendor-requests/route.js
 * Description: Supplier API to fetch incoming material requests from vendors.
 * This loads a list of all the materials that Manufacturers (Vendors) are asking 
 * the Supplier to provide.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// ==========================================
// HELPER FUNCTION: Verify Token
// ==========================================
async function getSupplierFromToken(request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'supplier') return null;
        // The token already contains the supplier_id as 'id'
        return { supplier_id: decoded.id };
    } catch (err) {
        return null;
    }
}

// ==========================================
// GET HANDLER: Handles GET requests to load the supplier's inbox of material requests
// ==========================================
export async function GET(request) {
    try {
        // Step 1: Security Check
        const supplier = await getSupplierFromToken(request);
        if (!supplier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Fetch all requests sent to this specific supplier
        // We use a lot of JOINs here because a single "request" is connected to 
        // a Vendor's details, the Supplier's actual inventory (to get the unit price), 
        // and any Bills that might have already been generated for it.
        const [requests] = await db.query(`
            SELECT 
                mr.*, 
                v.name as vendor_name, 
                v.company_name as vendor_company_name,
                si.price as unit_price,
                b.item_price,
                b.tax,
                b.shipping,
                b.total
            FROM material_requests mr
            JOIN vendors v ON mr.vendor_id = v.vendor_id
            LEFT JOIN bills b ON mr.id = b.request_id
            LEFT JOIN supplier_inventory si ON (
                si.supplier_id = mr.supplier_id AND 
                si.name = mr.material_name AND 
                si.type = mr.type
            )
            WHERE mr.supplier_id = ?
            ORDER BY mr.created_at DESC
        `, [supplier.supplier_id]);

        // Send the complete list of requests back to the dashboard
        return NextResponse.json(requests);
        
    } catch (error) {
        // Log crashes securely
        console.error("Supplier Requests GET Error:", error);
        return NextResponse.json({ error: "Failed to fetch vendor requests" }, { status: 500 });
    }
}
