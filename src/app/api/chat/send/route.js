import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getChatUserId } from '../auth';

export async function POST(request) {
    try {
        const userId = await getChatUserId(request);
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const { receiver_id, content } = body;

        if (!receiver_id || !content || content.trim() === '') {
            return NextResponse.json({ error: "Receiver ID and content are required" }, { status: 400 });
        }

        const [result] = await db.query(
            "INSERT INTO messages (sender_id, receiver_id, content, created_at) VALUES (?, ?, ?, NOW())",
            [userId, receiver_id, content.trim()]
        );

        return NextResponse.json({
            success: true,
            message_id: result.insertId,
            sender_id: userId,
            receiver_id: receiver_id,
            content: content.trim(),
            created_at: new Date().toISOString()
        });

    } catch (error) {
        console.error("Send Message API Error:", error);
        return NextResponse.json({ error: "Database error sending message" }, { status: 500 });
    }
}
