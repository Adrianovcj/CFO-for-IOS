# CFO Pessoal — PWA

Controle financeiro pessoal com IA. Instala no iPhone como app nativo.

## Deploy rápido (Vercel — grátis)

### 1. Subir para GitHub
```bash
cd cfo-pwa
git init
git add .
git commit -m "CFO Pessoal PWA"
# Crie um repo no GitHub e siga as instruções para push
```

### 2. Deploy no Vercel
1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Clique "Add New Project" → importe o repositório
3. Framework: **Vite** (detecta automaticamente)
4. Clique "Deploy"

### 3. (Opcional) Ativar a IA
No Vercel, vá em Settings → Environment Variables e adicione:
```
VITE_ANTHROPIC_API_KEY = sk-ant-...
```
Depois faça redeploy.

> ⚠️ A API key ficará exposta no frontend. Para uso pessoal, tudo bem.
> Para produção, crie um backend/serverless function.

### 4. Instalar no iPhone
1. Abra o URL do Vercel no **Safari** do iPhone
2. Toque no ícone de **compartilhar** (quadrado com seta)
3. Toque em **"Adicionar à Tela de Início"**
4. Pronto — abre em tela cheia como app nativo

## Desenvolvimento local
```bash
npm install
npm run dev
```

## Estrutura
```
├── index.html          # HTML com meta tags iOS
├── vite.config.js      # Vite + PWA plugin config
├── public/
│   ├── logo192.png     # Ícone PWA
│   ├── logo512.png     # Ícone PWA grande
│   └── favicon.ico
└── src/
    ├── main.jsx
    └── App.jsx         # App completo
```
