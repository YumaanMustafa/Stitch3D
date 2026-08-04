// Import Next.js tool for sending data back to the browser
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import our custom helper to figure out who is sending the message
import { getChatUserId } from '../auth';

/**
 * File: route.js
 * Location: src/app/api/chat/send/route.js
 * Description: Chat Message Sending API.
 * This route allows a user to send a new chat message to another user.
 * It saves the message to the database and records exactly when it was sent.
 */

// ==========================================
// POST HANDLER: Handles POST requests when a user clicks "Send" in the chat
// ==========================================
export async function POST(request) {
    try {
        // Step 1: Security Check. Verify who is trying to send this message.
        const userId = await getChatUserId(request);
        
        // If they aren't logged in, stop them immediately
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Read the details they sent from the chat box
        const body = await request.json();
        
        // 'receiver_id' is who they are sending it to. 'content' is what they typed.
        const { receiver_id, content } = body;

        // Step 3: Check for empty messages or missing data
        if (!receiver_id || !content || content.trim() === '') {
            return NextResponse.json({ error: "Receiver ID and content are required" }, { status: 400 });
        }

        // Step 4: Save the message into the database
        // We use NOW() so the database stamps it with the exact current time.
        // We also use .trim() to remove any accidental extra spaces at the beginning or end of their message.
        const [result] = await db.query(
            "INSERT INTO messages (sender_id, receiver_id, content, created_at) VALUES (?, ?, ?, NOW())",
            [userId, receiver_id, content.trim()]
        );

        // Step 5: Reply back to the frontend so it knows the message was successfully sent
        // We send back the ID of the new message so the UI can keep track of it
        return NextResponse.json({
            success: true,
            message_id: result.insertId,
            sender_id: userId,
            receiver_id: receiver_id,
            content: content.trim(),
            created_at: new Date().toISOString()
        });

    } catch (error) {
        // Log any database crashes securely
        console.error("Send Message API Error:", error);
        return NextResponse.json({ error: "Database error sending message" }, { status: 500 });
    }
}
