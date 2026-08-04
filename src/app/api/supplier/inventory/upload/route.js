// Import Next.js tool for sending responses
import { NextResponse } from "next/server";
// Import NodeJS tools for saving files to the hard drive
import { writeFile, mkdir } from 'fs/promises';
// Import NodeJS tool for working with file paths (like folders and extensions)
import path from 'path';
// Import jsonwebtoken to read login tokens
import jwt from 'jsonwebtoken';

/**
 * File: route.js
 * Location: src/app/api/supplier/inventory/upload/route.js
 * Description: Supplier Image Upload API.
 * This handles saving picture files (like photos of fabric) directly to the 
 * server's 'public/uploads' folder when a supplier adds a new inventory item.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// ==========================================
// HELPER FUNCTION: Verify Token
// ==========================================
async function getSupplierFromToken(request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'supplier') return null;
        return { supplier_id: decoded.id };
    } catch (err) {
        return null;
    }
}

// ==========================================
// POST HANDLER: Handles POST requests when a supplier selects an image file to upload
// ==========================================
export async function POST(req) {
    try {
        // Step 1: Security Check
        const supplier = await getSupplierFromToken(req);
        if (!supplier) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Step 2: Read the raw file data from the request
        const formData = await req.formData();
        const file = formData.get('image'); // 'image' is the name of the file input in the HTML form

        if (!file) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        // Step 3: Convert the file into a "Buffer" (the raw format NodeJS uses to save files)
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Step 4: Figure out exactly where to save it on the server
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'supplier');
        
        try {
            // Try to create the 'supplier' folder if it doesn't exist yet
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            // If it already exists, that's fine. Ignore the error.
        }

        // Step 5: Generate a completely unique name for this file so it doesn't overwrite anything else
        // We use the supplier ID, the current exact time, and the original file extension (like .jpg or .png)
        const filename = `material_${supplier.supplier_id}_${Date.now()}${path.extname(file.name)}`;
        
        // Combine the folder path and the filename together
        const filePath = path.join(uploadDir, filename);
        
        // Step 6: Actually save the file to the hard drive!
        await writeFile(filePath, buffer);

        // Step 7: Create the public web link to the image so the browser can load it
        const imagePath = `/uploads/supplier/${filename}`;

        // Send the link back to the browser so it can show the picture
        return NextResponse.json({ success: true, imagePath });

    } catch (err) {
        // Log severe crashes safely
        console.error("Supplier Image Upload error:", err.message);
        return NextResponse.json({ error: "Server error during upload" }, { status: 500 });
    }
}
