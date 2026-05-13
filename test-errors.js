// Teste de verificação de erros JavaScript
const http = require('http');

async function testForErrors() {
    console.log('🔍 Verificando para encontrar erros de JavaScript...\n');
    
    return new Promise((resolve) => {
        const options = {
            hostname: '127.0.0.1',
            port: 5500,
            path: '/index.html',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                // Procura por erros comuns
                const errors = [];
                
                // Procura por sintaxe inválida
                if (data.includes('Uncaught SyntaxError')) {
                    errors.push('❌ SyntaxError encontrado');
                }
                
                // Procura por referências não definidas
                if (data.includes('is not defined')) {
                    errors.push('❌ Referência indefinida');
                }
                
                // Procura por problemas com callbacks
                if (data.includes('Unexpected token')) {
                    errors.push('❌ Token inesperado');
                }
                
                // Verifica se a página carregou
                if (res.statusCode === 200) {
                    console.log('✅ Página index.html carregada com sucesso');
                    
                    // Verifica se há scripts
                    const scriptMatches = data.match(/<script/g);
                    console.log(`   Scripts encontrados: ${scriptMatches ? scriptMatches.length : 0}`);
                    
                    // Verifica o CSS
                    if (data.includes('style.css')) {
                        console.log('   ✅ CSS carregado');
                    }
                    
                    if (errors.length > 0) {
                        console.log('\n⚠️ Possíveis erros:');
                        errors.forEach(e => console.log(`   ${e}`));
                    } else {
                        console.log('   ✅ Nenhum erro óbvio encontrado na HTML');
                    }
                } else {
                    console.log(`❌ Erro ao carregar página: ${res.statusCode}`);
                }
                
                resolve();
            });
        });

        req.on('error', (err) => {
            console.error(`❌ Erro: ${err.message}`);
            resolve();
        });

        req.end();
    });
}

testForErrors().catch(console.error);
