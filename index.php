<?php
declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';

try {
    $products = all_products();
} catch (Throwable $error) {
    error_log('Alhos Gourmet storefront error: ' . $error->getMessage());
    http_response_code(500);
    $products = [];
    $pageError = 'Não foi possível carregar os sabores. Confira o banco de dados e tente novamente.';
}

function html_escape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

$basePath = app_base_path();
?>
<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f8f6f2">
    <meta name="description" content="Temperos artesanais de alho selecionado, azeites finos e ervas frescas.">
    <title>Alhos Gourmet | Tempero que abraça o sabor</title>
    <link rel="stylesheet" href="<?= html_escape($basePath) ?>/assets/style.css">
    <script>window.APP_BASE_PATH = <?= json_encode($basePath, JSON_UNESCAPED_SLASHES) ?>;</script>
    <script src="<?= html_escape($basePath) ?>/assets/store.js" defer></script>
</head>
<body>
    <header class="site-header">
        <div class="header-inner container">
            <a class="brand" href="<?= html_escape($basePath) ?>/">
                <span class="brand-mark" aria-hidden="true">🧄</span>
                <span class="brand-copy">
                    <strong>ALHOS GOURMET</strong>
                    <small>ARTESANAL &amp; NOBRE</small>
                </span>
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
                <div class="hero-photo">
                    <img src="https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&amp;fit=crop&amp;q=80&amp;w=900" alt="Alhos e ingredientes frescos">
                </div>
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
                    <button class="filter-button" type="button" data-price-filter="ate25">Até R$ 25</button>
                    <button class="filter-button" type="button" data-price-filter="acima25">Acima de R$ 25</button>
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
                <p><strong>WhatsApp:</strong> (21) 98883-2361</p>
                <p><strong>PIX:</strong> emdsdc@gmail.com</p>
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
                <label>Nome completo<input name="nome" required autocomplete="name"></label>
                <label>Telefone<input name="telefone" required type="tel" autocomplete="tel"></label>
                <label>Endereço de entrega<textarea name="endereco" required rows="3" autocomplete="street-address"></textarea></label>
                <button class="button button-green" type="submit">Enviar Pedido pelo WhatsApp</button>
            </form>
        </section>
    </div>

    <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
</body>
</html>
