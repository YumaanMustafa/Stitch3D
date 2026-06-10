import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

async function getSupplierFromToken(request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'supplier') return null;
        return decoded;
    } catch (err) {
        return null;
    }
}

export async function GET(request) {
    try {
        const decoded = await getSupplierFromToken(request);
        if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const [suppliers] = await db.query(`
            SELECT u.first_name, u.last_name, u.email, s.business_registration_number
            FROM users u
            JOIN suppliers s ON u.user_id = s.user_id
            WHERE s.supplier_id = ?
        `, [decoded.id]);

        if (!suppliers.length) {
            return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
        }

        const supplier = suppliers[0];
        return NextResponse.json({
            name: `${supplier.first_name} ${supplier.last_name}`.trim(),
            email: supplier.email,
            business_registration_number: supplier.business_registration_number || ""
        });
    } catch (error) {
        console.error("Supplier Settings GET Error:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const decoded = await getSupplierFromToken(request);
        if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const { name, business_registration_number, password, newPassword } = body;

        // Verify current password if changing password
        const [userRows] = await db.query("SELECT password_hash FROM users WHERE user_id = (SELECT user_id FROM suppliers WHERE supplier_id = ?)", [decoded.id]);
        const user = userRows[0];

        if (newPassword && password) {
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
            }
        } else if (newPassword && !password) {
            return NextResponse.json({ error: "Current password is required to set a new one" }, { status: 400 });
        }

        // Split name into first and last
        const nameParts = (name || "").trim().split(/\s+/);
        const first_name = nameParts[0] || "";
        const last_name = nameParts.slice(1).join(" ") || "";

        // Update User info
        let updateUsersQuery = "UPDATE users SET first_name = ?, last_name = ?";
        let userParams = [first_name, last_name];

        if (newPassword) {
            const hashed = await bcrypt.hash(newPassword, 10);
            updateUsersQuery += ", password_hash = ?";
            userParams.push(hashed);
        }

        updateUsersQuery += " WHERE user_id = (SELECT user_id FROM suppliers WHERE supplier_id = ?)";
        userParams.push(decoded.id);

        await db.query(updateUsersQuery, userParams);

        // Update Supplier info
        await db.query(`
            UPDATE suppliers 
            SET business_registration_number = ? 
            WHERE supplier_id = ?
        `, [business_registration_number || "", decoded.id]);

        return NextResponse.json({ success: true, message: "Settings updated successfully" });
    } catch (error) {
        console.error("Supplier Settings PUT Error:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
