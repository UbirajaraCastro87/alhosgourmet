<?php
declare(strict_types=1);

const APP_ROOT = __DIR__ . DIRECTORY_SEPARATOR . '..';
const UPLOAD_DIRECTORY = APP_ROOT . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'products';

function app_database_path(): string
{
    $configuredPath = getenv('ALHOS_DATABASE_PATH');
    return is_string($configuredPath) && $configuredPath !== ''
        ? $configuredPath
        : APP_ROOT . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'alhosgourmet.sqlite';
}

function app_base_path(): string
{
    $directory = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/'));
    return $directory === '/' || $directory === '.' ? '' : rtrim($directory, '/');
}

function app_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_set_cookie_params([
        'httponly' => true,
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'samesite' => 'Strict',
        'path' => app_base_path() ?: '/',
    ]);
    session_start();
}

function app_config(): array
{
    static $config;
    if (isset($config)) {
        return $config;
    }

    $configPath = APP_ROOT . DIRECTORY_SEPARATOR . 'config.php';
    $fileConfig = is_file($configPath) ? require $configPath : [];
    $config = is_array($fileConfig) ? $fileConfig : [];
    return $config;
}

function admin_password(): string
{
    $environmentPassword = getenv('ADMIN_PASSWORD');
    if (is_string($environmentPassword) && $environmentPassword !== '') {
        return $environmentPassword;
    }

    $config = app_config();
    $configuredPassword = $config['admin_password'] ?? '';
    return is_string($configuredPassword) && $configuredPassword !== '' ? $configuredPassword : 'admin123';
}

function app_database(): PDO
{
    static $database;
    if ($database instanceof PDO) {
        return $database;
    }

    if (!extension_loaded('pdo_sqlite')) {
        throw new RuntimeException('Ative a extensão pdo_sqlite no XAMPP.');
    }

    $storageDirectory = dirname(app_database_path());
    if (!is_dir($storageDirectory) && !mkdir($storageDirectory, 0775, true) && !is_dir($storageDirectory)) {
        throw new RuntimeException('Não foi possível criar a pasta local do banco.');
    }

    $database = new PDO('sqlite:' . app_database_path(), null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $database->exec('PRAGMA busy_timeout = 5000');
    $database->exec(
        'CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            nome TEXT NOT NULL,
            descricao TEXT NOT NULL,
            preco REAL NOT NULL,
            imagem TEXT NOT NULL,
            position INTEGER NOT NULL DEFAULT 0
        )'
    );
    $database->exec(
        'CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )'
    );

    $columns = $database->query('PRAGMA table_info(products)')->fetchAll();
    $hasPosition = false;
    foreach ($columns as $column) {
        if ($column['name'] === 'position') {
            $hasPosition = true;
            break;
        }
    }
    if (!$hasPosition) {
        $database->exec('ALTER TABLE products ADD COLUMN position INTEGER NOT NULL DEFAULT 0');
    }

    $count = (int) $database->query('SELECT COUNT(*) FROM products')->fetchColumn();
    if ($count === 0) {
        seed_default_products($database);
    }

    $database->exec(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('initialized', 'true')"
    );
    $database->exec(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('legacy_import_pending', 'true')"
    );

    return $database;
}

function default_products(): array
{
    return [
        [
            'id' => '1',
            'nome' => 'Alho Tradicional',
            'descricao' => 'Pasta cremosa de alho puro selecionado com azeite extravirgem e flor de sal.',
            'preco' => 22.0,
            'imagem' => 'https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&q=80&w=600',
        ],
        [
            'id' => '2',
            'nome' => 'Alho com Ervas Finas',
            'descricao' => 'Macerado com alecrim, tomilho fresco e orégano campestre.',
            'preco' => 25.0,
            'imagem' => 'https://images.unsplash.com/photo-1608797178974-15b35a61dede?auto=format&fit=crop&q=80&w=600',
        ],
        [
            'id' => '3',
            'nome' => 'Alho com Pimenta',
            'descricao' => 'Picância equilibrada com pimenta dedo-de-moça e páprica defumada.',
            'preco' => 26.0,
            'imagem' => 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&q=80&w=600',
        ],
        [
            'id' => '4',
            'nome' => 'Alho Defumado',
            'descricao' => 'Defumação natural rústica em lenha nobre.',
            'preco' => 28.0,
            'imagem' => 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&q=80&w=600',
        ],
        [
            'id' => '5',
            'nome' => 'Alho com Chimichurri',
            'descricao' => 'Inspirado na parrilla argentina com salsa desidratada e ervas.',
            'preco' => 27.0,
            'imagem' => 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600',
        ],
    ];
}

function seed_default_products(PDO $database): void
{
    $insert = $database->prepare(
        'INSERT OR IGNORE INTO products (id, nome, descricao, preco, imagem, position)
         VALUES (:id, :nome, :descricao, :preco, :imagem, :position)'
    );
    foreach (default_products() as $position => $product) {
        $insert->execute($product + ['position' => $position]);
    }
}

function all_products(): array
{
    return app_database()
        ->query('SELECT id, nome, descricao, preco, imagem FROM products ORDER BY position ASC, rowid ASC')
        ->fetchAll();
}

function send_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function request_json(): array
{
    $rawBody = file_get_contents('php://input');
    $payload = json_decode($rawBody === false ? '' : $rawBody, true);
    if (!is_array($payload)) {
        send_json(['error' => 'Dados inválidos.'], 400);
    }
    return $payload;
}

function require_admin(): void
{
    app_start_session();
    if (empty($_SESSION['is_admin'])) {
        send_json(['error' => 'Entre no painel administrativo para continuar.'], 401);
    }
}

function validate_product(array $payload): ?array
{
    $name = trim((string) ($payload['nome'] ?? ''));
    $description = trim((string) ($payload['descricao'] ?? ''));
    $price = $payload['preco'] ?? null;
    $image = $payload['imagem'] ?? null;

    if (
        $name === '' ||
        mb_strlen($name) > 100 ||
        mb_strlen($description) > 1000 ||
        !is_numeric($price) ||
        !is_finite((float) $price) ||
        (float) $price < 0 ||
        !is_string($image) ||
        $image === '' ||
        strlen($image) > 5 * 1024 * 1024
    ) {
        return null;
    }

    if (str_starts_with($image, 'data:image/')) {
        if (!preg_match('/^data:image\\/(jpeg|png|webp);base64,([A-Za-z0-9+\\/=]+)$/', $image)) {
            return null;
        }
    } elseif (filter_var($image, FILTER_VALIDATE_URL) === false || !in_array(parse_url($image, PHP_URL_SCHEME), ['http', 'https'], true)) {
        $basePath = app_base_path();
        $uploadPrefix = ($basePath !== '' ? $basePath : '') . '/uploads/products/';
        if (!str_starts_with($image, $uploadPrefix)) {
            return null;
        }
    }

    return [
        'nome' => $name,
        'descricao' => $description,
        'preco' => (float) $price,
        'imagem' => $image,
    ];
}

function remove_uploaded_image(string $image): void
{
    $prefix = app_base_path() . '/uploads/products/';
    if (!str_starts_with($image, $prefix)) {
        return;
    }

    $filename = basename(substr($image, strlen($prefix)));
    if (!preg_match('/^[a-f0-9-]+\\.(jpg|png|webp)$/i', $filename)) {
        return;
    }

    $path = UPLOAD_DIRECTORY . DIRECTORY_SEPARATOR . $filename;
    if (is_file($path)) {
        unlink($path);
    }
}

app_start_session();
