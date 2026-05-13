const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir('./app/api', function(filePath) {
  if (filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace params: { ... } with params: Promise<{ ... }>
    // and inject const { ... } = await params;
    
    let regex = /async function (\w+)\(([^)]*), \{ params \}: \{ params: \{ ([^}]*) \} \}\) \{/g;
    let newContent = content.replace(regex, (match, funcName, reqArg, paramList) => {
      return `async function ${funcName}(${reqArg}, { params }: { params: Promise<{ ${paramList} }> }) {\n  const { ${paramList.split(':').map(s=>s.trim().split(' ')[0]).join(', ')} } = await params;`;
    });

    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
