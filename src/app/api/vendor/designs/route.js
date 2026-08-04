// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import the authentication tool to get the current user
import { getUserFromRequest } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/vendor/designs/route.js
 * Description: Vendor Design Requests List API.
 * This route allows a Vendor (Manufacturer) to see all the custom 3D jacket 
 * designs that customers have submitted to them for production.
 */

// Prevent caching so the list is always up-to-date
export const dynamic = 'force-dynamic';

// ==========================================
// GET HANDLER: Fetch all design requests assigned to the logged-in vendor
// ==========================================
export async function GET(request) {
    try {
        // Step 1: Security Check. Find out who is making this request.
        const vendor = getUserFromRequest(request);
        
        // If they are not logged in as a vendor, kick them out
        if (vendor.role !== 'vendor') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Step 2: Fetch all matching custom designs from the database.
        // We use a JOIN to grab the name of the customer who requested the design.
        const statsQuery = `
            SELECT cd.id AS design_id,
                   cd.name AS title,
                   CONCAT(cd.material, ' - ', cd.color) AS notes,
                   cd.status,
                   cd.created_at,
                   cd.created_at AS updated_at,
                   u.name AS user_name,
                   cd.preview AS preview_url
            FROM customized_designs cd
            LEFT JOIN users u ON cd.user_id = u.user_id
            WHERE cd.vendor_id = ?
            ORDER BY cd.created_at DESC
        `;

        // Execute the query
        const [rows] = await db.query(statsQuery, [vendor.id]);
        
        // Step 3: Send the list of designs back to the vendor's dashboard
        return NextResponse.json(rows);
        
    } catch (error) {
        // Log crashes safely
        console.error("Vendor Designs Error:", error);
        
        // If the error was just because they weren't logged in, send a 401 Unauthorized.
        // Otherwise, send a 500 Server Error.
        return NextResponse.json({ error: "Failed to fetch designs" }, { status: error.message === "Missing or invalid Authorization header" ? 401 : 500 });
    }
}
