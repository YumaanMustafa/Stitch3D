import { NextResponse } from "next/server";
import { getVendorFromRequest, getVendorIdFromUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req) {
    try {
        const payload = getVendorFromRequest(req);
        if (!payload) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const vendorId = await getVendorIdFromUser(payload);
        if (!vendorId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('image');

        if (!file) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            // Directory exists or other error
        }

        // Generate unique filename
        const filename = `product_${vendorId}_${Date.now()}${path.extname(file.name)}`;
        const filePath = path.join(uploadDir, filename);
        
        await writeFile(filePath, buffer);

        const imagePath = `/uploads/products/${filename}`;

        return NextResponse.json({ success: true, imagePath });

    } catch (err) {
        console.error("Product Image Upload error:", err.message);
        return NextResponse.json({ error: "Server error during upload" }, { status: 500 });
    }
}
