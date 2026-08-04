// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database connection tool
import db from '@/lib/db';
// Import jsonwebtoken to read login tokens
import jwt from 'jsonwebtoken';

/**
 * File: route.js
 * Location: src/app/api/customer/profile/route.js
 * Description: Customer Profile API.
 * This route fetches a customer's saved shipping and payment info (GET), 
 * and saves new info when they update their profile or checkout (POST).
 */

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// ==========================================
// HELPER FUNCTION: Verify Token and get User ID
// ==========================================
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

// ==========================================
// GET HANDLER: Fetch customer profile details
// ==========================================
export async function GET(request) {
    // Step 1: Security Check
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // Step 2: Look up their profile in the database
        const [rows] = await db.query('SELECT * FROM customers WHERE user_id = ?', [userId]);
        
        // If they don't have a profile yet (e.g. they just signed up), send an empty object
        if (rows.length === 0) {
            return NextResponse.json({});
        }
        
        // Otherwise, send their profile data back to the browser
        return NextResponse.json(rows[0]);
        
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
}

// ==========================================
// POST HANDLER: Save or update customer profile details
// ==========================================
export async function POST(request) {
    // Step 1: Security Check
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // Step 2: Read the new data they typed in
        const body = await request.json();
        
        // Step 3: Fetch their existing record
        // We do this because if they only typed in a new phone number, we don't 
        // want to accidentally delete their saved address! We need to merge the old with the new.
        const [existing] = await db.query('SELECT * FROM customers WHERE user_id = ?', [userId]);
        const current = existing.length > 0 ? existing[0] : null;

        // Step 4: Merge the data
        // For each field, if they sent new data, use it. If not, keep the old data (`current`).
        const updateData = {
            phone_number: body.phone_number !== undefined ? body.phone_number : current?.phone_number,
            address: body.address !== undefined ? body.address : current?.address,
            city: body.city !== undefined ? body.city : current?.city,
            country: body.country !== undefined ? body.country : current?.country,
            postal_code: body.postal_code !== undefined ? body.postal_code : current?.postal_code,
            // Credit Card safety: We NEVER save full credit card numbers. We only save the last 4 digits.
            payment_card_last4: body.payment_card_last4 !== undefined 
                ? body.payment_card_last4 
                : (body.card_number ? (body.card_number.includes("•") ? body.card_number.slice(-4) : body.card_number.slice(-4)) : current?.payment_card_last4),
            payment_card_expiry: body.payment_card_expiry !== undefined 
                ? body.payment_card_expiry 
                : (body.card_expiry !== undefined ? body.card_expiry : current?.payment_card_expiry)
        };

        // Step 5: Save it to the database
        if (current) {
            // If they already have a profile, UPDATE it
            await db.query(`
                UPDATE customers 
                SET phone_number = ?, address = ?, city = ?, country = ?, postal_code = ?, payment_card_last4 = ?, payment_card_expiry = ?
                WHERE user_id = ?
             `, [updateData.phone_number, updateData.address, updateData.city, updateData.country, updateData.postal_code, updateData.payment_card_last4, updateData.payment_card_expiry, userId]);
        } else {
            // If this is their first time filling it out, INSERT a brand new row
            await db.query(`
                INSERT INTO customers (user_id, phone_number, address, city, country, postal_code, payment_card_last4, payment_card_expiry)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             `, [userId, updateData.phone_number, updateData.address, updateData.city, updateData.country, updateData.postal_code, updateData.payment_card_last4, updateData.payment_card_expiry]);
        }

        // Tell the browser the save was successful
        return NextResponse.json({ success: true });
        
    } catch (error) {
        // Log severe crashes safely
        console.error("Profile Save Error:", error);
        return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
    }
}
