const fs = require('fs');
const path = require('path');

// Configuration
const FRONTEND_DIR = path.join(__dirname, 'TWS', 'frontend', 'src');
const BACKEND_DIR = path.join(__dirname, 'TWS', 'backend', 'src');
const OUTPUT_DIR = __dirname;

// Store file information
const fileIndex = new Map();
const dependencies = new Map();
const fileCategories = {
  frontend: {
    pages: [],
    components: [],
    services: [],
    utils: [],
    layouts: [],
    providers: [],
    hooks: [],
    config: []
  },
  backend: {
    routes: [],
    controllers: [],
    models: [],
    services: [],
    middleware: [],
    utils: [],
    config: [],
    modules: []
  }
};

// Helper to normalize file paths
function normalizePath(filePath, baseDir) {
  const relative = path.relative(baseDir, filePath);
  return relative.replace(/\\/g, '/');
}

// Extract imports from a file
function extractImports(filePath, content) {
  const imports = [];
  const baseDir = filePath.includes('frontend') ? FRONTEND_DIR : BACKEND_DIR;
  
  // Match ES6 imports: import ... from '...'
  const es6ImportRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))?|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g;
  // Match require: require('...')
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  
  let match;
  
  // Extract ES6 imports
  while ((match = es6ImportRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      // External dependency, skip
      continue;
    }
    imports.push(importPath);
  }
  
  // Extract require statements
  while ((match = requireRegex.exec(content)) !== null) {
    const requirePath = match[1];
    if (!requirePath.startsWith('.') && !requirePath.startsWith('/')) {
      // External dependency, skip
      continue;
    }
    imports.push(requirePath);
  }
  
  return imports;
}

// Resolve import path to actual file
function resolveImportPath(importPath, fromFile, baseDir) {
  if (importPath.startsWith('@/')) {
    // Alias path
    const aliasPath = importPath.replace('@/', '');
    return path.join(baseDir, aliasPath);
  }
  
  const fromDir = path.dirname(fromFile);
  let resolved = path.resolve(fromDir, importPath);
  
  // Try different extensions
  const extensions = ['.js', '.jsx', '.json', ''];
  for (const ext of extensions) {
    const withExt = resolved + ext;
    if (fs.existsSync(withExt)) {
      return withExt;
    }
    // Try with /index.js
    const indexPath = path.join(resolved, 'index' + ext);
    if (fs.existsSync(indexPath)) {
      return indexPath;
    }
  }
  
  return null;
}

// Categorize file
function categorizeFile(filePath, relativePath) {
  if (filePath.includes('frontend')) {
    if (relativePath.includes('pages')) return 'pages';
    if (relativePath.includes('components')) return 'components';
    if (relativePath.includes('services')) return 'services';
    if (relativePath.includes('utils')) return 'utils';
    if (relativePath.includes('layouts')) return 'layouts';
    if (relativePath.includes('providers')) return 'providers';
    if (relativePath.includes('hooks')) return 'hooks';
    if (relativePath.includes('config')) return 'config';
  } else if (filePath.includes('backend')) {
    if (relativePath.includes('routes')) return 'routes';
    if (relativePath.includes('controllers')) return 'controllers';
    if (relativePath.includes('models')) return 'models';
    if (relativePath.includes('services')) return 'services';
    if (relativePath.includes('middleware')) return 'middleware';
    if (relativePath.includes('utils')) return 'utils';
    if (relativePath.includes('config')) return 'config';
    if (relativePath.includes('modules')) return 'modules';
  }
  return 'other';
}

// Scan directory recursively
function scanDirectory(dir, baseDir, type) {
  const files = [];
  
  function scan(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        // Skip node_modules, .git, build, dist, etc.
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' || 
            entry.name === 'build' || 
            entry.name === 'dist' ||
            entry.name === 'coverage') {
          continue;
        }
        
        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
          files.push(fullPath);
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }
  
  scan(dir);
  return files;
}

