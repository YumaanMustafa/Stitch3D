// Import jsonwebtoken to read and verify login tokens
import jwt from 'jsonwebtoken';
// Import the database tool (used to find specific user details if needed)
import db from '@/lib/db';

// Get the secret key used to decrypt the token, or use a default one
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

/**
 * File: auth.js
 * Location: src/app/api/chat/auth.js
 * Description: Chat Authentication Helper.
 * This file contains reusable functions that help other chat APIs figure out 
 * exactly who is trying to send or read a message.
 */

// ==========================================
// HELPER FUNCTION: Get the User's ID from their Token
// ==========================================
export async function getChatUserId(request) {
    // Look for the "Authorization: Bearer <token>" header in the request
    const authHeader = request.headers.get('authorization');
    
    // If it's missing or formatted wrong, return null (meaning they aren't logged in)
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    
    try {
        // Cut out the actual token string (ignoring the word "Bearer ")
        const token = authHeader.split(' ')[1];
        
        // Decrypt the token using our secret key
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Step 1: Check if the ID was saved as 'userId' or 'user_id'
        const userId = decoded.userId || decoded.user_id;
        if (userId) return userId;
        
        // Step 2: Special rules for Vendors
        // Vendor tokens often store the core user_id in the 'id' field
        if (decoded.role === 'vendor') {
            return decoded.id;
        }
        
        // Step 3: Special rules for Suppliers
        // Supplier tokens might store the supplier_id in the 'id' field, so we 
        // need to look up their actual user_id from the database
        if (decoded.role === 'supplier') {
            const [rows] = await db.query("SELECT user_id FROM suppliers WHERE supplier_id = ?", [decoded.id]);
            return rows[0]?.user_id;
        }
        
        // Step 4: Fallback for Customers or other roles
        return decoded.id;
        
    } catch (e) {
        // If the token is fake or expired, return null
        return null;
    }
}

// ==========================================
// HELPER FUNCTION: Get the User's Role from their Token
// ==========================================
export async function getChatUserRole(request) {
    // Look for the Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    
    try {
        const token = authHeader.split(' ')[1];
        // Decrypt the token
        const decoded = jwt.verify(token, JWT_SECRET);
        // Return their role (e.g., 'customer', 'vendor', 'supplier')
        return decoded.role;
    } catch (e) {
        return null;
    }
}
