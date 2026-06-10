import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

/**
 * @file route.js
 * @description Customer Profile API.
 * - GET: Fetch customer details (address, phone, etc.).
 * - POST: Upsert (Insert/Update) customer details.
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
 * GET handler to fetch customer profile.
 */
export async function GET(request) {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const [rows] = await db.query('SELECT * FROM customers WHERE user_id = ?', [userId]);
        if (rows.length === 0) {
            return NextResponse.json({});
        }
        return NextResponse.json(rows[0]);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
}

export async function POST(request) {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        
        // Fetch existing record to merge or check for existence
        const [existing] = await db.query('SELECT * FROM customers WHERE user_id = ?', [userId]);
        const current = existing.length > 0 ? existing[0] : null;

        const updateData = {
            phone_number: body.phone_number !== undefined ? body.phone_number : current?.phone_number,
            address: body.address !== undefined ? body.address : current?.address,
            city: body.city !== undefined ? body.city : current?.city,
            country: body.country !== undefined ? body.country : current?.country,
            postal_code: body.postal_code !== undefined ? body.postal_code : current?.postal_code,
            payment_card_last4: body.payment_card_last4 !== undefined 
                ? body.payment_card_last4 
                : (body.card_number ? (body.card_number.includes("•") ? body.card_number.slice(-4) : body.card_number.slice(-4)) : current?.payment_card_last4),
            payment_card_expiry: body.payment_card_expiry !== undefined 
                ? body.payment_card_expiry 
                : (body.card_expiry !== undefined ? body.card_expiry : current?.payment_card_expiry)
        };

        if (current) {
            await db.query(`
                UPDATE customers 
                SET phone_number = ?, address = ?, city = ?, country = ?, postal_code = ?, payment_card_last4 = ?, payment_card_expiry = ?
                WHERE user_id = ?
             `, [updateData.phone_number, updateData.address, updateData.city, updateData.country, updateData.postal_code, updateData.payment_card_last4, updateData.payment_card_expiry, userId]);
        } else {
            await db.query(`
                INSERT INTO customers (user_id, phone_number, address, city, country, postal_code, payment_card_last4, payment_card_expiry)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             `, [userId, updateData.phone_number, updateData.address, updateData.city, updateData.country, updateData.postal_code, updateData.payment_card_last4, updateData.payment_card_expiry]);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
    }
}
