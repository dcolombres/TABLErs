"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = void 0;
const multer_1 = __importDefault(require("multer"));
const file_service_1 = require("../services/file.service");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const unlinkAsync = (0, util_1.promisify)(fs_1.default.unlink);
const uploadFile = async (req, res) => {
    // Multer handles the file upload to disk
    file_service_1.upload.single('file')(req, res, async (err) => {
        if (err instanceof multer_1.default.MulterError) {
            // A Multer error occurred when uploading.
            return res.status(400).json({ error: err.message });
        }
        else if (err) {
            // An unknown error occurred when uploading.
            return res.status(500).json({ error: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }
        const filePath = req.file.path;
        const originalFileName = req.file.originalname;
        const fileExtension = originalFileName.split('.').pop()?.toLowerCase();
        try {
            let newTableName;
            if (fileExtension === 'sql') {
                newTableName = await (0, file_service_1.processSqlDump)(filePath);
            }
            else if (fileExtension === 'csv' || fileExtension === 'xls' || fileExtension === 'xlsx') {
                newTableName = await (0, file_service_1.processCsvExcel)(filePath);
            }
            else {
                await unlinkAsync(filePath); // Delete unsupported file
                return res.status(400).json({ error: 'Unsupported file type.' });
            }
            res.status(200).json({
                message: 'File uploaded and processed successfully.',
                tableName: newTableName,
                originalFileName: originalFileName,
            });
        }
        catch (processingError) {
            console.error('Error processing uploaded file:', processingError);
            // Attempt to clean up the uploaded file if processing fails
            try {
                await unlinkAsync(filePath);
            }
            catch (cleanupError) {
                console.error('Error cleaning up uploaded file:', cleanupError);
            }
            return res.status(500).json({ error: `Failed to process file: ${processingError.message}` });
        }
    });
};
exports.uploadFile = uploadFile;
