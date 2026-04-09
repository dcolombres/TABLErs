import { Router } from 'express';
import {
  getTables,
  deleteTable,
  getSchema,
  queryData,
  getDashboardConfig,
  saveDashboardConfig,
  getData,
} from '../controllers/data.controller.js';
import {
  createDashboard,
  getDashboards,
  getDashboardById,
  updateDashboard,
  deleteDashboard,
} from '../controllers/dashboard.controller.js'; // Import dashboard controller functions
import {
  getDataSourcesByDashboardId,
  deleteDataSource,
} from '../controllers/dataSource.controller.js'; // Import data source controller functions
import {
  getDataSourcePreview,
  transformDataSource,
  getChartSuggestions,
  getTableSuggestions,
} from '../controllers/dataSelection.controller.js'; // Import data selection controller functions
import { queryGuardMiddleware } from '../middleware/queryGuard.middleware.js';
import { healthCheck } from '../controllers/health.controller.js';
import { syncGoogleSheet } from '../controllers/googleDrive.controller.js'; // Import the new controller

const router = Router();

// ── Dashboard Management ─────────────────────────────────────
router.post('/dashboards', createDashboard);
router.get('/dashboards', getDashboards);
router.get('/dashboards/:id', getDashboardById);
router.put('/dashboards/:id', updateDashboard);
router.delete('/dashboards/:id', deleteDashboard);

// ── Data Source Management ───────────────────────────────────
router.get('/dashboards/:dashboardId/data-sources', getDataSourcesByDashboardId); // Get data sources for a dashboard
router.delete('/data-sources/:id', deleteDataSource); // Delete a data source

router.get('/tables', getTables); // Existing route, might be deprecated or repurposed
router.delete('/table/:table', queryGuardMiddleware, deleteTable); // Apply middleware
router.get('/schema/:table', queryGuardMiddleware, getSchema); // Apply middleware

// ── Google Drive Integration ─────────────────────────────────
router.post('/gdrive-sync', syncGoogleSheet); // New route for Google Drive sync

// ── Query (for ChartRenderer) ────────────────────────────────
router.post('/query', queryGuardMiddleware, queryData); // Apply middleware
router.post('/data', queryGuardMiddleware, getData); // Apply middleware to legacy route

// ── Data Selection and Transformation ────────────────────────
router.get('/data-sources/:id/preview', getDataSourcePreview);
router.post('/data-sources/:id/transform', transformDataSource);
router.get('/data-sources/:id/suggestions', getChartSuggestions);
router.get('/tables/:tableName/suggestions', getTableSuggestions);

// ── Old Dashboard Configuration (to be replaced) ─────────────
router.get('/dashboard/default', getDashboardConfig);
router.post('/dashboard/save', saveDashboardConfig);

// Health check endpoint
router.get('/health', healthCheck);

export default router;
