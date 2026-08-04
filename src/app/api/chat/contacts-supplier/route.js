// Import Next.js tool for sending data back to the browser
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import our custom chat auth helpers
import { getChatUserId, getChatUserRole } from '../auth';

/**
 * File: route.js
 * Location: src/app/api/chat/contacts-supplier/route.js
 * Description: Chat Contacts API (Vendor -> Supplier).
 * This fetches the list of Raw Material Suppliers a Vendor can chat with.
 * A Vendor can only chat with a Supplier if they have initiated a material request with them.
 */

// ==========================================
// GET HANDLER: Handles GET requests to load a Vendor's Supplier contacts
// ==========================================
export async function GET(request) {
    try {
        // Step 1: Figure out who is asking for the contacts
        const userId = await getChatUserId(request);
        const role = await getChatUserRole(request);
        
        // Security Check: Make sure they are logged in and they are actually a Vendor
        if (!userId || role !== 'vendor') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Step 2: Fetch all Suppliers this vendor has initiated requests to
        // We use multiple JOINs to connect the user > supplier > material_request > vendor chain
        const sql = `
            SELECT DISTINCT u.user_id as id, u.first_name, u.last_name, u.email, u.role, NULL as company_name
            FROM users u
            JOIN suppliers s ON u.user_id = s.user_id
            JOIN material_requests m ON s.supplier_id = m.supplier_id
            JOIN vendors v ON m.vendor_id = v.vendor_id
            WHERE v.user_id = ?
        `;
        
        // Execute the query using the vendor's user ID
        const [rows] = await db.query(sql, [userId]);
        
        // Step 3: Check the database to see if any of these suppliers sent us messages we haven't read yet
        const [unreadCounts] = await db.query(`
            SELECT sender_id, COUNT(*) as unread_count 
            FROM messages 
            WHERE receiver_id = ? AND is_read = 0 
            GROUP BY sender_id
        `, [userId]);

        // Step 4: Add the unread message counts to the contact list
        const contacts = rows.map(contact => {
            // Find the matching unread count for this specific supplier
            const unread = unreadCounts.find(u => u.sender_id === contact.id);
            return {
                ...contact, // Keep the original contact info
                unread_count: unread ? unread.unread_count : 0 // Attach the unread count
            };
        });

        // Send the finalized contact list back to the chat interface
        return NextResponse.json(contacts);
        
    } catch (error) {
        // Log database crashes securely
        console.error("Fetch Vendor Contacts API Error:", error);
        return NextResponse.json({ error: "Database error fetching contacts" }, { status: 500 });
    }
}