// Main analysis function
function analyzeProject() {
  console.log('Starting project analysis...');
  
  // Scan frontend files
  console.log('Scanning frontend files...');
  const frontendFiles = scanDirectory(FRONTEND_DIR, FRONTEND_DIR, 'frontend');
  console.log(`Found ${frontendFiles.length} frontend files`);
  
  // Scan backend files
  console.log('Scanning backend files...');
  const backendFiles = scanDirectory(BACKEND_DIR, BACKEND_DIR, 'backend');
  console.log(`Found ${backendFiles.length} backend files`);
  
  const allFiles = [...frontendFiles, ...backendFiles];
  
  // Index all files
  console.log('Indexing files...');
  for (const file of allFiles) {
    const baseDir = file.includes('frontend') ? FRONTEND_DIR : BACKEND_DIR;
    const relativePath = normalizePath(file, baseDir);
    const category = categorizeFile(file, relativePath);
    
    fileIndex.set(file, {
      path: file,
      relativePath,
      category,
      type: file.includes('frontend') ? 'frontend' : 'backend'
    });
    
    // Add to category list
    if (file.includes('frontend') && fileCategories.frontend[category]) {
      fileCategories.frontend[category].push(relativePath);
    } else if (file.includes('backend') && fileCategories.backend[category]) {
      fileCategories.backend[category].push(relativePath);
    }
  }
  
  // Extract dependencies
  console.log('Extracting dependencies...');
  let processed = 0;
  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const fileInfo = fileIndex.get(file);
      const baseDir = file.includes('frontend') ? FRONTEND_DIR : BACKEND_DIR;
      
      const imports = extractImports(file, content);
      const resolvedDeps = [];
      
      for (const imp of imports) {
        const resolved = resolveImportPath(imp, file, baseDir);
        if (resolved && fileIndex.has(resolved)) {
          resolvedDeps.push(resolved);
        }
      }
      
      if (resolvedDeps.length > 0) {
        dependencies.set(file, resolvedDeps);
      }
      
      processed++;
      if (processed % 50 === 0) {
        console.log(`Processed ${processed}/${allFiles.length} files...`);
      }
    } catch (err) {
      // Skip files we can't read
    }
  }
  
  console.log(`Indexed ${fileIndex.size} files`);
  console.log(`Found ${dependencies.size} files with dependencies`);
  
  // Generate reports
  generateReports();
}

