# Alhos Gourmet

Esta versão roda como PHP, HTML, CSS e JavaScript no XAMPP. Não precisa de
Node.js nem de `npm`.

## Executar no XAMPP

1. Copie a pasta do projeto para `C:\xampp\htdocs\alhosgourmet`.
2. Inicie **Apache** no painel do XAMPP.
3. Abra `http://localhost/alhosgourmet/`.
4. O painel fica em `http://localhost/alhosgourmet/admin.php`.

O SQLite cria/atualiza a tabela de produtos em
`storage/alhosgourmet.sqlite`. As fotos enviadas são salvas em
`uploads/products/`. Faça backup desses dois locais.

## Senha do painel

Na primeira execução local, a senha inicial é `admin123`. Antes de publicar o
site ou permitir acesso externo, copie `config.example.php` para `config.php` e
defina uma senha forte. O arquivo `config.php` não deve ser enviado ao Git.

## Publicação

Esta versão exige hospedagem que execute PHP e ofereça SQLite ou MySQL.
Hospedagem estática e Vercel não executam estes arquivos PHP. Para publicar no
Vercel, será necessário criar uma versão compatível com esse serviço e conectar
um banco e armazenamento de fotos externos.
