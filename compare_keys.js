
const fs = require('fs');
const content = fs.readFileSync('/src/levels/Level6.tsx', 'utf8');

const enMatch = content.match(/en: \{([\s\S]*?)\},/);
const zhMatch = content.match(/zh: \{([\s\S]*?)\}/);

if (enMatch && zhMatch) {
  const enKeys = enMatch[1].split('\n').map(l => l.trim().split(':')[0]).filter(k => k);
  const zhKeys = zhMatch[1].split('\n').map(l => l.trim().split(':')[0]).filter(k => k);
  
  console.log('EN Keys:', enKeys);
  console.log('ZH Keys:', zhKeys);
  
  const inEnOnly = enKeys.filter(k => !zhKeys.includes(k));
  const inZhOnly = zhKeys.filter(k => !enKeys.includes(k));
  
  console.log('In EN only:', inEnOnly);
  console.log('In ZH only:', inZhOnly);
} else {
  console.log('Failed to match en or zh blocks');
}
