// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';

/**
 * File: route.js
 * Location: src/app/api/general/vendors/route.js
 * Description: Public Vendors List API.
 * When a Customer finishes creating a custom 3D jacket design, they need to pick 
 * a Manufacturer (Vendor) to actually sew it. This route provides the list of shops to choose from.
 */

// ==========================================
// GET HANDLER: Fetch a list of all active vendors
// ==========================================
export async function GET() {
    try {
        // Fetch basic details for all vendors (Name, Company, Address, Specialization)
        // We don't fetch their passwords, emails, or phone numbers because this data 
        // is public and visible to customers!
        const [vendors] = await db.query("SELECT vendor_id, name, company_name, shop_address, specialization FROM vendors");
        
        // Send the list to the browser
        return NextResponse.json(vendors);
        
    } catch (error) {
        // Log crashes safely
        console.error("Failed to fetch vendors:", error);
        return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
    }
}
