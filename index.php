<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';

$checkoutOrderTokens = $_SESSION['checkout_order_tokens'] ?? [];
if (!is_array($checkoutOrderTokens)) {
    $checkoutOrderTokens = [];
}
$tokenCreatedAt = time();
foreach ($checkoutOrderTokens as $token => $createdAt) {
    if (!is_int($createdAt) || $createdAt < $tokenCreatedAt - 7200) {
        unset($checkoutOrderTokens[$token]);
    }
}
$checkoutOrderToken = bin2hex(random_bytes(32));
$checkoutOrderTokens[$checkoutOrderToken] = $tokenCreatedAt;
$_SESSION['checkout_order_tokens'] = $checkoutOrderTokens;

try {
    $products = all_products();
} catch (Throwable $error) {
    error_log('Alhos Gourmet storefront error: ' . $error->getMessage());
    http_response_code(500);
    $products = [];
    $pageError = 'Não foi possível carregar os sabores. Confira o banco de dados e tente novamente.';
}

function html_escape(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

$basePath = app_base_path();
$galleryImages = glob(__DIR__ . '/uploads/img/*.{jpg,jpeg,png,gif,webp,avif,bmp}', GLOB_BRACE) ?: [];
sort($galleryImages, SORT_NATURAL | SORT_FLAG_CASE);
?>
<!doctype html>
<html lang="pt-BR">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f8f6f2">
    <meta name="description" content="Temperos artesanais de alho selecionado, azeites finos e ervas frescas.">
    <title>Alhos Gourmet | Tempero que abraça o sabor</title>
    <link rel="stylesheet" href="<?= html_escape($basePath) ?>/assets/style.css?v=<?= filemtime(__DIR__ . '/assets/style.css') ?>">
    <script>
        window.APP_BASE_PATH = <?= json_encode($basePath, JSON_UNESCAPED_SLASHES) ?>;
        window.PIX_CONFIG = {
            key: 'emdsdc@gmail.com',
            merchantName: 'ALHOS GOURMET DA MAY',
            merchantCity: 'RIO DE JANEIRO',
        };
        window.CHECKOUT_ORDER_TOKEN = <?= json_encode($checkoutOrderToken) ?>;
    </script>
    <script src="<?= html_escape($basePath) ?>/assets/store.js?v=<?= filemtime(__DIR__ . '/assets/store.js') ?>" defer></script>
    <script src="<?= html_escape($basePath) ?>/assets/gallery.js" defer></script>
</head>

<body>
    <header class="site-header">
        <div class="header-inner container">
            <a class="brand" href="<?= html_escape($basePath) ?>/">
                <img class="brand-logo" src="<?= html_escape($basePath) ?>/uploads/img/logo/logo_site.jpeg" alt="Alhos Gourmet - praticidade que abraça o sabor" width="230" height="74">
            </a>
            <nav class="header-actions" aria-label="Ações principais">
                <a class="admin-link" href="<?= html_escape($basePath) ?>/admin.php">Painel Admin</a>
                <button class="button button-brown cart-open" id="cart-open" type="button">
                    <span>🛒 Pedido</span>
                    <span class="cart-count" id="cart-count" hidden>0</span>
                </button>
            </nav>
        </div>
    </header>

    <main>
        <section class="hero">
            <div class="hero-inner container">
                <div class="hero-copy">
                    <span class="eyebrow">🌿 Feito com paixão culinária</span>
                    <h1>ALHOS GOURMET</h1>
                    <p class="hero-tagline">“Tempero que abraça o sabor.”</p>
                    <p class="hero-description">Nossos temperos artesanais combinam alhos nobres selecionados, azeites finos e ervas frescas.</p>
                    <a class="button button-gold hero-button" href="#produtos">Ver Sabores</a>
                </div>
                <?php if ($galleryImages !== []): ?>
                    <div class="hero-photo gallery-carousel" data-gallery role="group" aria-roledescription="carrossel" aria-label="Galeria de imagens">
                        <div class="gallery-viewport" aria-live="off">
                            <?php foreach ($galleryImages as $index => $imagePath): ?>
                                <?php
                                $imageName = pathinfo($imagePath, PATHINFO_FILENAME);
                                $imageLabel = str_replace(['_', '-'], ' ', $imageName);
                                $imageUrl = html_escape($basePath . '/uploads/img/' . rawurlencode(basename($imagePath)));
                                ?>
                                <figure class="gallery-slide" role="group" aria-roledescription="slide" aria-label="<?= $index + 1 ?> de <?= count($galleryImages) ?>: <?= html_escape($imageLabel) ?>" <?= $index === 0 ? '' : 'hidden' ?>>
                                    <a class="gallery-image-link" href="<?= $imageUrl ?>" target="_blank" rel="noopener noreferrer" aria-label="Abrir imagem: <?= html_escape($imageLabel) ?>">
                                        <img src="<?= $imageUrl ?>" alt="<?= html_escape($imageLabel) ?>" loading="<?= $index === 0 ? 'eager' : 'lazy' ?>" decoding="async">
                                    </a>
                                </figure>
                            <?php endforeach; ?>
                        </div>
                        <div class="gallery-controls" role="group" aria-label="Controles da galeria">
                            <button class="gallery-arrow" type="button" data-gallery-previous aria-label="Imagem anterior">‹</button>
                            <div class="gallery-indicators" role="group" aria-label="Selecionar imagem">
                                <?php foreach ($galleryImages as $index => $imagePath): ?>
                                    <button class="gallery-indicator" type="button" data-gallery-go="<?= $index ?>" aria-label="Mostrar imagem <?= $index + 1 ?>" <?= $index === 0 ? 'aria-current="true"' : '' ?>></button>
                                <?php endforeach; ?>
                            </div>
                            <button class="gallery-arrow" type="button" data-gallery-next aria-label="Próxima imagem">›</button>
                            <button class="gallery-toggle" type="button" data-gallery-toggle aria-label="Pausar apresentação">Pausar</button>
                        </div>
                    </div>
                <?php else: ?>
                    <div class="hero-photo">
                        <img src="https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&amp;fit=crop&amp;q=80&amp;w=900" alt="Alhos e ingredientes frescos">
                    </div>
                <?php endif; ?>
            </div>
        </section>

        <section class="products-section container" id="produtos">
            <div class="section-heading">
                <h2>Nossos Sabores</h2>
                <span></span>
            </div>
            <div class="catalog-controls">
                <label class="search-field">
                    <span class="visually-hidden">Buscar sabor</span>
                    <input id="product-search" type="search" placeholder="Buscar sabor...">
                </label>
                <div class="filter-buttons" role="group" aria-label="Filtrar por preço">
                    <button class="filter-button active" type="button" data-price-filter="todos">Todos</button>
                    <button class="filter-button" type="button" data-price-filter="ate25">Até R$ 10</button>
                    <button class="filter-button" type="button" data-price-filter="acima25">Acima de R$ 15</button>
                </div>
            </div>
            <?php if (isset($pageError)): ?>
                <p class="notice notice-error" role="alert"><?= html_escape($pageError) ?></p>
            <?php else: ?>
                <div class="product-grid" id="product-grid" aria-live="polite">
                    <?php foreach ($products as $product): ?>
                        <article class="product-card" data-product-id="<?= html_escape((string) $product['id']) ?>" data-price="<?= html_escape((string) $product['preco']) ?>" data-name="<?= html_escape(mb_strtolower((string) $product['nome'])) ?>">
                            <div class="product-image">
                                <img src="<?= html_escape((string) $product['imagem']) ?>" alt="<?= html_escape((string) $product['nome']) ?>" loading="lazy">
                                <span class="price-tag">R$ <?= number_format((float) $product['preco'], 2, ',', '.') ?></span>
                            </div>
                            <div class="product-info">
                                <div>
                                    <h3><?= html_escape((string) $product['nome']) ?></h3>
                                    <p><?= html_escape((string) $product['descricao']) ?></p>
                                </div>
                                <div class="product-actions">
                                    <div class="quantity-control" aria-label="Quantidade">
                                        <button type="button" data-quantity-change="-1" aria-label="Diminuir quantidade">−</button>
                                        <span data-quantity>1</span>
                                        <button type="button" data-quantity-change="1" aria-label="Aumentar quantidade">+</button>
                                    </div>
                                    <button class="button button-gold add-to-cart" type="button"
                                        data-product='<?= html_escape(json_encode($product, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) ?>'>
                                        Adicionar ao Pedido
                                    </button>
                                </div>
                            </div>
                        </article>
                    <?php endforeach; ?>
                </div>
                <p class="empty-results" id="empty-results" hidden>Nenhum sabor encontrado.</p>
            <?php endif; ?>
        </section>
    </main>

    <footer class="site-footer">
        <div class="footer-inner container">
            <div>
                <h2>Alhos Gourmet da May</h2>
                <p class="footer-tagline">“Tempero que abraça o sabor.”</p>
            </div>
            <div class="footer-contact">
                <p><strong>🚚 Entrega grátis:</strong> em até 5 km</p>
                <p><strong>WhatsApp:</strong> (21) 98883-2361</p>
                <p><strong>PIX:</strong> emdsdc@gmail.com</p>
                <p><strong>Instagram:</strong> <a href="https://www.instagram.com/alhosgourmetrj/" target="_blank" rel="noopener noreferrer">@alhosgourmetrj</a></p>
            </div>
            <p class="footer-thanks">Obrigada pela preferência.</p>
        </div>
    </footer>

    <div class="overlay" id="cart-overlay" hidden>
        <aside class="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
            <div class="drawer-heading">
                <h2 id="cart-title">Seu Pedido</h2>
                <button class="icon-button" id="cart-close" type="button" aria-label="Fechar carrinho">×</button>
            </div>
            <div class="cart-items" id="cart-items"></div>
            <div class="cart-summary" id="cart-summary" hidden>
                <p><strong>Total:</strong><strong class="total-price" id="cart-total">R$ 0,00</strong></p>
                <button class="button button-green" id="checkout-open" type="button">Finalizar Pedido</button>
            </div>
        </aside>
    </div>

    <div class="overlay modal-overlay" id="checkout-overlay" hidden>
        <section class="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
            <div class="modal-heading">
                <h2 id="checkout-title">Finalizar Pedido</h2>
                <button class="icon-button" id="checkout-close" type="button" aria-label="Fechar">×</button>
            </div>
            <form id="checkout-form" class="form-stack">
                <label>Nome completo<input name="nome" required minlength="3" maxlength="80" autocomplete="name"></label>
                <label>Telefone<input name="telefone" required type="tel" maxlength="20" autocomplete="tel"></label>
                <label>Endereço de entrega<textarea name="endereco" required minlength="8" maxlength="240" rows="3" autocomplete="street-address"></textarea></label>
                <label>Forma de pagamento
                    <select name="pagamento" id="payment-method" required>
                        <option value="">Selecione uma forma de pagamento</option>
                        <option value="Pix">Pix</option>
                        <option value="Dinheiro">Dinheiro na entrega</option>
                    </select>
                </label>
                <div class="form-honeypot" aria-hidden="true">
                    <label for="checkout-website">Não preencha este campo</label>
                    <input id="checkout-website" name="website" type="text" tabindex="-1" autocomplete="off">
                </div>
                <section class="pix-payment" id="pix-payment" aria-live="polite" hidden>
                    <h3>Pagamento via Pix</h3>
                    <p>Escaneie o QR Code ou copie o código Pix. Total: <strong id="pix-total"></strong></p>
                    <img id="pix-qr" alt="QR Code Pix do pedido" width="220" height="220" hidden>
                    <p class="pix-qr-error" id="pix-qr-error" role="alert" hidden>Não foi possível carregar a imagem do QR Code. Você ainda pode copiar o código Pix abaixo.</p>
                    <label for="pix-copy-code">Pix copia e cola</label>
                    <textarea id="pix-copy-code" rows="4" readonly></textarea>
                    <button class="button button-outline" id="copy-pix-code" type="button">Copiar código Pix</button>
                </section>
                <p class="order-status" id="order-status" role="status" hidden></p>
                <button class="button button-green" type="submit">Enviar Pedido pelo WhatsApp</button>
                <button class="button button-outline" id="finish-pix-order" type="button" hidden>Concluir pedido</button>
            </form>
        </section>
    </div>

    <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
</body>

</html>