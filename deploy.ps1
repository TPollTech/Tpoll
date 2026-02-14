# Script de Deploy Automático para GitHub Pages
# Execute este script após criar o repositório no GitHub

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TPoll Assistência - Deploy GitHub" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Verifica se Git está instalado
$gitInstalled = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitInstalled) {
    Write-Host "❌ Git não encontrado!" -ForegroundColor Red
    Write-Host "`nPor favor, instale o Git:" -ForegroundColor Yellow
    Write-Host "https://git-scm.com/download/win`n" -ForegroundColor Yellow
    
    Write-Host "Ou use o método manual:" -ForegroundColor Cyan
    Write-Host "1. Acesse: https://github.com" -ForegroundColor White
    Write-Host "2. Crie um novo repositório público" -ForegroundColor White
    Write-Host "3. Faça upload dos arquivos da pasta 'site'" -ForegroundColor White
    Write-Host "4. Ative GitHub Pages em Settings → Pages`n" -ForegroundColor White
    
    Read-Host "Pressione Enter para sair"
    exit
}

Write-Host "✅ Git encontrado!`n" -ForegroundColor Green

# Solicita informações
Write-Host "Informe os dados do seu repositório GitHub:`n" -ForegroundColor Yellow

$username = Read-Host "Seu usuário do GitHub"
$repoName = Read-Host "Nome do repositório (ex: tpoll-assistencia)"

Write-Host "`n📝 Configurando repositório...`n" -ForegroundColor Cyan

# Navega para a pasta do site
$sitePath = Split-Path -Parent $PSCommandPath
Set-Location $sitePath

# Inicializa Git se necessário
if (-not (Test-Path ".git")) {
    git init
    Write-Host "✅ Repositório Git inicializado" -ForegroundColor Green
}

# Adiciona todos os arquivos
git add .
Write-Host "✅ Arquivos adicionados" -ForegroundColor Green

# Commit
$commitMessage = Read-Host "`nMensagem do commit (ou Enter para padrão)"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Deploy inicial - TPoll Assistência Técnica"
}

git commit -m $commitMessage
Write-Host "✅ Commit criado" -ForegroundColor Green

# Configura branch
git branch -M main
Write-Host "✅ Branch configurada" -ForegroundColor Green

# Adiciona remote
$repoUrl = "https://github.com/$username/$repoName.git"
git remote remove origin 2>$null
git remote add origin $repoUrl
Write-Host "✅ Remote configurado: $repoUrl" -ForegroundColor Green

# Push
Write-Host "`n🚀 Enviando para GitHub...`n" -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  ✅ DEPLOY CONCLUÍDO!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    
    Write-Host "Próximos passos:`n" -ForegroundColor Yellow
    Write-Host "1. Acesse: https://github.com/$username/$repoName" -ForegroundColor White
    Write-Host "2. Vá em: Settings → Pages" -ForegroundColor White
    Write-Host "3. Em 'Source', selecione: Branch 'main' e pasta '/root'" -ForegroundColor White
    Write-Host "4. Clique em 'Save'" -ForegroundColor White
    Write-Host "5. Aguarde 2-3 minutos`n" -ForegroundColor White
    
    Write-Host "Seu site estará em:" -ForegroundColor Cyan
    Write-Host "https://$username.github.io/$repoName/`n" -ForegroundColor Green -BackgroundColor Black
} else {
    Write-Host "`n❌ Erro no push!" -ForegroundColor Red
    Write-Host "`nVerifique se:" -ForegroundColor Yellow
    Write-Host "- O repositório existe no GitHub" -ForegroundColor White
    Write-Host "- Você tem permissão de escrita" -ForegroundColor White
    Write-Host "- Suas credenciais estão corretas`n" -ForegroundColor White
}

Read-Host "`nPressione Enter para sair"
