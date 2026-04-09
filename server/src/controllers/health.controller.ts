import { Request, Response } from 'express';
import { getDb } from '../services/db.service.js';

export const healthCheck = async (req: Request, res: Response) => {
  try {
    // Simple query to verify DB connectivity
    await getDb().raw('SELECT 1');
    res.status(200).json({ status: 'ok', message: 'Database connection healthy' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Database connection failed', error: error.message });
  }
};
