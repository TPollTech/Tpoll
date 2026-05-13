// Teste rápido de sintaxe JavaScript
const fs = require('fs');
const path = require('path');

try {
    const scriptPath = path.join(__dirname, 'script.js');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    
    // Verifica por caracteres inválidos comuns
    const issues = [];
    
    // Verifica chaves abertas vs fechadas
    const openBraces = (scriptContent.match(/{/g) || []).length;
    const closeBraces = (scriptContent.match(/}/g) || []).length;
    
    // Verifica parênteses
    const openParens = (scriptContent.match(/\(/g) || []).length;
    const closeParens = (scriptContent.match(/\)/g) || []).length;
    
    console.log('🔍 Verificação de Sintaxe JavaScript\n');
    console.log(`Chaves: ${openBraces} abertas, ${closeBraces} fechadas`);
    if (openBraces !== closeBraces) {
        issues.push(`❌ Desbalanceamento de chaves: ${openBraces} vs ${closeBraces}`);
    } else {
        console.log('✅ Chaves balanceadas');
    }
    
    console.log(`Parênteses: ${openParens} abertos, ${closeParens} fechados`);
    if (openParens !== closeParens) {
        issues.push(`❌ Desbalanceamento de parênteses: ${openParens} vs ${closeParens}`);
    } else {
        console.log('✅ Parênteses balanceados');
    }
    
    // Verifica por console.log não comentados (opcional)
    const consoleLogs = (scriptContent.match(/console\./g) || []).length;
    console.log(`\nCalls de console: ${consoleLogs} encontrados`);
    
    if (issues.length > 0) {
        console.log('\n⚠️ Possíveis erros:');
        issues.forEach(issue => console.log(`   ${issue}`));
    } else {
        console.log('\n✅ Nenhum erro óbvio encontrado!');
    }
    
} catch (error) {
    console.error(`❌ Erro: ${error.message}`);
}
