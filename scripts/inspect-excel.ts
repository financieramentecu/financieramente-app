import * as XLSX from 'xlsx';
import * as fs from 'fs';

function inspectFile(path: string) {
    console.log(`\n--- Inspecting: ${path} ---`);
    const file = fs.readFileSync(path);
    const workbook = XLSX.read(file);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log('Headers:', data[0]);
    console.log('Sample Row 1:', data[1]);
}

inspectFile('docs/Polizas.xlsx');
inspectFile('docs/BASE DE VOLUNTARIAS SKANDIA.xlsx');
