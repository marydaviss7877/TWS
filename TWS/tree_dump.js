const fs = require('fs');
const path = require('path');

const ignoreDirs = ['node_modules', '.git', 'build', 'dist', 'uploads', 'logs', '.cursor', 'load-tests', '.github', 'scripts'];

function walk(dir, prefix = '') {
    let results = [];
    let list;
    try {
        list = fs.readdirSync(dir);
    } catch (e) {
        return results;
    }
    
    const filteredList = list.filter(file => {
        try {
            const stat = fs.statSync(path.join(dir, file));
            if (stat.isDirectory() && ignoreDirs.includes(file)) return false;
            return true;
        } catch(e) { return false; }
    });

    filteredList.forEach((file, index) => {
        const isLast = index === filteredList.length - 1;
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        results.push(prefix + (isLast ? '└── ' : '├── ') + file);
        
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath, prefix + (isLast ? '    ' : '│   ')));
        }
    });
    return results;
}

const tree = ['/project-root'].concat(walk(__dirname));
fs.writeFileSync('project_tree.txt', tree.join('\n'));
console.log('Tree written to project_tree.txt');
