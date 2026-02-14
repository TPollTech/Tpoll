# 🚀 Deploy do Site - TPoll Assistência Técnica

## Opção 1: GitHub Pages (RECOMENDADO - 100% Grátis)

### Passo a Passo:

1. **Crie uma conta no GitHub**
   - Acesse: https://github.com
   - Clique em "Sign up" e crie sua conta gratuita

2. **Crie um novo repositório**
   - Clique no botão "+" no canto superior direito
   - Selecione "New repository"
   - Nome: `tpoll-assistencia` (ou o nome que preferir)
   - ✅ Marque como **PUBLIC**
   - Não inicialize com README
   - Clique em "Create repository"

3. **Faça upload dos arquivos**
   - Na página do repositório criado, clique em "uploading an existing file"
   - Arraste TODOS os arquivos da pasta `site/`:
     - index.html
     - style.css
     - script.js
     - .nojekyll
     - README.md
   - Escreva uma mensagem: "Initial commit"
   - Clique em "Commit changes"

4. **Ative o GitHub Pages**
   - Vá em **Settings** (Configurações) do repositório
   - No menu lateral, clique em **Pages**
   - Em "Source", selecione: **Deploy from a branch**
   - Em "Branch", selecione: **main** e pasta **/root**
   - Clique em **Save**

5. **Aguarde 2-3 minutos**
   - O GitHub vai processar e publicar seu site
   - Uma mensagem verde aparecerá com o link do seu site
   - URL: `https://seu-usuario.github.io/tpoll-assistencia/`

### ✅ Pronto! Seu site está no ar e acessível globalmente!

---

## Opção 2: GitHub CLI (Para Desenvolvedores)

Se você tem Git instalado, pode fazer via linha de comando:

```powershell
# Na pasta do site
cd "c:\Program Files (x86)\Tpoll sistema\site"

# Inicializa o repositório
git init
git add .
git commit -m "Initial commit - TPoll Assistência Técnica"

# Conecta com GitHub (substitua SEU-USUARIO e NOME-REPO)
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/NOME-REPO.git
git push -u origin main
```

Depois siga o passo 4 acima para ativar o GitHub Pages.

---

## Opção 3: Netlify (Alternativa Rápida)

1. Acesse: https://www.netlify.com
2. Clique em "Add new site" → "Deploy manually"
3. Arraste a pasta `site` inteira
4. Pronto! URL: `https://nome-aleatorio.netlify.app`
5. Você pode personalizar o nome em: Site settings → Domain management

---

## Opção 4: Vercel (Alternativa Moderna)

1. Acesse: https://vercel.com
2. Clique em "Add New" → "Project"
3. Importe do GitHub ou faça upload da pasta
4. Deploy automático
5. URL: `https://tpoll-assistencia.vercel.app`

---

## 📱 Configurar Domínio Personalizado (Opcional)

Se você comprar um domínio (ex: www.tpollassistencia.com.br):

### No GitHub Pages:
1. Vá em Settings → Pages
2. Em "Custom domain", digite seu domínio
3. Configure os DNS do seu domínio:
   - Tipo A: `185.199.108.153`
   - Tipo A: `185.199.109.153`
   - Tipo A: `185.199.110.153`
   - Tipo A: `185.199.111.153`

### No Netlify/Vercel:
- Siga as instruções na plataforma (é bem simples!)

---

## 🔄 Atualizar o Site

### GitHub:
1. Altere os arquivos localmente
2. No GitHub, clique em "Upload files"
3. Arraste os arquivos atualizados
4. Commit changes
5. Aguarde 1-2 minutos para atualizar

### Netlify/Vercel:
- Apenas arraste os novos arquivos novamente

---

## ✨ Checklist Final

- [ ] Site publicado e acessível
- [ ] Testar em celular
- [ ] Testar link do WhatsApp
- [ ] Testar link do e-mail
- [ ] Compartilhar URL com clientes
- [ ] Adicionar URL no cartão de visitas
- [ ] Adicionar URL nas redes sociais

---

## 🆘 Problemas Comuns

**Site não aparece após 5 minutos:**
- Verifique se o repositório está PUBLIC
- Verifique se o arquivo se chama `index.html` (não Index.html)
- Limpe o cache do navegador (Ctrl+Shift+R)

**Página em branco:**
- Verifique se fez upload de TODOS os arquivos (HTML, CSS, JS)
- Verifique o console do navegador (F12) para erros

**WhatsApp não abre:**
- Teste o link diretamente: coloque a URL completa no navegador
- Verifique se o número está correto: 5555996765404

---

## 📞 Seu Site Estará Online Em:

**GitHub Pages:** `https://seu-usuario.github.io/nome-repositorio/`

**Qualquer pessoa no mundo poderá acessar!** 🌍

---

**Dúvidas?** Consulte a documentação oficial:
- GitHub Pages: https://pages.github.com
- Netlify: https://docs.netlify.com
- Vercel: https://vercel.com/docs
