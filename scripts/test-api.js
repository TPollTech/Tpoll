// Script de teste para API
const http = require('http');

const tests = [
    { path: '/', method: 'GET', name: 'Homepage' },
    { path: '/api/store/products', method: 'GET', name: 'Store Products' },
    { path: '/api/admin/status', method: 'GET', name: 'Admin Status' },
    { path: '/loja.html', method: 'GET', name: 'Loja Page' },
];

async function runTests() {
    console.log('🧪 Iniciando testes de API...\n');
    
    for (const test of tests) {
        try {
            const result = await new Promise((resolve, reject) => {
                const options = {
                    hostname: '127.0.0.1',
                    port: 5500,
                    path: test.path,
                    method: test.method,
                    timeout: 5000
                };

                const req = http.request(options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        resolve({ 
                            status: res.statusCode, 
                            contentType: res.headers['content-type'],
                            size: data.length
                        });
                    });
                });

                req.on('error', reject);
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Timeout'));
                });

                req.end();
            });

            const status = result.status === 200 ? '✅' : '⚠️';
            console.log(`${status} ${test.name} (${test.path})`);
            console.log(`   Status: ${result.status} | Content: ${result.contentType} | Size: ${result.size} bytes\n`);
        } catch (error) {
            console.log(`❌ ${test.name} (${test.path})`);
            console.log(`   Erro: ${error.message}\n`);
        }
    }
    
    console.log('✅ Testes concluídos!');
}

runTests().catch(console.error);
