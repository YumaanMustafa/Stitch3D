// Import Next.js tool for sending data back to the browser
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import our custom helper to figure out who is requesting the messages
import { getChatUserId } from '../auth';

/**
 * File: route.js
 * Location: src/app/api/chat/messages/route.js
 * Description: Chat History API.
 * This route fetches the entire conversation history between the logged-in user 
 * and a specific contact they selected. It also automatically marks those 
 * messages as "read".
 */

// ==========================================
// GET HANDLER: Handles GET requests when a user clicks on a contact to chat
// ==========================================
export async function GET(request) {
    try {
        // Step 1: Security Check. Find out who is asking for the messages
        const userId = await getChatUserId(request);
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Grab the 'contactId' from the URL
        // Example: /api/chat/messages?contactId=15
        const { searchParams } = new URL(request.url);
        const contactId = searchParams.get('contactId');

        // Stop if they didn't specify who they want to chat with
        if (!contactId) {
            return NextResponse.json({ error: "contactId is required" }, { status: 400 });
        }

        // Step 3: Fetch the conversation history from the database
        // We look for messages where either:
        // A) We sent it to them, OR
        // B) They sent it to us.
        // We also join the 'users' table to grab the names of the sender and receiver.
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

        // Run the query, passing in our ID and their ID in both configurations
        const [rows] = await db.query(sql, [userId, contactId, contactId, userId]);

        // Step 4: Mark incoming messages as read
        // Look through the messages we just fetched. If we are the receiver AND it's unread (0), grab its ID.
        const unreadIds = rows.filter(m => m.receiver_id === userId && m.is_read === 0).map(m => m.message_id);
        
        // If there are unread messages, update them in the database to be 'read' (1)
        if (unreadIds.length > 0) {
            // We use 'IN (?)' to update multiple message IDs at the exact same time
            await db.query(`UPDATE messages SET is_read = 1 WHERE message_id IN (?)`, [unreadIds]);
        }

        // Step 5: Send the conversation history to the frontend so it can be displayed
        return NextResponse.json(rows);
        
    } catch (error) {
        // Log crashes securely
        console.error("Fetch Messages API Error:", error);
        return NextResponse.json({ error: "Database error fetching messages" }, { status: 500 });
    }
}
