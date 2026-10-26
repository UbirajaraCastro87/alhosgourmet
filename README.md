# Alhos Gourmet

## Rodar localmente

Requer Node.js 22 ou superior.

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. O banco SQLite é criado automaticamente em
`storage/alhosgourmet.sqlite`; os sabores e as fotos ficam salvos nesse arquivo
no computador que executa o servidor. Faça cópias de segurança desse arquivo
com o servidor parado.

No modo de desenvolvimento, a senha inicial do painel `/admin` é `admin123`.
Para usar o modo de produção local, defina uma senha própria na variável de
ambiente `ADMIN_PASSWORD` antes de iniciar o servidor.

## Hospedagem

Em desenvolvimento local, o app usa SQLite em `storage/alhosgourmet.sqlite`.
No Vercel, conecte serviços persistentes para salvar as alterações:

1. No projeto Vercel, abra **Storage → Create Database** e conecte um banco
   PostgreSQL pelo Marketplace (por exemplo, Neon). Confirme que o projeto recebe
   a variável `POSTGRES_URL` ou `DATABASE_URL`.
2. Em **Storage → Create Storage**, crie um **Vercel Blob** público para as fotos.
   A integração deve adicionar `BLOB_READ_WRITE_TOKEN` ao ambiente Production.
3. Em **Settings → Environment Variables**, configure `ADMIN_PASSWORD` com uma
   senha forte.
4. Faça um novo deploy depois de conectar os serviços. As tabelas são criadas
   automaticamente no primeiro acesso.

Depois do deploy, abra `https://<seu-dominio-vercel>/admin`. O site usa
PostgreSQL para os sabores e Blob para as fotos; o SQLite do repositório não é
usado para persistência no Vercel. Consulte os limites e preços atuais dos
serviços escolhidos antes de publicar.
