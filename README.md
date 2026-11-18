# Alhos Gourmet

Esta versão roda como PHP, HTML, CSS e JavaScript no XAMPP. Não precisa de
Node.js nem de `npm`.

## Executar no XAMPP

1. Copie a pasta do projeto para `C:\xampp\htdocs\alhosgourmet`.
2. Inicie **Apache** no painel do XAMPP.
3. Abra `http://localhost/alhosgourmet/`.
4. O painel fica em `http://localhost/alhosgourmet/admin.php`.

O SQLite armazena os produtos em `storage/alhosgourmet.sqlite` e o controle de
pedidos em `storage/customer-orders.sqlite`. As fotos enviadas são salvas em
`uploads/products/`. Faça backup dos dois bancos e das fotos.

## Pedidos e pagamento

O checkout permite escolher Pix ou dinheiro na entrega. Para Pix, o QR Code e
o código copia e cola são gerados com a chave `emdsdc@gmail.com` e o total do
pedido. A imagem do QR Code é carregada pelo serviço QRServer, então o navegador
precisa de acesso à internet; o código copia e cola continua disponível se a
imagem não carregar. O nome do recebedor é “Alhos Gourmet da May” e a cidade
usada no QR Code é “Rio de Janeiro”.

Quando um pedido é encaminhado ao WhatsApp, o sistema registra no banco local
separado o telefone, a quantidade de encaminhamentos e os dados do último pedido
(data, produtos e total). A lista fica no painel administrativo. O WhatsApp não
informa ao site se a mensagem foi enviada; portanto, o contador representa
pedidos encaminhados, não pedidos confirmados.

O Instagram da loja está no rodapé: https://www.instagram.com/alhosgourmetrj/.

## Senha do painel

Na primeira execução local, a senha inicial é `admin123`. Antes de publicar o
site ou permitir acesso externo, copie `config.example.php` para `config.php` e
defina uma senha forte. O arquivo `config.php` não deve ser enviado ao Git.

## Publicação

Esta versão exige hospedagem que execute PHP e ofereça SQLite ou MySQL.
Hospedagem estática e Vercel não executam estes arquivos PHP. Para publicar no
Vercel, será necessário criar uma versão compatível com esse serviço e conectar
um banco e armazenamento de fotos externos.
