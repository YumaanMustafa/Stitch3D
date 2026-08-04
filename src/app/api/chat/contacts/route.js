// Import Next.js tool for sending data back to the browser
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import our custom chat auth helpers to figure out who is requesting the contacts
import { getChatUserId, getChatUserRole } from '../auth';

/**
 * File: route.js
 * Location: src/app/api/chat/contacts/route.js
 * Description: Chat Contacts API (Customer <-> Vendor).
 * This fetches the list of people the user can chat with. 
 * - Customers see all active vendors so they can start a conversation.
 * - Vendors only see customers who have already messaged them.
 */

// =========================================================================
// GET HANDLER: Retrieves the contact list for the authenticated chat user
// =========================================================================
export async function GET(request) {
    try {
        // Step 1: Figure out who is asking for their contacts and what role they have
        const userId = await getChatUserId(request);
        const role = await getChatUserRole(request);
        
        // Stop if they aren't logged in
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Prepare empty variables for our database query
        let sql = '';
        let params = [];

        // Step 2: Build the right database query depending on their role
        if (role === 'customer') {
            // Rule: Customers can see all active vendors along with their company names
            // We use LEFT JOIN to combine the general user data with their specific vendor data
            sql = `
                SELECT u.user_id as id, u.first_name, u.last_name, u.email, u.role, v.company_name
                FROM users u
                LEFT JOIN vendors v ON u.user_id = v.user_id
                WHERE u.role = 'vendor' AND u.status = 'active'
            `;
        } else if (role === 'vendor') {
            // Rule: Vendors can only see customers who have actually exchanged messages with them
            // We use JOIN messages to only find users who share a message history with this vendor
            sql = `
                SELECT DISTINCT u.user_id as id, u.first_name, u.last_name, u.email, u.role, NULL as company_name
                FROM users u
                JOIN messages m ON (u.user_id = m.sender_id OR u.user_id = m.receiver_id)
                WHERE (m.sender_id = ? OR m.receiver_id = ?) AND u.user_id != ? AND u.role = 'customer'
            `;
            // Fill in the '?' placeholders with the vendor's user ID
            params = [userId, userId, userId];
        } else {
            // If an admin or supplier tries to use this specific route, block them
            return NextResponse.json({ error: "Role not supported for chat contacts" }, { status: 400 });
        }

        // Run the chosen query
        const [rows] = await db.query(sql, params);
        
        // Step 3: Count how many unread messages we have from each contact
        // This is so we can show those little red notification numbers in the UI
        const [unreadCounts] = await db.query(`
            SELECT sender_id, COUNT(*) as unread_count 
            FROM messages 
            WHERE receiver_id = ? AND is_read = 0 
            GROUP BY sender_id
        `, [userId]);

        // Step 4: Attach the unread count to each contact before sending it to the frontend
        const contacts = rows.map(contact => {
            // Look through the unreadCounts array to find the match for this contact
            const unread = unreadCounts.find(u => u.sender_id === contact.id);
            return {
                ...contact, // Keep all the original contact info
                unread_count: unread ? unread.unread_count : 0 // Add the count, or 0 if none exist
            };
        });

        // Send the final list of contacts back to the browser
        return NextResponse.json(contacts);
        
    } catch (error) {
        // Log any database crashes safely
        console.error("Fetch Contacts API Error:", error);
        return NextResponse.json({ error: "Database error fetching contacts" }, { status: 500 });
    }
}
