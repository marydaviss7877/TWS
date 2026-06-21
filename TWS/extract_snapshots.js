const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend');

function findFiles(dir, ext, ignore) {
    let results = [];
    try {
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            if (ignore.includes(file)) return;
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat && stat.isDirectory()) {
                results = results.concat(findFiles(filePath, ext, ignore));
            } else if (filePath.endsWith(ext) || ext === '.any') {
                if (ext === '.any' && !filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return;
                results.push(filePath);
            }
        });
    } catch(e) {}
    return results;
}

const backendFiles = findFiles(backendDir, '.js', ['node_modules', '.git']);
const frontendFiles = findFiles(frontendDir, '.any', ['node_modules', '.git', 'build']);

// --- SNAPSHOT 1: BACKEND ROUTE MAP ---
const backendRoutes = [];
const backendRouteMap = {};
backendFiles.forEach(f => {
    try {
        const content = fs.readFileSync(f, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            const match = /(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"`](.*?)['"`]\s*,\s*(.*)\)/.exec(line);
            if (match) {
                const method = match[1].toUpperCase().padEnd(6);
                const routePath = match[2];
                const relPath = f.replace(__dirname, '');
                
                // Attempt to guess controller
                const argsPart = match[3];
                const args = argsPart.split(',').map(a => a.trim());
                let controllerFunc = args[args.length - 1];
                if (controllerFunc && controllerFunc.includes('(')) controllerFunc = 'Inline/Arrow Function';
                
                // Check duplicate
                const key = method + routePath;
                let isDup = false;
                if (backendRouteMap[key]) isDup = true;
                backendRouteMap[key] = true;
                
                backendRoutes.push(`${method} | ${routePath} | ${relPath}:${index + 1} | ${controllerFunc || 'Unknown'} | N/A ${isDup ? '⚠️ DUPLICATE' : ''}`);
            }
        });
    } catch(e) {}
});

// --- SNAPSHOT 2: FRONTEND ROUTE MAP ---
const frontendRoutes = [];
const frontendRouteMap = {};
frontendFiles.forEach(f => {
    try {
        const content = fs.readFileSync(f, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            const match = /<Route[^>]*path=['"`](.*?)['"`][^>]*element=\{?<([A-Za-z0-9_]+)/.exec(line);
            if (match) {
                const routePath = match[1];
                const compName = match[2];
                const relPath = f.replace(__dirname, '');
                
                // Exists? Very naive check
                const exists = frontendFiles.some(file => file.endsWith(`${compName}.js`) || file.endsWith(`${compName}.jsx`)) ? 'Y' : 'N';
                
                let isDup = false;
                if (frontendRouteMap[routePath]) isDup = true;
                frontendRouteMap[routePath] = true;
                
                frontendRoutes.push(`${routePath} | ${compName} | ${relPath}:${index + 1} | ${exists} ${isDup ? '⚠️ MULTI-DEF' : ''}`);
            }
        });
    } catch(e) {}
});

// --- SNAPSHOT 3: CRITICAL IMPORT MAP ---
const targetPaths = [
    'backend/controllers',
    'backend/config',
    'backend/services',
    'backend/src/modules/',
    'frontend/src/features/',
    'frontend/src/components/ui'
];

function normalizePath(p) {
    return p.replace(/\\/g, '/');
}

const criticalFilesToMove = [];
[...backendFiles, ...frontendFiles].forEach(f => {
    const norm = normalizePath(f);
    if (targetPaths.some(t => norm.includes(t))) {
        // Only specific files
        if (norm.includes('backend/controllers/') || 
            norm.includes('backend/config/') || 
            (norm.includes('backend/services/') && !norm.includes('backend/src/')) ||
            norm.includes('/routes/') ||
            norm.includes('/pages/') ||
            norm.includes('/components/ui/')) {
            criticalFilesToMove.push(f);
        }
    }
});

const importMap = [];
[...backendFiles, ...frontendFiles].forEach(f => {
    try {
        const content = fs.readFileSync(f, 'utf8');
        const lines = content.split('\n');
        const normPath = normalizePath(f);
        
        lines.forEach((line, index) => {
            if (line.includes('require(') || line.includes('import ')) {
                // Check if this import matches any critical file
                criticalFilesToMove.forEach(cf => {
                    const cfBase = path.parse(cf).name;
                    if (cfBase === 'index') return; // Too generic to match easily
                    if (line.includes(cfBase)) {
                        const match = /(?:require\(['"`](.*?)['"`]\)|import.*?from\s*['"`](.*?)['"`])/.exec(line);
                        if (match) {
                            const importStr = match[1] || match[2];
                            importMap.push(`${normalizePath(cf).replace(normalizePath(__dirname), '')} | ${normPath.replace(normalizePath(__dirname), '')}:${index + 1} | ${importStr}`);
                        }
                    }
                });
            }
        });
    } catch(e) {}
});

const output = `SNAPSHOT 1 — BACKEND ROUTE MAP
METHOD | FULL PATH | FILE:LINE | CONTROLLER FUNCTION | FUNCTION EXISTS? (Y/N)
-------------------------------------------------------------------------
${backendRoutes.join('\n')}

SNAPSHOT 2 — FRONTEND ROUTE MAP
PATH | COMPONENT NAME | FILE:LINE | COMPONENT FILE EXISTS? (Y/N)
-------------------------------------------------------------------------
${frontendRoutes.join('\n')}

SNAPSHOT 3 — CRITICAL IMPORT MAP
FILE PATH | IMPORTED BY (file:line) | IMPORT STRING USED
-------------------------------------------------------------------------
${importMap.join('\n')}
`;

fs.writeFileSync('snapshots.txt', output);
console.log('Snapshots written to snapshots.txt');
