
import { sendResetPasswordEmail } from './src/lib/email.js';
import dotenv from 'dotenv';
dotenv.config();

console.log('User:', process.env.EMAIL_USER);
// console.log('Pass:', process.env.EMAIL_PASS); // Don't log pass

async function test() {
    try {
        console.log('Attempting to send email...');
        await sendResetPasswordEmail(process.env.EMAIL_USER, '123456');
        console.log('Success!');
    } catch (e) {
        console.error('Failed:', e);
    }
}
test();
