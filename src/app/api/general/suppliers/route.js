import { NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * @file route.js
 * @description General API to fetch active suppliers for the vendor's material request form.
 */

export async function GET() {
    try {
        const [suppliers] = await db.query(`
            SELECT s.supplier_id, u.first_name, u.last_name, u.email 
            FROM suppliers s
            JOIN users u ON s.user_id = u.user_id
            WHERE u.role = 'supplier' AND u.status = 'active'
        `);

        // Format names for display
        const formattedSuppliers = suppliers.map(s => ({
            id: s.supplier_id,
            name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email,
            email: s.email
        }));

        return NextResponse.json(formattedSuppliers);
    } catch (error) {
        console.error("General Suppliers GET Error:", error);
        return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
    }
}