// Generate Mermaid diagram
function generateMermaidDiagram() {
  let mermaid = `graph TB
    subgraph Frontend["Frontend"]
        direction TB
`;
  
  // Frontend subgraphs by category
  const frontendCategories = ['pages', 'components', 'services', 'utils', 'layouts', 'providers', 'hooks', 'config'];
  for (const category of frontendCategories) {
    const files = fileCategories.frontend[category] || [];
    if (files.length > 0) {
      mermaid += `        subgraph FE_${category}["${category.charAt(0).toUpperCase() + category.slice(1)}"]
`;
      for (const file of files.slice(0, 20)) { // Limit to 20 per category for readability
        const nodeId = `FE_${category}_${file.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const fileName = path.basename(file, path.extname(file));
        mermaid += `            ${nodeId}["${fileName}"]
`;
      }
      mermaid += `        end
`;
    }
  }
  
  mermaid += `    end
    
    subgraph Backend["Backend"]
        direction TB
`;
  
  // Backend subgraphs by category
  const backendCategories = ['routes', 'controllers', 'models', 'services', 'middleware', 'utils', 'config', 'modules'];
  for (const category of backendCategories) {
    const files = fileCategories.backend[category] || [];
    if (files.length > 0) {
      mermaid += `        subgraph BE_${category}["${category.charAt(0).toUpperCase() + category.slice(1)}"]
`;
      for (const file of files.slice(0, 20)) { // Limit to 20 per category
        const nodeId = `BE_${category}_${file.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const fileName = path.basename(file, path.extname(file));
        mermaid += `            ${nodeId}["${fileName}"]
`;
      }
      mermaid += `        end
`;
    }
  }
  
  mermaid += `    end
    
    %% Key Relationships
    Frontend -->|API Calls| Backend
`;
  
  // Add some key dependency relationships
  let relationshipCount = 0;
  const maxRelationships = 100; // Limit for readability
  
  for (const [sourceFile, deps] of dependencies.entries()) {
    if (relationshipCount >= maxRelationships) break;
    
    const sourceInfo = fileIndex.get(sourceFile);
    if (!sourceInfo) continue;
    
    for (const depFile of deps) {
      if (relationshipCount >= maxRelationships) break;
      
      const depInfo = fileIndex.get(depFile);
      if (!depInfo) continue;
      
      // Only show cross-category or important relationships
      if (sourceInfo.category !== depInfo.category || 
          sourceInfo.type !== depInfo.type ||
          sourceInfo.category === 'services' ||
          sourceInfo.category === 'utils') {
        
        const sourceNodeId = `${sourceInfo.type === 'frontend' ? 'FE' : 'BE'}_${sourceInfo.category}_${sourceInfo.relativePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const depNodeId = `${depInfo.type === 'frontend' ? 'FE' : 'BE'}_${depInfo.category}_${depInfo.relativePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        // Only add if nodes exist in diagram
        if (sourceInfo.relativePath.length < 100 && depInfo.relativePath.length < 100) {
          mermaid += `    ${sourceNodeId} -.->|uses| ${depNodeId}
`;
          relationshipCount++;
        }
      }
    }
  }
  
  mermaid += `
    style Frontend fill:#e1f5ff
    style Backend fill:#fff4e1
`;
  
  return mermaid;
}

// Generate detailed JSON report
function generateJSONReport() {
  const report = {
    summary: {
      generatedAt: new Date().toISOString(),
      totalFiles: fileIndex.size,
      frontendFiles: Array.from(fileIndex.values()).filter(f => f.type === 'frontend').length,
      backendFiles: Array.from(fileIndex.values()).filter(f => f.type === 'backend').length,
      totalDependencies: Array.from(dependencies.values()).reduce((sum, deps) => sum + deps.length, 0)
    },
    categories: fileCategories,
    files: Array.from(fileIndex.values()).map(f => ({
      path: f.relativePath,
      category: f.category,
      type: f.type,
      dependencies: (dependencies.get(f.path) || []).map(dep => {
        const depInfo = fileIndex.get(dep);
        return depInfo ? depInfo.relativePath : null;
      }).filter(Boolean)
    }))
  };
  
  return JSON.stringify(report, null, 2);
}

// Generate reports
function generateReports() {
  console.log('Generating reports...');
  
  // Generate Mermaid diagram
  const mermaidDiagram = generateMermaidDiagram();
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'PROJECT_STRUCTURE_DIAGRAM.md'),
    `# TWS Project Structure Flow Diagram

This diagram shows the structure and relationships between frontend and backend files.

## Mermaid Diagram

\`\`\`mermaid
${mermaidDiagram}
\`\`\`

## How to View

1. Copy the mermaid code above
2. Paste it into [Mermaid Live Editor](https://mermaid.live)
3. Or use a Markdown viewer that supports Mermaid (like GitHub, GitLab, or VS Code with Mermaid extension)

## File Categories

### Frontend
- **Pages**: Main page components
- **Components**: Reusable UI components
- **Services**: API service layers
- **Utils**: Utility functions
- **Layouts**: Layout components
- **Providers**: Context providers
- **Hooks**: Custom React hooks
- **Config**: Configuration files

### Backend
- **Routes**: API route definitions
- **Controllers**: Request handlers
- **Models**: Database models
- **Services**: Business logic services
- **Middleware**: Express middleware
- **Utils**: Utility functions
- **Config**: Configuration files
- **Modules**: Feature modules

## Notes

- The diagram shows key relationships between files
- Due to the large number of files, only representative samples are shown
- Solid arrows indicate direct dependencies
- Dotted arrows indicate usage relationships
`
  );
  
  // Generate JSON report
  const jsonReport = generateJSONReport();
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'PROJECT_STRUCTURE_INDEX.json'),
    jsonReport
  );
  
  // Generate detailed text report
  let textReport = `# TWS Project Structure Index

Generated: ${new Date().toISOString()}

## Summary
- Total Files: ${fileIndex.size}
- Frontend Files: ${Array.from(fileIndex.values()).filter(f => f.type === 'frontend').length}
- Backend Files: ${Array.from(fileIndex.values()).filter(f => f.type === 'backend').length}
- Files with Dependencies: ${dependencies.size}
- Total Dependencies: ${Array.from(dependencies.values()).reduce((sum, deps) => sum + deps.length, 0)}

## Frontend Structure

`;
  
  for (const [category, files] of Object.entries(fileCategories.frontend)) {
    if (files.length > 0) {
      textReport += `### ${category.charAt(0).toUpperCase() + category.slice(1)} (${files.length} files)\n\n`;
      for (const file of files.slice(0, 30)) {
        textReport += `- ${file}\n`;
      }
      if (files.length > 30) {
        textReport += `- ... and ${files.length - 30} more files\n`;
      }
      textReport += '\n';
    }
  }
  
  textReport += `## Backend Structure

`;
  
  for (const [category, files] of Object.entries(fileCategories.backend)) {
    if (files.length > 0) {
      textReport += `### ${category.charAt(0).toUpperCase() + category.slice(1)} (${files.length} files)\n\n`;
      for (const file of files.slice(0, 30)) {
        textReport += `- ${file}\n`;
      }
      if (files.length > 30) {
        textReport += `- ... and ${files.length - 30} more files\n`;
      }
      textReport += '\n';
    }
  }
  
  textReport += `## Key Dependencies

`;
  
  // Show top files by number of dependencies
  const filesByDeps = Array.from(dependencies.entries())
    .map(([file, deps]) => ({
      file: fileIndex.get(file)?.relativePath || file,
      count: deps.length,
      deps: deps.map(d => fileIndex.get(d)?.relativePath || d)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);
  
  for (const item of filesByDeps) {
    textReport += `### ${item.file} (${item.count} dependencies)\n`;
    for (const dep of item.deps.slice(0, 10)) {
      textReport += `  - ${dep}\n`;
    }
    if (item.deps.length > 10) {
      textReport += `  - ... and ${item.deps.length - 10} more\n`;
    }
    textReport += '\n';
  }
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'PROJECT_STRUCTURE_INDEX.md'),
    textReport
  );
  
  console.log('\nReports generated:');
  console.log('  - PROJECT_STRUCTURE_DIAGRAM.md (Mermaid flow diagram)');
  console.log('  - PROJECT_STRUCTURE_INDEX.md (Detailed text index)');
  console.log('  - PROJECT_STRUCTURE_INDEX.json (Machine-readable JSON)');
}

// Run analysis
if (require.main === module) {
  analyzeProject();
}

module.exports = { analyzeProject };
