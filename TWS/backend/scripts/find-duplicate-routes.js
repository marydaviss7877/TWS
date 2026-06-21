const fs = require('fs');
const path = require('path');
const routeMap = {};

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    const m = line.match(/router\.(get|post|put|delete|patch)\(['"](\/[^'"]+)['"]/);
    if (m) {
      const key = m[1].toUpperCase() + ' ' + m[2];
      if (!routeMap[key]) routeMap[key] = [];
      routeMap[key].push(filePath.replace(process.cwd() + '\\', '').replace(process.cwd() + '/', '') + ':' + (i + 1));
    }
  });
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) walkDir(full);
    else if (full.endsWith('.js')) scanFile(full);
  }
}

walkDir('src/modules');
walkDir('src/routes');

const duplicates = Object.entries(routeMap).filter(([k, v]) => v.length > 1);
duplicates.forEach(([route, files]) => {
  console.log('DUPLICATE:', route);
  files.forEach(f => console.log('  ', f));
});
console.log('\nTotal duplicate route groups:', duplicates.length);
