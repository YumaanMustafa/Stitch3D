// Import Next.js response helper
import { NextResponse } from "next/server";
// Import our custom auth tool to see who is making the request
import { getUserFromRequest } from '@/lib/auth';
// Import the database tool
import db from '@/lib/db';
// Import Node.js file system tools to save the uploaded image to the hard drive
import { writeFile, mkdir } from 'fs/promises';
// Import Node.js path tool to safely handle file extensions
import path from 'path';

/**
 * File: route.js
 * Location: src/app/api/auth/profile/image/route.js
 * Description: Profile Picture Upload API.
 * When a user uploads a new avatar picture, this route receives the file,
 * saves it into the public 'uploads' folder, and updates the database.
 */

// ==========================================
// POST HANDLER: Receives the uploaded image file
// ==========================================
export async function POST(req) {
    try {
        // Step 1: Security Check. Make sure the user is actually logged in.
        const userPayload = getUserFromRequest(req);
        if (!userPayload || !userPayload.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Step 2: Read the form data sent by the browser
        const formData = await req.formData();
        const file = formData.get('image'); // 'image' is the name of the file input

        // If no file was attached, stop here
        if (!file) {
            return NextResponse.json({ message: "No image provided" }, { status: 400 });
        }

        // Step 3: Convert the file into raw computer data (a Buffer) so we can save it
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Step 4: Define where on the server the file should be saved
        // 'process.cwd()' gets the main project folder. We put it inside /public so browsers can see it.
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
        
        // Ensure the folder actually exists. If it doesn't, create it (recursive: true).
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            // If the folder already exists, mkdir might throw an error, which we just ignore
        }

        // Step 5: Give the file a unique name so it doesn't overwrite someone else's picture
        // Example format: 5_1638203810.jpg (UserId_Timestamp.extension)
        const filename = `${userPayload.id}_${Date.now()}${path.extname(file.name)}`;
        const filePath = path.join(uploadDir, filename);

        // Step 6: Actually save the file to the hard drive
        await writeFile(filePath, buffer);

        // This is the URL path the website will use to load the image
        const imagePath = `/uploads/profiles/${filename}`;

        // Step 7: Update the user's record in the database with the new image link
        await db.query(
            "UPDATE users SET profile_picture = ? WHERE user_id = ?",
            [imagePath, userPayload.id]
        );

        // Send a success message back to the browser
        return NextResponse.json({ message: "Profile picture updated", imagePath });

    } catch (err) {
        // Log any server issues
        console.error("Profile Image Upload error:", err.message);
        return NextResponse.json({ message: "Server error during upload" }, { status: 500 });
    }
}
