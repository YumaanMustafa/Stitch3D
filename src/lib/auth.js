
import jwt from "jsonwebtoken";
import db from "./db.js";

/**
 * @file auth.js
 * @description Authentication utilities for handling JWT tokens in Next.js requests.
 */

/**
 * Extract and verify JWT from Next.js Request
 * @param {Request} req
 * @returns {Object} decoded token payload
 * @throws {Error} if invalid or missing
 */
export function getUserFromRequest(req) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Missing or invalid Authorization header");
    }
    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || 'supersecretkey';

    return jwt.verify(token, secret);
}

/**
 * Helper to map a user_id (from token) to a vendor_id (from vendors table)
 * Or use vendor_id directly if already present in token payload.
 * @param {Object} payload 
 * @returns {Promise<number|null>}
 */
export async function getVendorIdFromUser(payload) {
    if (!payload) return null;

    if (payload.vendor_id) return payload.vendor_id;

    const userId = payload.id;
    if (!userId) return null;

    try {
        const [rows] = await db.query("SELECT vendor_id FROM vendors WHERE user_id = ?", [userId]);
        if (rows.length === 0) {
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
 * Get and verify Admin payload
 */
export function getAdminFromRequest(req) {
    try {
        const payload = getUserFromRequest(req);
        if (payload.role !== 'admin') return null;
        return payload;
    } catch {
        return null;
    }
}

/**
 * Get and verify Vendor payload
 */
export function getVendorFromRequest(req) {
    try {
        const payload = getUserFromRequest(req);
        if (payload.role !== 'vendor') return null;
        return payload;
    } catch {
        return null;
    }
}
/**
 * Get and verify Supplier payload
 */
export function getSupplierFromRequest(req) {
    try {
        const payload = getUserFromRequest(req);
        if (payload.role !== 'supplier') return null;
        return payload;
    } catch {
        return null;
    }
}
/**
 * Get and verify Customer payload
 */
export function getCustomerFromRequest(req) {
    try {
        const payload = getUserFromRequest(req);
        if (payload.role !== 'customer') return null;
        return payload;
    } catch {
        return null;
    }
}
