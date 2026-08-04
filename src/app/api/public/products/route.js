// Import Next.js tool for sending data back to the browser
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';

/**
 * File: route.js
 * Location: src/app/api/public/products/route.js
 * Description: Public Product List API.
 * This is the public shop page. It fetches all active products so anyone 
 * (even people who aren't logged in) can browse them. It also handles searching and filtering.
 */

// ==========================================
// GET HANDLER: Handles GET requests when someone visits the main shop page
// ==========================================
export async function GET(request) {
    try {
        // Step 1: Check the URL to see if the user is searching for something specific
        // Example URL: /api/public/products?category=Hats&search=Red
        const { searchParams } = new URL(request.url);
        
        // Grab the 'category' they clicked on (e.g. 'Shirts')
        const category = searchParams.get('category');
        // Grab the text they typed into the search bar
        const search = searchParams.get('search');

        // Step 2: Start building the basic SQL query
        // We only want products that have their status set to 'Active'
        let query = `
            SELECT id, name, price, stock, category, image, status, created_at, vendor_id, average_rating, total_reviews
            FROM vendor_products
            WHERE status = 'Active'
        `;
        
        // Prepare an empty array to hold our search words
        const params = [];

        // Step 3: Add extra rules to the query if they used the filters
        
        // If they picked a specific category (and didn't just click "All")
        if (category && category !== 'All') {
            query += ` AND category = ?`;
            params.push(category);
        }

        // If they typed something into the search bar
        if (search) {
            // Check if the search word matches either the product 'name' or its 'description'
            query += ` AND (name LIKE ? OR description LIKE ?)`;
            // We put '%' around the search term so it finds partial matches.
            // E.g., searching "hat" will find "Red Hat" or "Hats"
            params.push(`%${search}%`, `%${search}%`);
        }

        // Finally, make sure the newest products always show up first at the top of the list
        query += ` ORDER BY created_at DESC`;

        // Step 4: Run the fully built query against the database
        const [products] = await db.query(query, params);

        // Step 5: Send the list of products back to the browser to be displayed
        return NextResponse.json(products);
        
    } catch (error) {
        // If the database crashes, log it securely so developers can fix it
        console.error("Failed to fetch products:", error);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}
