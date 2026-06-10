
import { NextResponse } from "next/server";
import { getUserFromRequest } from '@/lib/auth';
import db from '@/lib/db';
import bcrypt from "bcryptjs";

/**
 * @file route.js
 * @description Change Password API.
 * Allows authenticated users to change their password by providing the old password.
 */

export async function PUT(req) {
    try {
        const userPayload = getUserFromRequest(req);
        const { oldPassword, newPassword, confirmPassword } = await req.json();
        const { id } = userPayload;

        if (!oldPassword || !newPassword)
            return NextResponse.json({ message: "Old and new password required" }, { status: 400 });
        if (newPassword.length < 6)
            return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
        if (confirmPassword && newPassword !== confirmPassword)
            return NextResponse.json({ message: "Passwords do not match" }, { status: 400 });

        const [rows] = await db.query("SELECT password_hash FROM users WHERE user_id = ?", [id]);
        const user = rows[0];
        if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

        const match = await bcrypt.compare(oldPassword, user.password_hash);
        if (!match) return NextResponse.json({ message: "Incorrect old password" }, { status: 400 });

        const hashed = await bcrypt.hash(newPassword, 10);
        await db.query("UPDATE users SET password_hash = ? WHERE user_id = ?", [hashed, id]);

        return NextResponse.json({ message: "Password changed successfully" });

    } catch (err) {
        console.error("ChangePassword error:", err.message);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
