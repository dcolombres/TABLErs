"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
exports.processSqlDump = processSqlDump;
exports.processCsvExcel = processCsvExcel;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = __importDefault(require("fs"));
const readline_1 = __importDefault(require("readline"));
const crypto_1 = __importDefault(require("crypto"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const db_service_1 = __importDefault(require("./db.service"));
const uploadDir = path_1.default.resolve(__dirname, '../../uploads');
// Multer storage configuration
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
// Multer upload instance
exports.upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/sql',
            'text/plain', // For .sql files that might be text/plain
            'text/csv',
            'application/vnd.ms-excel', // .xls
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
        ];
        if (!allowedMimes.includes(file.mimetype) && !file.originalname.endsWith('.sql')) {
            cb(new Error('Invalid file type. Only SQL, CSV, and Excel files are allowed.'));
            return;
        }
        cb(null, true);
    }
});
/**
 * Parses an SQL dump file and performs a batch insert into SQLite.
 * Generates a unique table name.
 * @param filePath Path to the uploaded SQL file.
 * @returns The name of the newly created table.
 */
async function processSqlDump(filePath) {
    let fileContent = await promises_1.default.readFile(filePath, 'utf-8');
    // 1. Limpieza inicial pesada: remover comentarios y sintaxis exclusiva
    fileContent = fileContent.replace(/\/\*[\s\S]*?\*\//g, ''); // Remover /* ... */ y /*! ... */
    fileContent = fileContent.replace(/--.*$/gm, ''); // Remover comentarios de línea --
    fileContent = fileContent.replace(/CREATE DATABASE.*?;/gi, ''); // Remover crear DB
    fileContent = fileContent.replace(/USE .*?;/gi, ''); // Remover directivas USE
    const statements = fileContent.split(';');
    // Prefijo único para evitar colisiones si suben el archivo varias veces
    const uploadPrefix = `imp_${crypto_1.default.randomBytes(3).toString('hex')}_`;
    const tableMap = new Map(); // original -> new
    // Usar transacción para rendimiento y seguridad en bloque
    await db_service_1.default.transaction(async (trx) => {
        for (let statement of statements) {
            statement = statement.trim();
            if (!statement)
                continue;
            const upperStmt = statement.toUpperCase();
            // Ignorar comandos no compatibles con SQLite o innecesarios de MariaDB
            if (upperStmt.startsWith('SET ') ||
                upperStmt.startsWith('LOCK ') ||
                upperStmt.startsWith('UNLOCK ') ||
                upperStmt.startsWith('DROP ')) {
                continue;
            }
            if (upperStmt.startsWith('CREATE TABLE')) {
                // Adaptación de dialecto MySQL -> SQLite
                // 1. Remover puramente el AUTO_INCREMENT
                statement = statement.replace(/AUTO_INCREMENT\s*=\s*\d+/gi, '');
                statement = statement.replace(/AUTO_INCREMENT/gi, '');
                statement = statement.replace(/AUTOINCREMENT\s*=\s*\d+/gi, '');
                statement = statement.replace(/AUTOINCREMENT/gi, '');
                // 2. Remover modificadores irrelevantes o erróneos para SQLite
                statement = statement.replace(/\bUNSIGNED\b/gi, '');
                // 3. Tipos numéricos con tamaño ej. bigint(20), int(11) -> INTEGER
                statement = statement.replace(/\b(bigint|tinyint|smallint|mediumint|int)\([^)]+\)/gi, 'INTEGER');
                // 4. Remover ENGINE, CHARSET, COLLATE y syntax de KEY (índices inline de MySQL que SQLite rechaza)
                statement = statement.replace(/ENGINE\s*=\s*[A-Za-z0-9_]+/gi, '');
                statement = statement.replace(/DEFAULT CHARSET\s*=\s*[A-Za-z0-9_]+/gi, '');
                statement = statement.replace(/CHARSET\s*=\s*[A-Za-z0-9_]+/gi, '');
                statement = statement.replace(/COLLATE\s*=\s*[A-Za-z0-9_]+/gi, '');
                statement = statement.replace(/,\s*KEY\s+["`']?[A-Za-z0-9_]+["`']?\s*\([^)]+\)/gi, '');
                // Registrar nombre original e inyectar el nuevo con prefijo (Soporta IF NOT EXISTS)
                const match = statement.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["`']?([a-zA-Z0-9_]+)["`']?/i);
                let currentTableName = '';
                if (match && match[1]) {
                    const originalName = match[1];
                    currentTableName = uploadPrefix + originalName;
                    tableMap.set(originalName, currentTableName);
                    // Escapar para regex y reemplazar
                    const originalEscaped = originalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const pat = new RegExp(`CREATE TABLE\\s+(?:IF NOT EXISTS\\s+)?["'\\\`]?${originalEscaped}["'\\\`]?`, 'i');
                    statement = statement.replace(pat, `CREATE TABLE "${currentTableName}"`);
                }
                // Reemplazar referencias de Foreign Keys a tablas previamente mapeadas
                for (const [orig, mapped] of tableMap.entries()) {
                    const origEscaped = orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const fkPat = new RegExp(`REFERENCES\\s+["'\\\`]?${origEscaped}["'\\\`]?`, 'gi');
                    statement = statement.replace(fkPat, `REFERENCES "${mapped}"`);
                }
                try {
                    await trx.raw(statement);
                }
                catch (e) {
                    console.warn(`Aviso al ejecutar CREATE TABLE ${currentTableName}: ${e.message}`);
                    // throw e; <-- Quitamos el strict throw para que una tabla rota del dump no cancele toda la base de datos
                }
            }
            else if (upperStmt.startsWith('INSERT INTO')) {
                // Aislar nombre de tabla y reemplazarlo por el mapeado para asegurar correspondencia
                const insertMatch = statement.match(/INSERT INTO\s+["'\`]?([a-zA-Z0-9_]+)["'\`]?/i);
                if (insertMatch && insertMatch[1]) {
                    const orig = insertMatch[1];
                    const mappedName = tableMap.get(orig) || orig; // Si no lo tenemos, probamos crudo
                    const origEscaped = orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const pat = new RegExp(`INSERT INTO\\s+["'\\\`]?${origEscaped}["'\\\`]?`, 'i');
                    statement = statement.replace(pat, `INSERT INTO "${mappedName}"`);
                }
                try {
                    // El split por punto y coma es peligroso para INSERTs con textos que contengan ';',
                    // pero como dividimos todo el archivo al principio y asumiendo que el dump 
                    // tiene los inserts por fila, lo ejecutamos crudo.
                    await trx.raw(statement);
                }
                catch (e) {
                    console.warn(`Omitiendo un INSERT problemático: ${e.message}`);
                }
            }
            else {
                // En un MVP saltamos vistas, triggers o funciones extrañas.
                try {
                    await trx.raw(statement);
                }
                catch (e) {
                    /* ignoramos silenciosamente sentencias misceláneas rotas */
                }
            }
        }
    });
    await promises_1.default.unlink(filePath).catch(() => { }); // Limpiar archivo residual
    return Array.from(tableMap.values()).join(', '); // Retornamos los nombres creados
}
/**
 * Real CSV import handling
 */
async function processCsvExcel(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    if (ext === '.csv') {
        // Detect separator by sniffing the first line safely without loading the whole file
        const getSeparator = async () => {
            const fileStream = fs_1.default.createReadStream(filePath);
            const rl = readline_1.default.createInterface({ input: fileStream, crlfDelay: Infinity });
            for await (const line of rl) {
                rl.close();
                fileStream.destroy();
                return line.split(';').length > line.split(',').length ? ';' : ',';
            }
            return ',';
        };
        const separator = await getSeparator();
        return new Promise((resolve, reject) => {
            const results = [];
            let headers = [];
            const tableName = `imp_${crypto_1.default.randomBytes(3).toString('hex')}_csv`;
            fs_1.default.createReadStream(filePath)
                .pipe((0, csv_parser_1.default)({
                separator: separator,
                mapHeaders: ({ header, index }) => {
                    let h = header.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
                    return h || `col_${index}`;
                }
            }))
                .on('headers', (headerList) => {
                headers = headerList;
            })
                .on('data', (data) => results.push(data))
                .on('end', async () => {
                if (headers.length === 0 || results.length === 0) {
                    // Let's try to reject or handle differently if it's empty
                    reject(new Error("El CSV está vacío o no se reconoció el separador (intenta guardarlo delimitado por comas)."));
                    return;
                }
                try {
                    await db_service_1.default.transaction(async (trx) => {
                        // Crear tabla asumiendo todo TEXT, el tipado se maneja en el frontend/ECharts
                        const colDefs = headers.map(h => `"${h}" TEXT`).join(', ');
                        await trx.raw(`CREATE TABLE "${tableName}" (${colDefs})`);
                        // Insert batches of 100
                        const chunkSize = 100;
                        for (let i = 0; i < results.length; i += chunkSize) {
                            const chunk = results.slice(i, i + chunkSize);
                            const mappedChunk = chunk.map(row => {
                                const obj = {};
                                headers.forEach(h => { obj[h] = row[h]; });
                                return obj;
                            });
                            await trx(tableName).insert(mappedChunk);
                        }
                    });
                    await promises_1.default.unlink(filePath).catch(() => { });
                    resolve(tableName);
                }
                catch (e) {
                    reject(e);
                }
            })
                .on('error', (err) => reject(err));
        });
    }
    else {
        // Not implemented yet: xlsx
        await promises_1.default.unlink(filePath).catch(() => { });
        throw new Error('Solo se soporta .SQL y .CSV actualmente. Exporta tu Excel a CSV (delimitado por comas) e intenta de nuevo.');
    }
}
