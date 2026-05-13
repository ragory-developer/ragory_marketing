const fs = require('fs');
const path = require('path');

const files = [
  'app/api/sheets/[id]/cells/route.ts',
  'app/api/sheets/[id]/cols/route.ts',
  'app/api/sheets/[id]/rows/route.ts',
  'app/api/sheets/[id]/cols/[colIndex]/route.ts',
  'app/api/sheets/[id]/rows/[rowIndex]/route.ts'
];

files.forEach(f => {
  const filePath = path.join(process.cwd(), f);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace: export async function POST(req: Request, { params }: { params: { id: string } }) {
  // With: export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // And add: const { id } = await params;
  
  content = content.replace(
    /export async function (\w+)\(([^)]*), \{ params \}: \{ params: \{ ([^}]*) \} \}\) \{/g,
    (match, funcName, reqArg, paramList) => {
      const vars = paramList.split(',').map(s => s.split(':')[0].trim()).join(', ');
      return `export async function ${funcName}(${reqArg}, { params }: { params: Promise<{ ${paramList} }> }) {\n  const { ${vars} } = await params;`;
    }
  );

  // Replace params.id with id, params.colIndex with colIndex, etc.
  content = content.replace(/params\.(\w+)/g, '$1');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated', f);
});
