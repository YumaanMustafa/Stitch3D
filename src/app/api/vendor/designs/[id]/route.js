// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import our custom authentication tools
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/vendor/designs/[id]/route.js
 * Description: Vendor API to fetch details of a specific design.
 * When a vendor clicks on one of the custom jacket designs a customer sent them, 
 * this route loads the full 3D data (views, snapshots, materials) so the vendor 
 * can review it in detail.
 */

// ==========================================
// HELPER FUNCTION: Get Vendor ID securely
// ==========================================
async function getVendorId(request) {
    try {
        const payload = getVendorFromRequest(request);
        if (!payload) return null;
        // Convert the generic user_id into the specific vendor_id needed for database queries
        return await getVendorIdFromUser(payload);
    } catch (e) {
        return null;
    }
}

// ==========================================
// GET HANDLER: Fetch details of a specific custom design
// ==========================================
export async function GET(request, { params }) {
    try {
        // Step 1: Security Check
        const vendorId = await getVendorId(request);
        if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Grab the ID of the specific design from the URL (e.g. /designs/15)
        const resolvedParams = await params;
        const { id } = resolvedParams;

        // Step 3: Fetch the design details from the database
        // We include 'vendor_id = ?' to make absolutely sure they can't snoop on 
        // designs assigned to a completely different vendor!
        const [rows] = await db.query(
            "SELECT id, name, color, material, size, views, snapshots FROM customized_designs WHERE id = ? AND vendor_id = ?",
            [id, vendorId]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: "Design not found" }, { status: 404 });
        }

        // Step 4: Clean up the data
        // The 'views' and 'snapshots' (which hold the 3D camera angles and images) 
        // are stored as long strings in the database. We need to convert them 
        // back into standard JavaScript objects using JSON.parse.
        const design = {
            id: rows[0].id,
            title: rows[0].name,
            color: rows[0].color,
            material: rows[0].material,
            size: rows[0].size || null,
            views: rows[0].views ? JSON.parse(rows[0].views) : {},
            snapshots: rows[0].snapshots ? JSON.parse(rows[0].snapshots) : {}
        };

        // Step 5: Send the clean design data back to the browser
        return NextResponse.json(design);
        
    } catch (error) {
        // Log severe crashes securely
        console.error("Design detail fetch error:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}
