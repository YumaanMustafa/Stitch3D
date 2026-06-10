import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

/**
 * @file route.js
 * @description Customer Designs API.
 * Allows customers to save, retrieve, and delete their customized designs.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

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

/**
 * GET handler to fetch user's saved designs.
 */
export async function GET(request) {
    const userId = await getUserId(request);

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Filter by user_id
        const [rows] = await db.query('SELECT * FROM customized_designs WHERE user_id = ? ORDER BY created_at DESC', [userId]);

        const designs = rows.map(d => ({
            ...d,
            views: d.views ? JSON.parse(d.views) : {}
        }));

        return NextResponse.json(designs);
    } catch (error) {
        console.error("Failed to fetch designs", error);
        return NextResponse.json({ error: 'Failed to fetch designs' }, { status: 500 });
    }
}

export async function POST(request) {
    const userId = await getUserId(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const newDesign = await request.json();

        if (!newDesign.views) {
            return NextResponse.json({ error: 'Invalid design data' }, { status: 400 });
        }

        const id = newDesign.id || `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const name = newDesign.name || 'Custom Jacket';
        const color = newDesign.color || 'black';
        const material = newDesign.material || 'cowhide';
        const vendorId = newDesign.vendorId || null;
        const views = typeof newDesign.views === 'string' ? newDesign.views : JSON.stringify(newDesign.views);
        const snapshots = typeof newDesign.snapshots === 'string' ? newDesign.snapshots : JSON.stringify(newDesign.snapshots || {});
        const preview = newDesign.previewImage || '';

        // Check if exists
        const [existing] = await db.query('SELECT id, user_id FROM customized_designs WHERE id = ?', [id]);

        if (existing.length > 0) {
            // Verify ownership
            if (existing[0].user_id !== userId) {
                return NextResponse.json({ error: 'Forbidden: Cannot edit others design' }, { status: 403 });
            }

            // Update
            await db.query(
                'UPDATE customized_designs SET name = ?, color = ?, material = ?, vendor_id = ?, views = ?, snapshots = ?, preview = ?, created_at = NOW() WHERE id = ?',
                [name, color, material, vendorId, views, snapshots, preview, id]
            );
        } else {
            // Insert with user_id
            await db.query(
                'INSERT INTO customized_designs (id, user_id, name, color, material, vendor_id, views, snapshots, preview, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
                [id, userId, name, color, material, vendorId, views, snapshots, preview]
            );
        }

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
        console.error('Save error details:', error);
        return NextResponse.json({
            error: 'Failed to save design',
            details: error.message
        }, { status: 500 });
    }
}

export async function DELETE(request) {
    const userId = await getUserId(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Verify ownership
        const [existing] = await db.query('SELECT user_id FROM customized_designs WHERE id = ?', [id]);
        if (existing.length === 0) {
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }
        if (existing[0].user_id !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await db.query('DELETE FROM customized_designs WHERE id = ?', [id]);

        return NextResponse.json({ success: true, message: 'Design deleted' });
    } catch (error) {
        console.error("Delete error", error);
        return NextResponse.json({ error: 'Failed to delete design' }, { status: 500 });
    }
}
