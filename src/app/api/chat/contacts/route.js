import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getChatUserId, getChatUserRole } from '../auth';

// =========================================================================
// GET HANDLER: Retrieves the contact list for the authenticated chat user
// =========================================================================
export async function GET(request) {
    try {
        // 1. Authenticate user and extract their role
        const userId = await getChatUserId(request);
        const role = await getChatUserRole(request);
        
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        let sql = '';
        let params = [];

        // 2. Fetch contacts based on role
        if (role === 'customer') {
            // Customers can see all active vendors along with their company names to start a conversation
            sql = `
                SELECT u.user_id as id, u.first_name, u.last_name, u.email, u.role, v.company_name
                FROM users u
                LEFT JOIN vendors v ON u.user_id = v.user_id
                WHERE u.role = 'vendor' AND u.status = 'active'
            `;
        } else if (role === 'vendor') {
            // Vendors can see only the customers who have exchanged messages with them
            sql = `
                SELECT DISTINCT u.user_id as id, u.first_name, u.last_name, u.email, u.role, NULL as company_name
                FROM users u
                JOIN messages m ON (u.user_id = m.sender_id OR u.user_id = m.receiver_id)
                WHERE (m.sender_id = ? OR m.receiver_id = ?) AND u.user_id != ? AND u.role = 'customer'
            `;
            params = [userId, userId, userId];
        } else {
            return NextResponse.json({ error: "Role not supported for chat contacts" }, { status: 400 });
        }

        const [rows] = await db.query(sql, params);
        
        // 3. Count unread messages received from each contact to display badging in the UI
        const [unreadCounts] = await db.query(`
            SELECT sender_id, COUNT(*) as unread_count 
            FROM messages 
            WHERE receiver_id = ? AND is_read = 0 
            GROUP BY sender_id
        `, [userId]);

        // 4. Map the contact rows to include their specific unread message counts
        const contacts = rows.map(contact => {
            const unread = unreadCounts.find(u => u.sender_id === contact.id);
            return {
                ...contact,
                unread_count: unread ? unread.unread_count : 0
            };
        });

        return NextResponse.json(contacts);
    } catch (error) {
        console.error("Fetch Contacts API Error:", error);
        return NextResponse.json({ error: "Database error fetching contacts" }, { status: 500 });
    }
}
