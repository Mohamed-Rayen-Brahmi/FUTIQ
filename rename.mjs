import fs from 'fs';
import path from 'path';

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  content = content.replace(/Footdle/g, 'Golazio');
  content = content.replace(/footdle/g, 'golazio');
  content = content.replace(/FOOTDLE/g, 'GOLAZIO');

  content = content.replace(/FutIQ/g, 'Golazio');
  content = content.replace(/futiq/g, 'golazio');
  content = content.replace(/FUTIQ/g, 'GOLAZIO');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function traverseDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverseDir(fullPath);
    } else if (stat.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.html') || fullPath.endsWith('.json') || fullPath.endsWith('.md'))) {
      replaceInFile(fullPath);
    }
  }
}

traverseDir('./src');
replaceInFile('./index.html');
replaceInFile('./package.json');
