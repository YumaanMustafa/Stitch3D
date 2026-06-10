
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * @file route.js
 * @description Vendor Design Request Status API.
 * Updates the status of a specific design request (e.g., pending -> approved).
 */

export async function PUT(request, { params }) {
    try {
        const vendor = getUserFromRequest(request);
        if (vendor.role !== 'vendor') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const resolvedParams = await params;
        const { id } = resolvedParams;
        const { status } = await request.json();

        if (!status) return NextResponse.json({ error: "Status required" }, { status: 400 });

        const [result] = await db.query(
            "UPDATE customized_designs SET status = ? WHERE id = ? AND vendor_id = ?",
            [status, id, vendor.id]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: "Design not found or unauthorized" }, { status: 404 });
        }

        return NextResponse.json({ message: "Status updated", status });
    } catch (error) {
        console.error("Update Design Status Error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
