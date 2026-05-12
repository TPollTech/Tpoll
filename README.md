# TPoll Assistência Técnica

Site institucional da TPoll com loja integrada e painel admin seguro via backend.

## Como rodar

1. Instale dependências:
   - `npm install`
2. (Opcional) Configure variáveis:
   - Copie `.env.example` para `.env`
   - Ajuste `TPOLL_ADMIN_PASSWORD` e `TPOLL_TOKEN_SECRET`
3. Inicie o servidor:
   - `npm start`
4. Acesse:
   - `http://127.0.0.1:5500`

## Segurança da Loja (Admin)

- O catálogo público usa endpoint `GET /api/store/products`.
- O admin usa autenticação por cookie `HttpOnly` e assinatura HMAC.
- Rotas de admin (`/api/admin/*`) só funcionam para acesso local (localhost/127.0.0.1).
- Fora do PC local, o botão de admin não aparece na `loja.html` e o backend bloqueia tentativas forçadas.

## Estrutura principal

- `index.html` - Página principal
- `loja.html` - Página da loja
- `style.css` / `loja.css` - Estilos
- `script.js` - Interações da home
- `loja.js` - Frontend da loja consumindo API
- `server/app.js` - Backend seguro da loja
- `server/store-data.json` - Base de produtos (criada automaticamente)

## Observação de deploy

Para produção, publique em ambiente Node (não apenas hosting estático), pois o admin seguro depende do backend.
