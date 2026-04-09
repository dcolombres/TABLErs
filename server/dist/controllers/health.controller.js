import { getDb } from '../services/db.service.js';
export const healthCheck = async (req, res) => {
    try {
        // Simple query to verify DB connectivity
        await getDb().raw('SELECT 1');
        res.status(200).json({ status: 'ok', message: 'Database connection healthy' });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: 'Database connection failed', error: error.message });
    }
};
