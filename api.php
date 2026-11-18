<?php
declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';

$action = (string) ($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$database = app_database();

if ($method === 'GET' && $action === 'products') {
    $pending = $database->query(
        "SELECT value FROM settings WHERE key = 'legacy_import_pending'"
    )->fetchColumn();
    send_json([
        'products' => all_products(),
        'legacyImportPending' => $pending === 'true',
    ]);
}

if ($method === 'GET' && $action === 'status') {
    send_json(['authenticated' => !empty($_SESSION['is_admin'])]);
}

if ($method === 'GET' && $action === 'customer-orders') {
    require_admin();
    $orders = app_customer_orders_database()->query(
        'SELECT phone, orders_count, last_order_at, last_order_summary, last_order_total
         FROM customer_orders
         ORDER BY last_order_at DESC'
    )->fetchAll();
    send_json(['orders' => $orders]);
}

if ($method !== 'POST') {
    header('Allow: GET, POST');
    send_json(['error' => 'Método não permitido.'], 405);
}

if ($action === 'record-order') {
    $payload = request_json();
    $token = $payload['checkoutToken'] ?? null;
    $tokens = $_SESSION['checkout_order_tokens'] ?? [];
    $tokenCreatedAt = is_array($tokens) && is_string($token) ? ($tokens[$token] ?? null) : null;
    if (!is_int($tokenCreatedAt) || $tokenCreatedAt < time() - 7200) {
        send_json(['error' => 'Sessão expirada. Atualize a página e tente novamente.'], 403);
    }

    $website = $payload['website'] ?? null;
    $nameValue = $payload['name'] ?? null;
    $phoneValue = $payload['phone'] ?? null;
    $addressValue = $payload['address'] ?? null;
    $payment = $payload['payment'] ?? null;
    if (!is_string($nameValue) || !is_string($phoneValue) || !is_string($addressValue)) {
        send_json(['error' => 'Confira nome, telefone com DDD e endereço.'], 400);
    }

    $name = trim($nameValue);
    $phone = trim($phoneValue);
    $address = trim($addressValue);
    $phoneDigits = preg_replace('/\D+/', '', $phone);
    $nationalPhone = is_string($phoneDigits) && str_starts_with($phoneDigits, '55') && in_array(strlen($phoneDigits), [12, 13], true)
        ? substr($phoneDigits, 2)
        : $phoneDigits;

    if (
        !is_string($website) ||
        trim($website) !== '' ||
        preg_match("~^[\\p{L}\\p{M}][\\p{L}\\p{M} .’'\\-]{1,79}$~u", $name) !== 1 ||
        mb_strlen($name) < 3 ||
        !preg_match('/^\+?[\d\s().-]+$/', $phone) ||
        !is_string($nationalPhone) ||
        !preg_match('/^[1-9]\d[2-9]\d{7,8}$/', $nationalPhone) ||
        mb_strlen($address) < 8 ||
        mb_strlen($address) > 240 ||
        preg_match('/[\p{L}\p{N}]/u', $address) !== 1 ||
        !in_array($payment, ['Pix', 'Dinheiro'], true)
    ) {
        send_json(['error' => 'Confira nome, telefone com DDD, endereço e pagamento.'], 400);
    }

    $items = $payload['items'] ?? null;
    if (!is_array($items) || count($items) < 1 || count($items) > 50) {
        send_json(['error' => 'Não foi possível validar os itens do pedido.'], 400);
    }

    try {
        $productLookup = $database->prepare('SELECT nome, preco FROM products WHERE id = ?');
        $summary = [];
        $orderItems = [];
        $total = 0.0;
        foreach ($items as $item) {
            $productId = is_array($item) ? ($item['id'] ?? null) : null;
            $quantity = is_array($item) ? ($item['quantity'] ?? null) : null;
            if (
                (!is_string($productId) && !is_int($productId)) ||
                (string) $productId === '' ||
                !is_int($quantity) ||
                $quantity < 1 ||
                $quantity > 99
            ) {
                send_json(['error' => 'Há um item inválido no pedido.'], 400);
            }

            $productLookup->execute([(string) $productId]);
            $product = $productLookup->fetch();
            if ($product === false) {
                send_json(['error' => 'Um dos sabores do pedido não foi encontrado. Atualize a página.'], 400);
            }

            $total += (float) $product['preco'] * $quantity;
            $summary[] = $product['nome'] . ' × ' . $quantity;
            $orderItems[] = [
                'nome' => $product['nome'],
                'quantity' => $quantity,
            ];
        }

        $canonicalPhone = '55' . $nationalPhone;
        $record = app_customer_orders_database()->prepare(
            'INSERT INTO customer_orders (phone, orders_count, last_order_at, last_order_summary, last_order_total)
             VALUES (?, 1, ?, ?, ?)
             ON CONFLICT(phone) DO UPDATE SET
                orders_count = customer_orders.orders_count + 1,
                last_order_at = excluded.last_order_at,
                last_order_summary = excluded.last_order_summary,
                last_order_total = excluded.last_order_total'
        );
        $record->execute([
            $canonicalPhone,
            gmdate('Y-m-d\TH:i:s\Z'),
            implode(' · ', $summary),
            $total,
        ]);
    } catch (Throwable $error) {
        error_log('Alhos Gourmet order recording error: ' . $error->getMessage());
        send_json(['error' => 'Não foi possível registrar o pedido. Tente novamente.'], 500);
    }

    unset($_SESSION['checkout_order_tokens'][$token]);
    $nextToken = bin2hex(random_bytes(32));
    $_SESSION['checkout_order_tokens'][$nextToken] = time();
    send_json([
        'success' => true,
        'checkoutToken' => $nextToken,
        'order' => [
            'items' => $orderItems,
            'total' => $total,
        ],
    ]);
}

if ($action === 'login') {
    $payload = request_json();
    $password = $payload['password'] ?? null;
    if (!is_string($password) || !hash_equals(admin_password(), $password)) {
        send_json(['error' => 'Senha incorreta.'], 401);
    }

    session_regenerate_id(true);
    $_SESSION['is_admin'] = true;
    send_json(['success' => true]);
}

if ($action === 'logout') {
    require_admin();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $cookie = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $cookie['path'],
            'secure' => $cookie['secure'],
            'httponly' => $cookie['httponly'],
            'samesite' => $cookie['samesite'],
        ]);
    }
    session_destroy();
    send_json(['success' => true]);
}

