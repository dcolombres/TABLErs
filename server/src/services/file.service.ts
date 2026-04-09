import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import fsStream from 'fs';
import readline from 'readline';
import crypto from 'crypto';
import csv from 'csv-parser';
import db from './db.service.js';
import * as XLSX from 'xlsx';
import { Knex } from 'knex'; // Added Knex import

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(__dirname, '../../uploads');

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Multer upload instance
export const upload = multer({
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
export async function processSqlDump(filePath: string): Promise<string> {
  let fileContent = await fs.readFile(filePath, 'utf-8');

  // 1. Limpieza inicial pesada: remover comentarios y sintaxis exclusiva
  fileContent = fileContent.replace(/\/\*[\s\S]*?\*\//g, ''); // Remover /* ... */ y /*! ... */
  fileContent = fileContent.replace(/--.*$/gm, ''); // Remover comentarios de línea --
  fileContent = fileContent.replace(/CREATE DATABASE.*?;/gi, ''); // Remover crear DB
  fileContent = fileContent.replace(/USE .*?;/gi, ''); // Remover directivas USE
  fileContent = fileContent.replace(/SET .*?;/gi, ''); // Remover SET @variable o SET time_zone
  
  // 2. Adaptar escapes de comillas simples: MySQL (\') -> SQLite ('')
  // IMPORTANTE: Esto debe hacerse ANTES de intentar procesar inserts.
  fileContent = fileContent.replace(/\\'/g, "''");

  const statements = fileContent.split(';');

  // Prefijo único para evitar colisiones si suben el archivo varias veces
  const uploadPrefix = `imp_${crypto.randomBytes(3).toString('hex')}_`;
  const tableMap = new Map<string, string>(); // original -> new

  // Usar transacción para rendimiento y seguridad en bloque
  await db.transaction(async (trx: Knex.Transaction) => {
    for (let statement of statements) {
      statement = statement.trim();
      if (!statement) continue;

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
        
        // 4. Remover ENGINE, CHARSET, COLLATE y syntax de JSON_VALID/CHECK
        statement = statement.replace(/ENGINE\s*=\s*[A-Za-z0-9_]+/gi, '');
        statement = statement.replace(/DEFAULT CHARSET\s*=\s*[A-Za-z0-9_]+/gi, '');
        statement = statement.replace(/CHARSET\s*=\s*[A-Za-z0-9_]+/gi, '');
        statement = statement.replace(/CHARACTER SET\s*=[A-Za-z0-9_]+/gi, '');
        statement = statement.replace(/COLLATE\s*=\s*[A-Za-z0-9_]+/gi, '');
        statement = statement.replace(/CHECK\s*\(json_valid\(.*?\)\)/gi, '');
        
        // Remover líneas enteras de KEY o UNIQUE KEY que terminan en coma o son la última línea
        // Ejemplo: , UNIQUE KEY `email_unique` (`email`)
        statement = statement.replace(/,\s*(UNIQUE\s+)?KEY\s+[`"']?[A-Za-z0-9_]+[`"']?\s*\([^)]+\)/gi, '');
        // Ejemplo sin coma (última línea antes del paréntesis de cierre)
        statement = statement.replace(/\s*(UNIQUE\s+)?KEY\s+[`"']?[A-Za-z0-9_]+[`"']?\s*\([^)]+\)/gi, '');

        // Remover CONSTRAINT ... FOREIGN KEY si es necesario (mejor dejar que SQLite falle o manejarlas)
        // Pero a veces MySQL añade CONSTRAINT `fk_name` ...
        statement = statement.replace(/CONSTRAINT\s+[`"']?[A-Za-z0-9_]+[`"']?\s+FOREIGN\s+KEY/gi, 'FOREIGN KEY');

        
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
        } catch (e: any) {
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
        } catch (e: any) {
          console.warn(`Omitiendo un INSERT problemático: ${e.message}`);
        }
      }
      else {
        // En un MVP saltamos vistas, triggers o funciones extrañas.
        try {
          await trx.raw(statement);
        } catch (e) {
             /* ignoramos silenciosamente sentencias misceláneas rotas */
        }
      }
    }
  });

  await fs.unlink(filePath).catch(() => {}); // Limpiar archivo residual
  return Array.from(tableMap.values()).join(', '); // Retornamos los nombres creados
}

/**
 * Real CSV import handling
 */
export async function processCsvExcel(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.csv') {
    // Detect separator by sniffing the first line safely without loading the whole file
    const getSeparator = async () => {
      const fileStream = fsStream.createReadStream(filePath);
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
      for await (const line of rl) {
        rl.close();
        fileStream.destroy();
        return line.split(';').length > line.split(',').length ? ';' : ',';
      }
      return ',';
    };

    const separator = await getSeparator();

    return new Promise((resolve, reject) => {
      const results: any[] = [];
      let headers: string[] = [];
      const tableName = `imp_${crypto.randomBytes(3).toString('hex')}_csv`;

      fsStream.createReadStream(filePath)
        .pipe(csv({
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
             await db.transaction(async (trx: Knex.Transaction) => {
               // Crear tabla asumiendo todo TEXT, el tipado se maneja en el frontend/ECharts
               const colDefs = headers.map(h => `"${h}" TEXT`).join(', ');
               await trx.raw(`CREATE TABLE "${tableName}" (${colDefs})`);

               // Insert batches of 100
               const chunkSize = 100;
               for (let i = 0; i < results.length; i += chunkSize) {
                 const chunk = results.slice(i, i + chunkSize);
                 const mappedChunk = chunk.map(row => {
                    const obj: any = {};
                    headers.forEach(h => { obj[h] = row[h] });
                    return obj;
                 });
                 await trx(tableName).insert(mappedChunk);
               }
             });
             await fs.unlink(filePath).catch(() => {});
             resolve(tableName);
           } catch (e) {
             reject(e);
           }
        })
        .on('error', (err) => reject(err));
    });
  } else if (ext === '.xlsx' || ext === '.xls') {
    return new Promise(async (resolve, reject) => {
      try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Get data as array of arrays

        if (jsonData.length === 0) {
          await fs.unlink(filePath).catch(() => {});
          return reject(new Error("El archivo Excel está vacío o no contiene datos en la primera hoja."));
        }

        // Assume first row is headers
        let headers: string[] = jsonData[0].map((h: string | number) =>
          String(h).trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
        );
        // Ensure headers are unique and not empty
        const seenHeaders = new Set<string>();
        headers = headers.map((h, index) => {
          if (!h) return `col_${index}`;
          let uniqueH = h;
          let counter = 1;
          while (seenHeaders.has(uniqueH)) {
            uniqueH = `${h}_${counter++}`;
          }
          seenHeaders.add(uniqueH);
          return uniqueH;
        });

        const dataRows = jsonData.slice(1); // Actual data starts from the second row

        const tableName = `imp_${crypto.randomBytes(3).toString('hex')}_excel`;

        await db.transaction(async trx => {
          const colDefs = headers.map(h => `"${h}" TEXT`).join(', ');
          await trx.raw(`CREATE TABLE "${tableName}" (${colDefs})`);

          const chunkSize = 100;
          for (let i = 0; i < dataRows.length; i += chunkSize) {
            const chunk = dataRows.slice(i, i + chunkSize);
            const mappedChunk = chunk.map(row => {
              const obj: any = {};
              headers.forEach((h, index) => {
                obj[h] = row[index] !== undefined ? String(row[index]) : null;
              });
              return obj;
            });
            if (mappedChunk.length > 0) {
              await trx(tableName).insert(mappedChunk);
            }
          }
        });

        await fs.unlink(filePath).catch(() => {});
        resolve(tableName);

      } catch (e: any) {
        await fs.unlink(filePath).catch(() => {});
        reject(new Error(`Error al procesar el archivo Excel: ${e.message}`));
      }
    });
  } else {
    await fs.unlink(filePath).catch(() => {});
    throw new Error('Tipo de archivo no soportado. Usar SQL, CSV o Excel.');
  }
}