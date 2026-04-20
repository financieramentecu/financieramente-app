import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import * as path from 'path';

const filePath = path.resolve('/Users/andres/Documents/financieramente/financieramente-app/docs/test-sinc.xlsx');
try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const contracts = new Set();
    data.slice(1).forEach((row: unknown[]) => {
        const cto = row[8]; // Index of "Cto" column
        if (cto) {
            contracts.add(String(cto));
        }
    });

    console.log(JSON.stringify(Array.from(contracts)));
} catch (e) {
    console.error('Error:', (e as Error).message);
}
