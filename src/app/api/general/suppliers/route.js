// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database connection tool
import db from '@/lib/db';

/**
 * File: route.js
 * Location: src/app/api/general/suppliers/route.js
 * Description: General API to fetch active suppliers.
 * When a Vendor is filling out a form to request raw materials, this route 
 * provides the dropdown list of all active Suppliers they can order from.
 */

// ==========================================
// GET HANDLER: Fetch a basic list of all active suppliers
// ==========================================
export async function GET() {
    try {
        // Step 1: Query the database
        // We use a JOIN to combine the 'suppliers' table with the main 'users' table, 
        // so we can grab the supplier's first and last name.
        // We also filter by `status = 'active'` to ensure we don't show banned or suspended accounts.
        const [suppliers] = await db.query(`
            SELECT s.supplier_id, u.first_name, u.last_name, u.email 
            FROM suppliers s
            JOIN users u ON s.user_id = u.user_id
            WHERE u.role = 'supplier' AND u.status = 'active'
        `);

        // Step 2: Format names for display in the dropdown
        // Sometimes users don't provide a first/last name. If the name is blank, 
        // we fall back to showing their email address instead.
        const formattedSuppliers = suppliers.map(s => ({
            id: s.supplier_id,
            name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email,
            email: s.email
        }));

        // Send the formatted list back to the browser
        return NextResponse.json(formattedSuppliers);
        
    } catch (error) {
        // Log crashes securely
        console.error("General Suppliers GET Error:", error);
        return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
    }
}
