// Import Next.js tool for sending data back to the browser
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import our custom helper to figure out who is checking their messages
import { getChatUserId } from '../auth.js';

/**
 * File: route.js
 * Location: src/app/api/chat/unread/route.js
 * Description: Chat Unread Messages API.
 * This route quickly counts how many unread messages the logged-in user has in total.
 * It is used to show a little red notification badge on the chat icon in the main menu.
 */

// ==========================================
// GET HANDLER: Handles GET requests to check for new messages
// ==========================================
export async function GET(request) {
    try {
        // Step 1: Security Check. Verify who is asking for their unread count.
        const auth = await getChatUserId(request);
        if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Step 2: Check if the frontend is asking for a specific filter
        // Sometimes the UI only wants to know about unread messages from a specific group 
        // (like only messages from customers, or only from suppliers).
        const { searchParams } = new URL(request.url);
        const filter = searchParams.get('filter');

        // Step 3: Build the default SQL query
        // "Find all messages sent TO me (receiver_id) where I haven't read them yet (is_read = FALSE)"
        let query = "SELECT COUNT(*) as total_unread FROM messages WHERE receiver_id = ? AND is_read = FALSE";
        let params = [auth];

        // Step 4: Modify the query if a specific filter was requested
        if (filter === 'customer' || filter === 'supplier') {
            // We JOIN the users table so we can check the 'role' of the person who sent the message
            query = `
                SELECT COUNT(m.message_id) as total_unread 
                FROM messages m 
                JOIN users u ON m.sender_id = u.user_id 
                WHERE m.receiver_id = ? AND m.is_read = FALSE AND u.role = ?
            `;
            // Add the filter into the parameter list
            params = [auth, filter];
        }

        // Step 5: Run the query against the database
        // The weird brackets [[{ ... }]] are just a shortcut to grab the exact number out of the result
        const [[{ total_unread }]] = await db.query(query, params);

        // Step 6: Send the final number back to the browser so it can draw the red badge
        // If the number is null or undefined for some reason, we default to 0
        return NextResponse.json({ unread: total_unread || 0 });
        
    } catch (err) {
        // Log any database crashes securely
        console.error("Unread count API error:", err);
        return NextResponse.json({ error: "Failed to load unread count" }, { status: 500 });
    }
}
