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

if ($method !== 'POST') {
    header('Allow: GET, POST');
    send_json(['error' => 'Método não permitido.'], 405);
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
