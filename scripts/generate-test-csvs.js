import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POLIZA_HEADERS = 'Polizas Periodo,Plan de Compensación,Valor Comisión,BASE,Polizas Producto,Contrato Largo,Polizas Id Agente,Polizas Nombre Agente,Polizas Id Sociedad,Nombre Sociedad,Polizas Clasificación';
const VOLUNTARIA_HEADERS = 'Nombre Franquicia,Desde,Hasta,Nombre Fp,Sub Grupo Fp,Compania,Producto,Tipo de Comision,Cto,Base,Com';

const testDataDir = path.join(__dirname, '../docs/test-data');
if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
}

const scenarios = ['synchronized', 'lagged', 'mixed', 'errors'];

function generatePolizaRow(scenario, index) {
    const base = `2026-02,Plan A,1000,50000,Product X,CONT-${1000 + index},AG-01,Agente Prueba,SOC-01,Sociedad Prueba,A`;
    if (scenario === 'errors' && index % 2 === 0) {
        return `2026-02,,,,,,AG-01,Agente Prueba,SOC-01,Sociedad Prueba,A`; // Missing required fields
    }
    return base;
}

function generateVoluntariaRow(scenario, index) {
    const base = `Franquicia A,2026-02-01,2026-02-28,Nombre FP,Subgrupo A,Compania A,Producto A,Comision A,CTO-${2000 + index},100000,5000`;
    if (scenario === 'errors' && index % 2 === 0) {
        return `Franquicia A,INVALID_DATE,2026-02-28,Nombre FP,Subgrupo A,Compania A,Producto A,Comision A,CTO-${2000 + index},NOT_A_NUMBER,5000`;
    }
    return base;
}

scenarios.forEach(scenario => {
    // Poliza
    const polizaRows = [POLIZA_HEADERS];
    for (let i = 1; i <= 10; i++) {
        polizaRows.push(generatePolizaRow(scenario, i));
    }
    fs.writeFileSync(path.join(testDataDir, `poliza-${scenario}.csv`), polizaRows.join('\n'));

    // Voluntaria
    const voluntariaRows = [VOLUNTARIA_HEADERS];
    for (let i = 1; i <= 10; i++) {
        voluntariaRows.push(generateVoluntariaRow(scenario, i));
    }
    fs.writeFileSync(path.join(testDataDir, `voluntaria-${scenario}.csv`), voluntariaRows.join('\n'));
});

console.log('Archivos CSV de prueba generados exitosamente en docs/test-data/');
