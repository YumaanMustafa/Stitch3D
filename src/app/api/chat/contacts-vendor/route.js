import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getChatUserId, getChatUserRole } from '../auth';

export async function GET(request) {
    try {
        const userId = await getChatUserId(request);
        const role = await getChatUserRole(request);
        
        if (!userId || role !== 'supplier') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch all Vendors that have ordered from this Supplier
        const sql = `
            SELECT DISTINCT u.user_id as id, u.first_name, u.last_name, u.email, u.role, v.company_name
            FROM users u
            JOIN vendors v ON u.user_id = v.user_id
            JOIN material_requests m ON v.vendor_id = m.vendor_id
            JOIN suppliers s ON m.supplier_id = s.supplier_id
            WHERE s.user_id = ?
        `;
        
        const [rows] = await db.query(sql, [userId]);
        
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
        console.error("Fetch Supplier Contacts API Error:", error);
        return NextResponse.json({ error: "Database error fetching contacts" }, { status: 500 });
    }
}
