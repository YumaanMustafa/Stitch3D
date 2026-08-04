// Import Next.js tool for sending responses
import { NextResponse } from "next/server";
// Import NodeJS tools for saving files to the hard drive
import { writeFile, mkdir } from 'fs/promises';
// Import NodeJS tool for working with file paths (like extensions and folders)
import path from 'path';
// Import authentication tools
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/vendor/products/upload/route.js
 * Description: Vendor Product Image Upload API.
 * This handles saving a picture file (like a photo of a jacket) directly to the 
 * server's 'public/uploads' folder when a vendor lists a new product.
 */

// ==========================================
// POST HANDLER: Handles image uploads from the vendor
// ==========================================
export async function POST(req) {
    try {
        // Step 1: Security Check
        const payload = getVendorFromRequest(req);
        if (!payload) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        const vendorId = await getVendorIdFromUser(payload);
        if (!vendorId) {
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
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
        
        try {
            // Try to create the 'products' folder if it doesn't exist yet
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            // If it already exists, that's fine. Ignore the error.
        }

        // Step 5: Generate a completely unique name for this file so it doesn't overwrite anything else
        // We use the vendor ID, the exact time, and the original file extension (like .jpg or .png)
        const filename = `product_${vendorId}_${Date.now()}${path.extname(file.name)}`;
        const filePath = path.join(uploadDir, filename);
        
        // Step 6: Actually save the file to the hard drive!
        await writeFile(filePath, buffer);

        // Step 7: Create the public web link to the image so the browser can load it
        const imagePath = `/uploads/products/${filename}`;

        // Send the link back to the browser so it can display the picture
        return NextResponse.json({ success: true, imagePath });

    } catch (err) {
        // Log severe crashes safely
        console.error("Product Image Upload error:", err.message);
        return NextResponse.json({ error: "Server error during upload" }, { status: 500 });
    }
}
