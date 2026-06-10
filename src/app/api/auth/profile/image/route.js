import { NextResponse } from "next/server";
import { getUserFromRequest } from '@/lib/auth';
import db from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * @file route.js
 * @description Profile Picture Upload API.
 * Saves uploaded images to /public/uploads/profiles and updates user record.
 */

export async function POST(req) {
    try {
        const userPayload = getUserFromRequest(req);
        if (!userPayload || !userPayload.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('image');

        if (!file) {
            return NextResponse.json({ message: "No image provided" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            // Directory exists or other error
        }

        // Generate unique filename
        const filename = `${userPayload.id}_${Date.now()}${path.extname(file.name)}`;
        const filePath = path.join(uploadDir, filename);
        
        await writeFile(filePath, buffer);

        const imagePath = `/uploads/profiles/${filename}`;

        // Update database
        await db.query(
            "UPDATE users SET profile_image = ? WHERE user_id = ?",
            [imagePath, userPayload.id]
        );

        return NextResponse.json({ message: "Profile picture updated", imagePath });

    } catch (err) {
        console.error("Profile Image Upload error:", err.message);
        return NextResponse.json({ message: "Server error during upload" }, { status: 500 });
    }
}
