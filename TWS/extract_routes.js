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

const backendRoutes = [];
const routeRegex = /(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"`](.*?)['"`]/g;
backendFiles.forEach(f => {
    try {
        const content = fs.readFileSync(f, 'utf8');
        let match;
        while ((match = routeRegex.exec(content)) !== null) {
            backendRoutes.push(`${match[1].toUpperCase().padEnd(6)} | ${match[2]} | ${f.replace(__dirname, '')}`);
        }
    } catch(e) {}
});

const frontendRoutes = [];
const feRouteRegex = /<Route[^>]*path=['"`](.*?)['"`][^>]*element=\{?<([A-Za-z0-9_]+)/g;
frontendFiles.forEach(f => {
    try {
        const content = fs.readFileSync(f, 'utf8');
        let match;
        while ((match = feRouteRegex.exec(content)) !== null) {
            frontendRoutes.push(`${match[1]} | ${match[2]} | ${f.replace(__dirname, '')}`);
        }
    } catch(e) {}
});

fs.writeFileSync('route_map.txt', 'BACKEND:\n' + backendRoutes.join('\n') + '\n\nFRONTEND:\n' + frontendRoutes.join('\n'));
console.log('Routes written to route_map.txt');
