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
import { syncGoogleSheet } from '../controllers/googleDrive.controller'; // Import the new controller

const router = Router();

// ── Data Source Management ───────────────────────────────────
router.get('/tables', getTables);
router.delete('/table/:table', deleteTable);
router.get('/schema/:table', getSchema);

// ── Google Drive Integration ─────────────────────────────────
router.post('/gdrive-sync', syncGoogleSheet); // New route for Google Drive sync

// ── Query (for ChartRenderer) ────────────────────────────────
router.post('/query', queryData);
router.post('/data', getData); // Legacy route

// ── Dashboard Configuration ──────────────────────────────────
router.get('/dashboard/default', getDashboardConfig);
router.post('/dashboard/save', saveDashboardConfig);

export default router;
