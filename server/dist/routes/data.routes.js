"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const queryGuard_middleware_1 = require("../middleware/queryGuard.middleware");
const data_controller_1 = require("../controllers/data.controller");
const upload_controller_1 = require("../controllers/upload.controller"); // Import uploadFile
const router = (0, express_1.Router)();
// Route for fetching data with query guard
router.post('/data', queryGuard_middleware_1.queryGuardMiddleware, data_controller_1.getData);
// Route for file uploads
router.post('/upload', upload_controller_1.uploadFile); // Add upload route
exports.default = router;
