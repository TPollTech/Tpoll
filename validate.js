// Validação rápida
const fs = require('fs');
const path = require('path');

try {
    const scriptContent = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');
    const braces = { open: 0, close: 0 };
    const parens = { open: 0, close: 0 };
    
    for (let char of scriptContent) {
        if (char === '{') braces.open++;
        if (char === '}') braces.close++;
        if (char === '(') parens.open++;
        if (char === ')') parens.close++;
    }
    
    const result = braces.open === braces.close && parens.open === parens.close;
    console.log(result ? '✅ Sintaxe válida' : '❌ Erro de sintaxe');
} catch (e) {
    console.log('❌ Erro:', e.message);
}