require_admin();
$payload = request_json();

try {
    if ($action === 'save') {
        $product = validate_product($payload);
        if ($product === null) {
            send_json(['error' => 'Confira nome, preço, descrição e foto do sabor.'], 400);
        }

        $id = trim((string) ($payload['id'] ?? ''));
        if ($id !== '') {
            $select = $database->prepare('SELECT imagem FROM products WHERE id = ?');
            $select->execute([$id]);
            $oldImage = $select->fetchColumn();
            if ($oldImage === false) {
                send_json(['error' => 'Esse sabor não foi encontrado.'], 404);
            }
            $statement = $database->prepare(
                'UPDATE products SET nome = ?, descricao = ?, preco = ?, imagem = ? WHERE id = ?'
            );
            $statement->execute([
                $product['nome'],
                $product['descricao'],
                $product['preco'],
                $product['imagem'],
                $id,
            ]);
            if ($oldImage !== $product['imagem']) {
                remove_uploaded_image((string) $oldImage);
            }
        } else {
            $id = bin2hex(random_bytes(16));
            $position = (int) $database->query(
                'SELECT COALESCE(MIN(position), 0) - 1 FROM products'
            )->fetchColumn();
            $statement = $database->prepare(
                'INSERT INTO products (id, nome, descricao, preco, imagem, position)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            $statement->execute([
                $id,
                $product['nome'],
                $product['descricao'],
                $product['preco'],
                $product['imagem'],
                $position,
            ]);
        }

        send_json(['success' => true, 'products' => all_products()]);
    }

    if ($action === 'delete') {
        $id = trim((string) ($payload['id'] ?? ''));
        $select = $database->prepare('SELECT imagem FROM products WHERE id = ?');
        $select->execute([$id]);
        $image = $select->fetchColumn();
        if ($image === false) {
            send_json(['error' => 'Esse sabor não foi encontrado.'], 404);
        }
        $statement = $database->prepare('DELETE FROM products WHERE id = ?');
        $statement->execute([$id]);
        remove_uploaded_image((string) $image);
        send_json(['success' => true, 'products' => all_products()]);
    }

    if ($action === 'reset') {
        $images = $database->query('SELECT imagem FROM products')->fetchAll(PDO::FETCH_COLUMN);
        $database->beginTransaction();
        $database->exec('DELETE FROM products');
        seed_default_products($database);
        $database->commit();
        foreach ($images as $image) {
            remove_uploaded_image((string) $image);
        }
        send_json(['success' => true, 'products' => all_products()]);
    }

    if ($action === 'import-legacy') {
        $setting = $database->query(
            "SELECT value FROM settings WHERE key = 'legacy_import_pending'"
        )->fetchColumn();
        if ($setting !== 'true') {
            send_json(['success' => true, 'products' => all_products()]);
        }

        $products = $payload['products'] ?? null;
        if (!is_array($products) || count($products) > 100) {
            send_json(['error' => 'Lista de sabores inválida.'], 400);
        }

        $normalized = [];
        foreach ($products as $item) {
            if (!is_array($item) || !is_string($item['id'] ?? null)) {
                send_json(['error' => 'Há dados inválidos na lista de sabores.'], 400);
            }
            $product = validate_product($item);
            if ($product === null) {
                send_json(['error' => 'Há dados inválidos na lista de sabores.'], 400);
            }
            $normalized[] = ['id' => $item['id']] + $product;
        }

        $database->beginTransaction();
        if (count($normalized) > 0) {
            $database->exec('DELETE FROM products');
            $statement = $database->prepare(
                'INSERT INTO products (id, nome, descricao, preco, imagem, position)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            foreach ($normalized as $position => $product) {
                $statement->execute([
                    $product['id'],
                    $product['nome'],
                    $product['descricao'],
                    $product['preco'],
                    $product['imagem'],
                    $position,
                ]);
            }
        }
        $database->exec(
            "UPDATE settings SET value = 'false' WHERE key = 'legacy_import_pending'"
        );
        $database->commit();
        send_json(['success' => true, 'products' => all_products()]);
    }
} catch (Throwable $error) {
    if ($database->inTransaction()) {
        $database->rollBack();
    }
    error_log('Alhos Gourmet API error: ' . $error->getMessage());
    send_json(['error' => 'Não foi possível salvar as alterações no banco local.'], 500);
}

send_json(['error' => 'Ação não encontrada.'], 404);
