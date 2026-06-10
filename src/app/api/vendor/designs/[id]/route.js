import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

/**
 * @file route.js
 * @description Vendor API to fetch details of a specific design.
 */

async function getVendorId(request) {
    try {
        const payload = getVendorFromRequest(request);
        if (!payload) return null;
        return await getVendorIdFromUser(payload);
    } catch (e) {
        return null;
    }
}

export async function GET(request, { params }) {
    try {
        const vendorId = await getVendorId(request);
        if (!vendorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const resolvedParams = await params;
        const { id } = resolvedParams;

        const [rows] = await db.query(
            "SELECT id, name, color, material, views, snapshots FROM customized_designs WHERE id = ? AND vendor_id = ?",
            [id, vendorId]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: "Design not found" }, { status: 404 });
        }

        const design = {
            id: rows[0].id,
            title: rows[0].name,
            color: rows[0].color,
            material: rows[0].material,
            views: rows[0].views ? JSON.parse(rows[0].views) : {},
            snapshots: rows[0].snapshots ? JSON.parse(rows[0].snapshots) : {}
        };

        return NextResponse.json(design);
    } catch (error) {
        console.error("Design detail fetch error:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}
