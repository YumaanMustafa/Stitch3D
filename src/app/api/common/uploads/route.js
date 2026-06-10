import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

/**
 * @file route.js
 * @description File Uploads API.
 * Handles uploading and retrieving custom user files (e.g. usage patches).
 * Stores file data (Base64/URL) in database.
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
 * GET handler to fetch user's uploads.
 */
export async function GET(request) {
    const userId = await getUserId(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [rows] = await db.query('SELECT * FROM custom_uploads WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        return NextResponse.json(rows);
    } catch (error) {
        console.error("Failed to fetch uploads", error);
        return NextResponse.json({ error: 'Failed to fetch uploads' }, { status: 500 });
    }
}

export async function POST(request) {
    const userId = await getUserId(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { name, src } = await request.json();

        if (!src) {
            return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
        }

        const [result] = await db.query(
            'INSERT INTO custom_uploads (user_id, name, src) VALUES (?, ?, ?)',
            [userId, name || 'Custom Upload', src]
        );

        return NextResponse.json({
            success: true,
            upload: {
                id: result.insertId,
                name: name || 'Custom Upload',
                src: src
            }
        });
    } catch (error) {
        console.error("Failed to save upload", error);
        return NextResponse.json({ error: 'Failed to save upload' }, { status: 500 });
    }
}
