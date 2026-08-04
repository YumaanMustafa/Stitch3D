// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database connection tool
import db from '@/lib/db';
// Import the authentication tool to get the current user
import { getUserFromRequest } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/vendor/designs/[id]/status/route.js
 * Description: Vendor Design Request Status API.
 * This route allows a Vendor to accept or reject a custom 3D jacket design 
 * that a customer has submitted. (Updates status from 'pending' -> 'approved' or 'rejected').
 */

// ==========================================
// PUT HANDLER: Updates the status of a specific design request
// ==========================================
export async function PUT(request, { params }) {
    try {
        // Step 1: Security Check. Verify the user is logged in as a vendor.
        const vendor = getUserFromRequest(request);
        if (vendor.role !== 'vendor') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Step 2: Grab the ID of the design from the URL (e.g., /api/vendor/designs/15/status)
        const resolvedParams = await params;
        const { id } = resolvedParams;
        
        // Step 3: Read the new status sent from the vendor's dashboard
        const { status } = await request.json();

        // If they didn't provide a status, stop here.
        if (!status) return NextResponse.json({ error: "Status required" }, { status: 400 });

        // Step 4: Update the status in the database
        // We MUST include `vendor_id = ?` to ensure they are only updating THEIR OWN designs, 
        // not a competitor's designs!
        const [result] = await db.query(
            "UPDATE customized_designs SET status = ? WHERE id = ? AND vendor_id = ?",
            [status, id, vendor.id]
        );

        // If 'affectedRows' is 0, it means the database couldn't find a matching design.
        // Usually this happens if the ID is wrong, or the vendor doesn't own the design.
        if (result.affectedRows === 0) {
            return NextResponse.json({ error: "Design not found or unauthorized" }, { status: 404 });
        }

        // Success! Tell the browser it worked.
        return NextResponse.json({ message: "Status updated", status });
        
    } catch (error) {
        // Log severe crashes securely
        console.error("Update Design Status Error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
