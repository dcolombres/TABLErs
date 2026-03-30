"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_controller_1 = require("../controllers/data.controller");
const googleDrive_controller_1 = require("../controllers/googleDrive.controller"); // Import the new controller
const router = (0, express_1.Router)();
// ── Data Source Management ───────────────────────────────────
router.get('/tables', data_controller_1.getTables);
router.delete('/table/:table', data_controller_1.deleteTable);
router.get('/schema/:table', data_controller_1.getSchema);
// ── Google Drive Integration ─────────────────────────────────
router.post('/gdrive-sync', googleDrive_controller_1.syncGoogleSheet); // New route for Google Drive sync
// ── Query (for ChartRenderer) ────────────────────────────────
router.post('/query', data_controller_1.queryData);
router.post('/data', data_controller_1.getData); // Legacy route
// ── Dashboard Configuration ──────────────────────────────────
router.get('/dashboard/default', data_controller_1.getDashboardConfig);
router.post('/dashboard/save', data_controller_1.saveDashboardConfig);
exports.default = router;
