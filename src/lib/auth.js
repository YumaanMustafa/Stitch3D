// Import jsonwebtoken library which creates and reads secure login tokens
import jwt from "jsonwebtoken";
// Import the database connection tool so we can query the database
import db from "./db.js";

/**
 * File: auth.js
 * Description: Backend utility functions for handling user authentication.
 * It reads the secure token (JWT) that the browser sends with every request,
 * decrypts it to find out who is logged in, and checks their permissions (role).
 */

/**
 * Extracts and verifies the JSON Web Token (JWT) from a Next.js incoming HTTP request.
 * 
 * @param {Request} req - The incoming HTTP request object from the user's browser
 * @returns {Object} A decoded payload containing the user's ID, email, and role
 * @throws {Error} Throws an error if the token is missing, corrupted, or expired
 */
export function getUserFromRequest(req) {
    // 1. Read the "authorization" header from the request.
    // This usually looks like: "Bearer abc123securetokenxyz"
    const authHeader = req.headers.get("authorization");
    
    // If the header doesn't exist or doesn't start with "Bearer ", the user is not properly logged in
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Missing or invalid Authorization header");
    }
    
    // Split the string by space and take the second part to isolate the actual token string
    const token = authHeader.split(" ")[1];
    
    // 2. Get the secret password used to decrypt tokens from the environment variables.
    // If it's missing (like in local development), use a fallback default secret.
    const secret = process.env.JWT_SECRET || 'supersecretkey';

    // 3. Verify the token using the secret. If valid, it returns the user data stored inside it.
    // If invalid or expired, jwt.verify automatically throws an error which stops the request.
    return jwt.verify(token, secret);
}

/**
 * A helper function to find the specific "vendor_id" for a logged-in user.
 * 
 * @param {Object} payload - The decrypted user data returned by getUserFromRequest
 * @returns {Promise<number|null>} The vendor's ID number, or null if they aren't a vendor
 */
export async function getVendorIdFromUser(payload) {
    // If there is no user data, return null immediately
    if (!payload) return null;

    // 1. Optimization: Sometimes the token already contains the vendor_id directly.
    // If it does, just return it immediately to save a database trip.
    if (payload.vendor_id) return payload.vendor_id;

    // Grab the general user ID from the token
    const userId = payload.id;
    if (!userId) return null;

    try {
        // 2. Ask the database: "Find the vendor record that belongs to this user ID"
        const [rows] = await db.query("SELECT vendor_id FROM vendors WHERE user_id = ?", [userId]);
        
        // If no matching vendor was found for this user...
        if (rows.length === 0) {
            // Fallback (for older accounts): Check if the ID inside the token actually belongs 
            // directly to the vendor table rather than the users table.
            const [rowsById] = await db.query("SELECT vendor_id FROM vendors WHERE vendor_id = ?", [userId]);
            if (rowsById.length > 0) return rowsById[0].vendor_id; // Found it via fallback
            
            return null; // Not a vendor at all
        }
        
        // Return the found vendor ID
        return rows[0].vendor_id;
    } catch (err) {
        // If the database crashes, fail safely by returning null
        return null;
    }
}

/**
 * Checks if the person making the request is an Admin.
 * 
 * @param {Request} req - The incoming HTTP request
 * @returns {Object|null} The admin's user data, or null if they are not an admin
 */
export function getAdminFromRequest(req) {
    try {
        // Decrypt the token to get the user data
        const payload = getUserFromRequest(req);
        // Check their role. If it's not 'admin', reject them by returning null.
        if (payload.role !== 'admin') return null; 
        // If they pass, return their data
        return payload;
    } catch {
        // If token decryption fails (e.g., they aren't logged in), return null
        return null;
    }
}

/**
 * Checks if the person making the request is a Vendor.
 * 
 * @param {Request} req - The incoming HTTP request
 * @returns {Object|null} The vendor's user data, or null if they are not a vendor
 */
export function getVendorFromRequest(req) {
    try {
        const payload = getUserFromRequest(req);
        // Check their role. If it's not 'vendor', reject them.
        if (payload.role !== 'vendor') return null; 
        return payload;
    } catch {
        return null;
    }
}

/**
 * Checks if the person making the request is a Supplier.
 * 
 * @param {Request} req - The incoming HTTP request
 * @returns {Object|null} The supplier's user data, or null if they are not a supplier
 */
export function getSupplierFromRequest(req) {
    try {
        const payload = getUserFromRequest(req);
        // Check their role. If it's not 'supplier', reject them.
        if (payload.role !== 'supplier') return null;
        return payload;
    } catch {
        return null;
    }
}

/**
 * Checks if the person making the request is a Customer.
 * 
 * @param {Request} req - The incoming HTTP request
 * @returns {Object|null} The customer's user data, or null if they are not a customer
 */
export function getCustomerFromRequest(req) {
    try {
        const payload = getUserFromRequest(req);
        // Check their role. If it's not 'customer', reject them.
        if (payload.role !== 'customer') return null;
        return payload;
    } catch {
        return null;
    }
}
