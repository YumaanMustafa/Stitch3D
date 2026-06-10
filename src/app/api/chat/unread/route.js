import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getChatUserId } from '../auth.js';

export async function GET(request) {
    try {
        const auth = await getChatUserId(request);
        if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const filter = searchParams.get('filter');

        let query = "SELECT COUNT(*) as total_unread FROM messages WHERE receiver_id = ? AND is_read = FALSE";
        let params = [auth];

        if (filter === 'customer' || filter === 'supplier') {
            query = `
                SELECT COUNT(m.message_id) as total_unread 
                FROM messages m 
                JOIN users u ON m.sender_id = u.user_id 
                WHERE m.receiver_id = ? AND m.is_read = FALSE AND u.role = ?
            `;
            params = [auth, filter];
        }

        const [[{ total_unread }]] = await db.query(query, params);

        return NextResponse.json({ unread: total_unread || 0 });
    } catch (err) {
        console.error("Unread count API error:", err);
        return NextResponse.json({ error: "Failed to load unread count" }, { status: 500 });
    }
}
