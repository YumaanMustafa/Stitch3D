import { NextResponse } from "next/server";
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

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

export async function POST(req) {
    try {
        const supplier = await getSupplierFromToken(req);
        if (!supplier) {
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
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'supplier');
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            // Directory exists or other error
        }

        // Generate unique filename
        const filename = `material_${supplier.supplier_id}_${Date.now()}${path.extname(file.name)}`;
        const filePath = path.join(uploadDir, filename);
        
        await writeFile(filePath, buffer);

        const imagePath = `/uploads/supplier/${filename}`;

        return NextResponse.json({ success: true, imagePath });

    } catch (err) {
        console.error("Supplier Image Upload error:", err.message);
        return NextResponse.json({ error: "Server error during upload" }, { status: 500 });
    }
}
