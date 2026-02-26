import * as XLSX from 'xlsx';
import path from 'path';

const files = [
    'docs/BASE DE VOLUNTARIAS SKANDIA.xlsx',
    'docs/Polizas.xlsx'
];

files.forEach(file => {
    console.log(`\n--- Analizando: ${file} ---`);
    try {
        const workbook = XLSX.readFile(file);
        const sheetName = workbook.SheetNames[0];
        const datasheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(datasheet, { header: 1 });

        if (data.length > 0) {
            console.log('Headers:', JSON.stringify(data[0]));
            console.log('Sample Row 1:', JSON.stringify(data[1]));
        } else {
            console.log('Archivo vacío.');
        }
    } catch (error) {
        console.error(`Error leyendo ${file}:`, error.message);
    }
});
