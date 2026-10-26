<?php
declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';

try {
    $products = all_products();
    $loadError = '';
} catch (Throwable $error) {
    error_log('Alhos Gourmet admin page error: ' . $error->getMessage());
    $products = [];
    $loadError = 'Não foi possível carregar os sabores. Confira se o SQLite está habilitado no XAMPP.';
}

function admin_html_escape(string $value): string
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
    <title>Painel de Sabores | Alhos Gourmet</title>
    <link rel="stylesheet" href="<?= admin_html_escape($basePath) ?>/assets/style.css">
    <script>window.APP_BASE_PATH = <?= json_encode($basePath, JSON_UNESCAPED_SLASHES) ?>;</script>
    <script src="<?= admin_html_escape($basePath) ?>/assets/admin.js" defer></script>
</head>
<body class="admin-page">
    <header class="site-header">
        <div class="header-inner container">
            <a class="brand" href="<?= admin_html_escape($basePath) ?>/">
                <span class="brand-mark" aria-hidden="true">🧄</span>
                <span class="brand-copy"><strong>ALHOS GOURMET</strong><small>ARTESANAL &amp; NOBRE</small></span>
            </a>
            <a class="admin-link" href="<?= admin_html_escape($basePath) ?>/">Voltar à loja</a>
        </div>
    </header>

    <main class="admin-main container">
        <div class="admin-title-row">
            <div>
                <p class="admin-overline">Área Administrativa</p>
                <h1>Painel de Sabores</h1>
            </div>
            <button class="button button-outline" id="logout-button" type="button" hidden>Sair</button>
        </div>

        <p class="notice notice-error" id="admin-error" role="alert" <?= $loadError === '' ? 'hidden' : '' ?>><?= admin_html_escape($loadError) ?></p>

        <section class="login-card" id="login-panel">
            <span class="login-icon" aria-hidden="true">🔒</span>
            <h2>Entrar no painel</h2>
            <p>Digite a senha administrativa para gerenciar os sabores.</p>
            <form id="login-form" class="form-stack">
                <label>Senha administrativa<input name="password" type="password" required autocomplete="current-password" placeholder="Sua senha"></label>
                <button class="button button-gold" type="submit" <?= $loadError !== '' ? 'disabled' : '' ?>>Entrar</button>
            </form>
            <small class="login-hint">Configure a senha administrativa no arquivo config.php.</small>
        </section>

        <section class="admin-workspace" id="admin-workspace" hidden>
            <form class="admin-form panel-card" id="product-form">
                <h2 id="form-title">Adicionar Sabor</h2>
                <input type="hidden" name="id" id="product-id">
                <label>Nome<input name="nome" id="product-name" required maxlength="100" placeholder="Ex.: Alho Tradicional"></label>
                <label>Preço (R$)<input name="preco" id="product-price" required type="number" min="0" step="0.01" placeholder="22,00"></label>
                <label class="file-label" for="product-photo">Foto do sabor</label>
                <input id="product-photo" type="file" accept="image/jpeg,image/png,image/webp">
                <small class="field-help">Envie JPEG, PNG ou WebP. Tamanho máximo: 8 MB.</small>
                <label>Ou informe a URL da imagem<input id="product-image-url" type="url" placeholder="https://..."></label>
                <div class="image-preview" id="image-preview" hidden><img id="image-preview-img" alt="Prévia da foto"></div>
                <input type="hidden" name="imagem" id="product-image" required>
                <label>Descrição<textarea name="descricao" id="product-description" rows="4" maxlength="1000" placeholder="Descreva os ingredientes e o sabor"></textarea></label>
                <div class="form-error" id="form-error" role="alert" hidden></div>
                <button class="button button-gold" id="save-product" type="submit">Cadastrar</button>
                <button class="button button-outline" id="cancel-edit" type="button" hidden>Cancelar edição</button>
            </form>

            <section class="product-list-panel">
                <div class="list-heading">
                    <h2>Sabores Cadastrados</h2>
                    <span class="product-count" id="product-count">0</span>
                </div>
                <button class="restore-button" id="restore-defaults" type="button">Restaurar sabores padrão</button>
                <div class="admin-product-list" id="admin-product-list"></div>
            </section>
        </section>
    </main>

    <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
</body>
</html>
