// Import Next.js tool for sending responses back to the browser
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import jsonwebtoken to read login tokens
import jwt from 'jsonwebtoken';

/**
 * File: route.js
 * Location: src/app/api/common/uploads/route.js
 * Description: File Uploads API.
 * This handles saving and fetching custom files (like design images or patches) 
 * uploaded by users. It stores the actual file data directly in the database.
 */

// Get the secret key used to lock and unlock the JWT token
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// ==========================================
// HELPER FUNCTION: Get the User ID securely
// ==========================================
async function getUserId(request) {
    // Look for the "Authorization" header sent by the browser
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    
    // Extract the actual token
    const token = authHeader.split(' ')[1];
    
    try {
        // Unlock the token
        const decoded = jwt.verify(token, JWT_SECRET);
        // Look for the ID inside the token in any format it might be saved
        return decoded.id || decoded.userId || decoded.user_id;
    } catch (e) {
        return null;
    }
}

// ==========================================
// GET HANDLER: Handles GET requests to load all of a user's previous uploads
// ==========================================
export async function GET(request) {
    // Step 1: Security Check
    const userId = await getUserId(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Step 2: Fetch all uploads for this specific user, putting the newest ones first
        const [rows] = await db.query('SELECT * FROM custom_uploads WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        
        // Step 3: Send the list to the browser
        return NextResponse.json(rows);
    } catch (error) {
        // Log crashes safely
        console.error("Failed to fetch uploads", error);
        return NextResponse.json({ error: 'Failed to fetch uploads' }, { status: 500 });
    }
}

// ==========================================
// POST HANDLER: Handles POST requests when a user actually uploads a new file
// ==========================================
export async function POST(request) {
    // Step 1: Security Check
    const userId = await getUserId(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Step 2: Read the file data sent by the browser
        // Usually 'src' contains the raw image data (like a long Base64 string)
        const { name, src } = await request.json();

        // Stop if they didn't attach a file
        if (!src) {
            return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
        }

        // Step 3: Save the file into the database
        const [result] = await db.query(
            'INSERT INTO custom_uploads (user_id, name, src) VALUES (?, ?, ?)',
            [userId, name || 'Custom Upload', src]
        );

        // Step 4: Tell the browser it worked, and send back the new ID just in case
        return NextResponse.json({
            success: true,
            upload: {
                id: result.insertId,
                name: name || 'Custom Upload',
                src: src
            }
        });
    } catch (error) {
        // Log crashes safely
        console.error("Failed to save upload", error);
        return NextResponse.json({ error: 'Failed to save upload' }, { status: 500 });
    }
}
