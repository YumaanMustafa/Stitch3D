import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getChatUserId } from '../auth';

export async function GET(request) {
    try {
        const userId = await getChatUserId(request);
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const contactId = searchParams.get('contactId');

        if (!contactId) {
            return NextResponse.json({ error: "contactId is required" }, { status: 400 });
        }

        const sql = `
            SELECT m.*, 
                   s.first_name as sender_first, s.last_name as sender_last,
                   r.first_name as receiver_first, r.last_name as receiver_last
            FROM messages m
            LEFT JOIN users s ON m.sender_id = s.user_id
            LEFT JOIN users r ON m.receiver_id = r.user_id
            WHERE (m.sender_id = ? AND m.receiver_id = ?)
               OR (m.sender_id = ? AND m.receiver_id = ?)
            ORDER BY m.created_at ASC
        `;

        const [rows] = await db.query(sql, [userId, contactId, contactId, userId]);

        // Mark incoming messages as read
        const unreadIds = rows.filter(m => m.receiver_id === userId && m.is_read === 0).map(m => m.message_id);
        if (unreadIds.length > 0) {
            await db.query(`UPDATE messages SET is_read = 1 WHERE message_id IN (?)`, [unreadIds]);
        }

        return NextResponse.json(rows);
    } catch (error) {
        console.error("Fetch Messages API Error:", error);
        return NextResponse.json({ error: "Database error fetching messages" }, { status: 500 });
    }
}
