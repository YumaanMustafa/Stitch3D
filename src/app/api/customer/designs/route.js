// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import jsonwebtoken to read login tokens
import jwt from 'jsonwebtoken';

/**
 * File: route.js
 * Location: src/app/api/customer/designs/route.js
 * Description: Customer Designs API.
 * This route allows customers to save their 3D jacket designs so they can 
 * come back and finish them later. It also lets them view and delete saved designs.
 */

// Get the secret key used to lock and unlock the JWT token
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// ==========================================
// HELPER FUNCTION: Get User ID from Token
// ==========================================
// Checks if the user is logged in and safely extracts their ID
async function getUserId(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.id || decoded.userId || decoded.user_id;
    } catch (e) {
        return null;
    }
}

// =========================================================================
// GET HANDLER: Fetch all saved designs for the logged-in customer
// =========================================================================
export async function GET(request) {
    // Step 1: Security Check
    const userId = await getUserId(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Step 2: Search the database for all designs owned by this user
        const [rows] = await db.query('SELECT * FROM customized_designs WHERE user_id = ? ORDER BY created_at DESC', [userId]);

        // Step 3: Clean up the data format
        // The 'views' (which hold 3D camera angles and settings) are stored as a long string 
        // in the database. We need to convert it back into a standard JavaScript object (JSON.parse).
        const designs = rows.map(d => ({
            ...d, // Keep everything else the same
            views: d.views ? JSON.parse(d.views) : {} // Convert the views string to an object
        }));

        // Send the final list of designs back to the browser
        return NextResponse.json(designs);
        
    } catch (error) {
        // Log crashes safely
        console.error("Failed to fetch designs", error);
        return NextResponse.json({ error: 'Failed to fetch designs' }, { status: 500 });
    }
}

// =========================================================================
// POST HANDLER: Save a brand new design, or update an existing one
// =========================================================================
export async function POST(request) {
    // Step 1: Security Check
    const userId = await getUserId(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Step 2: Read the design data sent from the 3D editor
        const newDesign = await request.json();

        // Ensure the design has actual 3D view data attached
        if (!newDesign.views) {
            return NextResponse.json({ error: 'Invalid design data' }, { status: 400 });
        }

        // Step 3: Set up default values if the user left anything blank
        // If it's a new design, we generate a random unique ID for it
        const id = newDesign.id || `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const name = newDesign.name || 'Custom Jacket';
        const color = newDesign.color || 'black';
        const material = newDesign.material || 'cowhide';
        const vendorId = newDesign.vendorId || null;
        
        // Step 4: Convert complex objects into strings so the database can store them
        const views = typeof newDesign.views === 'string' ? newDesign.views : JSON.stringify(newDesign.views);
        const snapshots = typeof newDesign.snapshots === 'string' ? newDesign.snapshots : JSON.stringify(newDesign.snapshots || {});
        const preview = newDesign.previewImage || '';

        // Step 5: Check if we are updating an old design, or making a new one
        const [existing] = await db.query('SELECT id, user_id FROM customized_designs WHERE id = ?', [id]);

        if (existing.length > 0) {
            // Security Check: Make sure they aren't trying to overwrite someone else's design!
            if (existing[0].user_id !== userId) {
                return NextResponse.json({ error: 'Forbidden: Cannot edit others design' }, { status: 403 });
            }

            // Update the existing design record
            await db.query(
                'UPDATE customized_designs SET name = ?, color = ?, material = ?, vendor_id = ?, views = ?, snapshots = ?, preview = ?, created_at = NOW() WHERE id = ?',
                [name, color, material, vendorId, views, snapshots, preview, id]
            );
        } else {
            // Create a brand new design record
            await db.query(
                'INSERT INTO customized_designs (id, user_id, name, color, material, vendor_id, views, snapshots, preview, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
                [id, userId, name, color, material, vendorId, views, snapshots, preview]
            );
        }

        // Tell the 3D editor that the save was successful
        return NextResponse.json({
            success: true,
            message: 'Design saved',
            design: {
                id,
                name,
                color,
                date: new Date()
            }
        });
        
    } catch (error) {
        // Log crashes safely
        console.error('Save error details:', error);
        return NextResponse.json({
            error: 'Failed to save design',
            details: error.message
        }, { status: 500 });
    }
}

// =========================================================================
// DELETE HANDLER: Delete a saved design from the database
// =========================================================================
export async function DELETE(request) {
    // Step 1: Security Check
    const userId = await getUserId(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Step 2: Grab the ID of the design to delete from the URL
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Step 3: Verify the user actually owns this design before deleting it
        const [existing] = await db.query('SELECT user_id FROM customized_designs WHERE id = ?', [id]);
        
        if (existing.length === 0) {
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }
        
        if (existing[0].user_id !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); // They are trying to delete someone else's!
        }

        // Step 4: Delete the design record
        await db.query('DELETE FROM customized_designs WHERE id = ?', [id]);

        return NextResponse.json({ success: true, message: 'Design deleted' });
        
    } catch (error) {
        // Log crashes safely
        console.error("Delete error", error);
        return NextResponse.json({ error: 'Failed to delete design' }, { status: 500 });
    }
}
