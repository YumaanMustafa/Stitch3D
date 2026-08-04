// Import Next.js tool for sending data back to the browser
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import our custom chat auth helpers
import { getChatUserId, getChatUserRole } from '../auth';

/**
 * File: route.js
 * Location: src/app/api/chat/contacts-vendor/route.js
 * Description: Chat Contacts API (Supplier -> Vendor).
 * This fetches the list of Manufacturers (Vendors) a Supplier can chat with.
 * A Supplier only sees Vendors who have actually ordered materials from them.
 */

// ==========================================
// GET HANDLER: Handles GET requests to load a Supplier's Vendor contacts
// ==========================================
export async function GET(request) {
    try {
        // Step 1: Figure out who is asking for the contacts
        const userId = await getChatUserId(request);
        const role = await getChatUserRole(request);
        
        // Security Check: Make sure they are logged in and they are actually a Supplier
        if (!userId || role !== 'supplier') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Step 2: Fetch all Vendors that have ordered from this Supplier
        // We link the users table to the vendors table, check the material_requests they made, 
        // and link it back to the specific supplier asking for the data.
        const sql = `
            SELECT DISTINCT u.user_id as id, u.first_name, u.last_name, u.email, u.role, v.company_name
            FROM users u
            JOIN vendors v ON u.user_id = v.user_id
            JOIN material_requests m ON v.vendor_id = m.vendor_id
            JOIN suppliers s ON m.supplier_id = s.supplier_id
            WHERE s.user_id = ?
        `;
        
        // Execute the query using the supplier's user ID
        const [rows] = await db.query(sql, [userId]);
        
        // Step 3: Count how many unread messages this Supplier has from each Vendor
        const [unreadCounts] = await db.query(`
            SELECT sender_id, COUNT(*) as unread_count 
            FROM messages 
            WHERE receiver_id = ? AND is_read = 0 
            GROUP BY sender_id
        `, [userId]);

        // Step 4: Attach the unread message numbers to the contact list
        const contacts = rows.map(contact => {
            // Look for this contact in the unread counts list
            const unread = unreadCounts.find(u => u.sender_id === contact.id);
            return {
                ...contact, // Keep the contact's name, email, etc.
                unread_count: unread ? unread.unread_count : 0 // Add the number of unread messages
            };
        });

        // Send the finalized contact list back to the supplier's chat window
        return NextResponse.json(contacts);
        
    } catch (error) {
        // Log database crashes securely
        console.error("Fetch Supplier Contacts API Error:", error);
        return NextResponse.json({ error: "Database error fetching contacts" }, { status: 500 });
    }
}
