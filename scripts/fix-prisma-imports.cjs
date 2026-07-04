/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const features = [
  {
    name: 'company',
    apiFile: 'src/features/company/lib/company-api.ts',
    serviceFile: 'src/features/company/services/company.service.ts',
    functionName: 'getCompanies',
    prismaType: 'Company as PrismaCompany',
    prismaTypeUsage: 'PrismaCompany',
    model: 'company'
  },
  {
    name: 'product',
    apiFile: 'src/features/product/lib/product-api.ts',
    serviceFile: 'src/features/product/services/product.service.ts',
    functionName: 'getProducts',
    prismaType: 'Product as PrismaProduct',
    prismaTypeUsage: 'PrismaProduct',
    model: 'product'
  },
  {
    name: 'periodicity',
    apiFile: 'src/features/admin/periodicities/lib/periodicity-api.ts',
    serviceFile: 'src/features/admin/periodicities/services/periodicity.service.ts',
    functionName: 'getPeriodicities',
    prismaType: 'BuyPeriodicity',
    prismaTypeUsage: 'BuyPeriodicity',
    model: 'buyPeriodicity'
  },
  {
    name: 'currency',
    apiFile: 'src/features/admin/currencies/lib/currency-api.ts',
    serviceFile: 'src/features/admin/currencies/services/currency.service.ts',
    functionName: 'getCurrencies',
    prismaType: 'Currency as PrismaCurrency',
    prismaTypeUsage: 'PrismaCurrency',
    model: 'currency'
  },
  {
    name: 'origins',
    apiFile: 'src/features/origins/lib/origins-api.ts',
    serviceFile: 'src/features/origins/services/origins.service.ts',
    functionName: 'getClientOrigins',
    prismaType: 'ClientOrigin',
    prismaTypeUsage: 'ClientOrigin',
    model: 'clientOrigin'
  }
];

// Helper to ensure dir exists
const ensureDir = (filePath) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

for (const feature of features) {
  if (fs.existsSync(feature.apiFile)) {
    const apiContent = fs.readFileSync(feature.apiFile, 'utf8');
    
    // Check if the function is actually exported from the api file
    if (apiContent.includes(`export async function ${feature.functionName}`)) {
      
      // Create service file content
      const serviceContent = `import { prisma } from '@/lib/prisma'
import type { ${feature.prismaType} } from '@prisma/client'

/**
 * Server-side function to get active ${feature.name} items.
 * Use this in Server Components and API Routes.
 */
export async function ${feature.functionName}(): Promise<${feature.prismaTypeUsage}[]> {
\treturn await prisma.${feature.model}.findMany({
\t\twhere: {
\t\t\t${feature.name === 'company' || feature.name === 'product' ? 'status' : 'active'}: true,
\t\t},
\t\torderBy: {
\t\t\tname: 'asc',
\t\t},
\t})
}
`;
      ensureDir(feature.serviceFile);
      fs.writeFileSync(feature.serviceFile, serviceContent);
      
      // Remove Prisma import and the function from the api file
      let newApiContent = apiContent
        .replace(/import { prisma } from '@\/lib\/prisma'\n/g, '')
        .replace(new RegExp(`import type { ${feature.prismaType.replace(/\s+/g, '\\s+')} } from '@prisma/client'\\n`, 'g'), '');
        
      // Remove the function definition using regex
      const fnRegex = new RegExp(`(/\\*\\*[\\s\\S]*?\\*/\\s*)?export async function ${feature.functionName}\\(\\)[\\s\\S]*?\\}\\n\\n?`);
      newApiContent = newApiContent.replace(fnRegex, '');
      
      fs.writeFileSync(feature.apiFile, newApiContent);
      
      // Now update all imports in src/app and src/features
      const filesToUpdate = execSync(`grep -rl "${feature.functionName}" src/app src/features || true`).toString().split('\n').filter(Boolean);
      for (const file of filesToUpdate) {
        if (file === feature.serviceFile) continue;
        let content = fs.readFileSync(file, 'utf8');
        
        // If it imports the function from the api file, change it to the service file
        const oldImportPath = `@/${feature.apiFile.replace('src/', '').replace('.ts', '')}`;
        const newImportPath = `@/${feature.serviceFile.replace('src/', '').replace('.ts', '')}`;
        
        if (content.includes(oldImportPath)) {
          // It might be imported along with other things: import { getCompanies, companyApi }
          // Or alone: import { getCompanies }
          
          if (content.includes(`import { ${feature.functionName} } from '${oldImportPath}'`)) {
            content = content.replace(`import { ${feature.functionName} } from '${oldImportPath}'`, `import { ${feature.functionName} } from '${newImportPath}'`);
          } else {
             // Just a brute force add import if we can't easily parse it
             // Let's replace the import if it's mixed
             const importRegex = new RegExp(`import\\s+\\{([^}]*)${feature.functionName}([^}]*)\\}\\s+from\\s+['"]${oldImportPath}['"]`);
             const match = content.match(importRegex);
             if (match) {
                 const otherImports = (match[1] + match[2]).replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);
                 if (otherImports.length === 0) {
                     content = content.replace(match[0], `import { ${feature.functionName} } from '${newImportPath}'`);
                 } else {
                     content = content.replace(match[0], `import { ${otherImports.join(', ')} } from '${oldImportPath}'\nimport { ${feature.functionName} } from '${newImportPath}'`);
                 }
             }
          }
          fs.writeFileSync(file, content);
        }
      }
    }
  }
}
