import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getChatUserId, getChatUserRole } from '../auth';

export async function GET(request) {
    try {
        const userId = await getChatUserId(request);
        const role = await getChatUserRole(request);
        
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        let sql = '';
        let params = [];

        if (role === 'customer') {
            // Customer can see all active vendors with their company names
            sql = `
                SELECT u.user_id as id, u.first_name, u.last_name, u.email, u.role, v.company_name
                FROM users u
                LEFT JOIN vendors v ON u.user_id = v.user_id
                WHERE u.role = 'vendor' AND u.status = 'active'
            `;
        } else if (role === 'vendor') {
            // Vendor sees anyone who has messaged them or they have messaged
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
        
        // Count unread messages per contact
        const [unreadCounts] = await db.query(`
            SELECT sender_id, COUNT(*) as unread_count 
            FROM messages 
            WHERE receiver_id = ? AND is_read = 0 
            GROUP BY sender_id
        `, [userId]);

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
