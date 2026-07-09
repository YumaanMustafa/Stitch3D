
import jwt from "jsonwebtoken";
import db from "./db.js";

/**
 * @file auth.js
 * @description Authentication utilities for handling JWT tokens in Next.js requests.
 */

/**
 * Extract and verify JWT from Next.js Request
 * @param {Request} req - The incoming HTTP Next.js request object
 * @returns {Object} decoded token payload containing user identity and role
 * @throws {Error} if token is invalid, expired, or missing from header
 */
export function getUserFromRequest(req) {
    // 1. Read authorization header containing Bearer <token>
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Missing or invalid Authorization header");
    }
    const token = authHeader.split(" ")[1];
    
    // 2. Resolve verify key secret with fallback
    const secret = process.env.JWT_SECRET || 'supersecretkey';

    // 3. Verify signature and decode claims payload
    return jwt.verify(token, secret);
}

/**
 * Helper to map a user_id (from token) to a vendor_id (from vendors table)
 * Or use vendor_id directly if already present in token payload.
 * @param {Object} payload - Decoded JWT claims
 * @returns {Promise<number|null>} Resolved vendor primary key ID
 */
export async function getVendorIdFromUser(payload) {
    if (!payload) return null;

    // 1. Performance optimization: return vendor_id if cached directly in token payload
    if (payload.vendor_id) return payload.vendor_id;

    const userId = payload.id;
    if (!userId) return null;

    try {
        // 2. Query the vendors table for record linked with user_id
        const [rows] = await db.query("SELECT vendor_id FROM vendors WHERE user_id = ?", [userId]);
        if (rows.length === 0) {
            // Fallback lookup: check if the id supplied matches vendor_id directly (legacy support)
            const [rowsById] = await db.query("SELECT vendor_id FROM vendors WHERE vendor_id = ?", [userId]);
            if (rowsById.length > 0) return rowsById[0].vendor_id;
            return null;
        }
        return rows[0].vendor_id;
    } catch (err) {
        return null;
    }
}

/**
 * Get and verify Admin payload from request headers
 * @param {Request} req - Next.js HTTP Request
 * @returns {Object|null} decrypted admin token, or null if unauthorized/not admin
 */
export function getAdminFromRequest(req) {
    try {
        const payload = getUserFromRequest(req);
        if (payload.role !== 'admin') return null; // Reject if user is not admin
        return payload;
    } catch {
        return null;
    }
}

/**
 * Get and verify Vendor payload from request headers
 * @param {Request} req - Next.js HTTP Request
 * @returns {Object|null} decrypted vendor token, or null if unauthorized/not vendor
 */
export function getVendorFromRequest(req) {
    try {
        const payload = getUserFromRequest(req);
        if (payload.role !== 'vendor') return null; // Reject if user is not vendor
        return payload;
    } catch {
        return null;
    }
}

/**
 * Get and verify Supplier payload from request headers
 * @param {Request} req - Next.js HTTP Request
 * @returns {Object|null} decrypted supplier token, or null if unauthorized/not supplier
 */
export function getSupplierFromRequest(req) {
    try {
        const payload = getUserFromRequest(req);
        if (payload.role !== 'supplier') return null; // Reject if user is not supplier
        return payload;
    } catch {
        return null;
    }
}

/**
 * Get and verify Customer payload from request headers
 * @param {Request} req - Next.js HTTP Request
 * @returns {Object|null} decrypted customer token, or null if unauthorized/not customer
 */
export function getCustomerFromRequest(req) {
    try {
        const payload = getUserFromRequest(req);
        if (payload.role !== 'customer') return null; // Reject if user is not customer
        return payload;
    } catch {
        return null;
    }
}
