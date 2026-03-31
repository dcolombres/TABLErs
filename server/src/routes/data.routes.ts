import { Router } from 'express';
import {
  getTables,
  deleteTable,
  getSchema,
  queryData,
  getDashboardConfig,
  saveDashboardConfig,
  getData,
} from '../controllers/data.controller';
import { queryGuardMiddleware } from '../middleware/queryGuard.middleware';
import { syncGoogleSheet } from '../controllers/googleDrive.controller'; // Import the new controller

const router = Router();

// ── Data Source Management ───────────────────────────────────
router.get('/tables', getTables);
router.delete('/table/:table', queryGuardMiddleware, deleteTable); // Apply middleware
router.get('/schema/:table', queryGuardMiddleware, getSchema); // Apply middleware

// ── Google Drive Integration ─────────────────────────────────
router.post('/gdrive-sync', syncGoogleSheet); // New route for Google Drive sync

// ── Query (for ChartRenderer) ────────────────────────────────
router.post('/query', queryGuardMiddleware, queryData); // Apply middleware
router.post('/data', queryGuardMiddleware, getData); // Apply middleware to legacy route

// ── Dashboard Configuration ──────────────────────────────────
router.get('/dashboard/default', getDashboardConfig);
router.post('/dashboard/save', saveDashboardConfig);

export default router;
