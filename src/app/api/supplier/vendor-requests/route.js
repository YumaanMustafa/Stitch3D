import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

/**
 * @file route.js
 * @description Supplier API to fetch incoming material requests from vendors.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

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

export async function GET(request) {
    try {
        const supplier = await getSupplierFromToken(request);
        if (!supplier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

        return NextResponse.json(requests);
    } catch (error) {
        console.error("Supplier Requests GET Error:", error);
        return NextResponse.json({ error: "Failed to fetch vendor requests" }, { status: 500 });
    }
}
