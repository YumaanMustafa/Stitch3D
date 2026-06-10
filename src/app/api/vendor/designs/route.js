
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * @file route.js
 * @description Vendor Design Requests List API.
 * Fetches all design requests assigned to the authenticated vendor.
 */

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const vendor = getUserFromRequest(request);
        if (vendor.role !== 'vendor') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

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

        const [rows] = await db.query(statsQuery, [vendor.id]);
        return NextResponse.json(rows);
    } catch (error) {
        console.error("Vendor Designs Error:", error);
        return NextResponse.json({ error: "Failed to fetch designs" }, { status: error.message === "Missing or invalid Authorization header" ? 401 : 500 });
    }
}
