import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script para generar archivos Excel de prueba de carga (Tipo VOLUNTARIA)
 * Con datos REALISTAS y granulares.
 * 
 * Ejecutar con: npx tsx scripts/generate-load-test-files.ts
 */

const outputDir = path.join(__dirname, '../docs/load-tests');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const VOLUNTARIA_HEADERS = [
    'Nombre Franquicia',
    'Desde',
    'Hasta',
    'Nombre Fp',
    'Sub Grupo Fp',
    'Compania',
    'Producto',
    'Tipo de Comision',
    'Cto',
    ' Base',
    ' Com'
];

const REAL_NAMES = [
    'Vanesa Cardona',
    'Carlos Mendoza',
    'Ana Rodríguez',
    'Luis Fernández',
    'María González',
    'Pedro Martínez',
    'Laura Sánchez',
    'Diego Ramírez'
];

function createRow(data: Partial<Record<string, string | number>>) {
    // Nota: Los headers en el Excel real tienen espacios iniciales en ' Base' y ' Com' según el análisis de test-sinc.xlsx
    return [
        data['Nombre Franquicia'] ?? 'URIBE SEGUROS LTDA',
        data['Desde'] ?? '2026-02-01',
        data['Hasta'] ?? '2026-02-28',
        data['Nombre Fp'] ?? data['Nombre_Agente'] ?? REAL_NAMES[Math.floor(Math.random() * REAL_NAMES.length)],
        data['Sub Grupo Fp'] ?? '1',
        data['Compania'] ?? 'Skandia Pensiones y Cesantías S.A.',
        data['Producto'] ?? 'CPA',
        data['Tipo de Comision'] ?? 'COMISION TIPO CEDULA NUEVA POST VENTA',
        data['Cto'] ?? 'VOL-2026-0000',
        data[' Base'] ?? 1000000,
        data[' Com'] ?? 50000
    ];
}

function generateScenario(name: string, count: number, rowGenerator: (i: number) => (string | number)[]) {
    console.log(`📑 Generando escenario realista: ${name} (${count} registros)...`);
    const data: (string | number)[][] = [VOLUNTARIA_HEADERS];
    for (let i = 1; i <= count; i++) {
        data.push(rowGenerator(i));
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    
    const fileName = `load_test_${name.toLowerCase()}.xlsx`;
    XLSX.writeFile(wb, path.join(outputDir, fileName));
    console.log(`✅ Archivo generado: ${fileName}`);
}

// 1. Sincronizados (VOL-2026-1001 a 2000)
generateScenario('Sincronizados', 1000, (i) => createRow({
    'Cto': `VOL-2026-${(1000 + i).toString()}`,
    ' Base': 1250000 + (i * 100),
    ' Com': 62500 + (i * 5)
}));

// 2. No Sincronizados (VOL-2026-9001 a 9999 - No existen en seed)
generateScenario('No_Sincronizados', 1000, (i) => createRow({
    'Cto': `VOL-2026-${(9000 + i).toString()}`,
    ' Base': 1500000 + i,
    ' Com': 75000
}));

// 3. Rezagados (LAG) (VOL-2026-2001 a 3000)
generateScenario('Rezagados', 1000, (i) => createRow({
    'Cto': `VOL-2026-${(2000 + i).toString()}`,
    'Desde': '2026-02-01',
    'Hasta': '2026-02-28', 
    ' Base': 2000000 + (i * 10)
}));

// 4. Errores
generateScenario('Errores', 100, (i) => {
    if (i % 3 === 0) return createRow({ 'Cto': '' }); 
    if (i % 3 === 1) return createRow({ ' Base': 'ERROR_NUM' });
    return createRow({ 'Desde': 'FECHA_INVAL' });
});

// 5. Mixto
generateScenario('Mixto', 500, (i) => {
    const type = i % 4;
    if (type === 0) return createRow({ 'Cto': `VOL-2026-${(1000 + (i % 1000)).toString()}` }); // Sync
    if (type === 1) return createRow({ 'Cto': `VOL-2026-${(9500 + i).toString()}` }); // NoSync
    if (type === 2) return createRow({ 'Cto': `VOL-2026-${(2000 + (i % 1000)).toString()}` }); // Lag
    return createRow({ 'Cto': '' }); // Error
});

console.log(`\n✨ Todos los archivos realistas generados en: ${outputDir}`);
