import jwt from 'jsonwebtoken';
import db from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export async function getChatUserId(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const userId = decoded.userId || decoded.user_id;
        if (userId) return userId;
        
        if (decoded.role === 'vendor') {
            const [rows] = await db.query("SELECT user_id FROM vendors WHERE vendor_id = ?", [decoded.id]);
            return rows[0]?.user_id;
        }
        if (decoded.role === 'supplier') {
            const [rows] = await db.query("SELECT user_id FROM suppliers WHERE supplier_id = ?", [decoded.id]);
            return rows[0]?.user_id;
        }
        
        return decoded.id;
    } catch (e) {
        return null;
    }
}

export async function getChatUserRole(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.role;
    } catch (e) {
        return null;
    }
}
