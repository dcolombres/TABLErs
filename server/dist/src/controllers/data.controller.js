"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getData = void 0;
const db_service_1 = __importDefault(require("../services/db.service"));
const getData = async (req, res) => {
    const { tableName, columns, where } = req.body;
    try {
        let query = (0, db_service_1.default)(tableName);
        if (columns && Array.isArray(columns) && columns.length > 0) {
            query = query.select(columns);
        }
        else {
            query = query.select('*');
        }
        if (where && typeof where === 'object' && Object.keys(where).length > 0) {
            query = query.where(where);
        }
        const result = await query;
        res.json(result);
    }
    catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to fetch data.' });
    }
};
exports.getData = getData;
