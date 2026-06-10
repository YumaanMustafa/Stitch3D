const db = require('./src/lib/db');
async function check() {
    try {
        const [columns] = await db.query('DESCRIBE orders');
        console.log('Columns in orders:');
        console.log(columns.map(c => `${c.Field} (${c.Type})`).join(', '));
        
        const [rows] = await db.query('SELECT * FROM orders LIMIT 2');
        console.log('First 2 rows:');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
check();
