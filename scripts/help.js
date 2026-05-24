import fs from 'fs';
import path from 'path';

// Read package.json
const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const scripts = pkg.scripts || {};

console.log('\n📖 Available Scripts:\n');

const helpEntries = [];
let maxKeyLength = 0;

// Extract all keys starting with '?' (excluding the '?' command itself)
for (const [key, description] of Object.entries(scripts)) {
  if (key.startsWith('?') && key !== '?') {
    const scriptName = key.slice(1);
    let scriptDesc = description;
    // Strip the 'echo "..."' wrapper if it exists so the menu looks clean
    if (scriptDesc.startsWith('echo "') && scriptDesc.endsWith('"')) {
      scriptDesc = scriptDesc.slice(6, -1);
    }

    helpEntries.push({ scriptName, description: scriptDesc });
    if (scriptName.length > maxKeyLength) {
      maxKeyLength = scriptName.length;
    }
  }
}

// Print the formatted output
for (const entry of helpEntries) {
  const padding = ' '.repeat(maxKeyLength - entry.scriptName.length);
  // Using basic ANSI escape codes for colors
  // \x1b[36m is Cyan, \x1b[0m is Reset
  console.log(
    `  \x1b[36m${entry.scriptName}\x1b[0m${padding}   ${entry.description}`
  );
}

console.log('\nRun a script using: npm run <script-name>\n');
