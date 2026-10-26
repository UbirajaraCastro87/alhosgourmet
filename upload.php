<?php
declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require_admin();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    send_json(['error' => 'Método não permitido.'], 405);
}

$file = $_FILES['photo'] ?? null;
if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    send_json(['error' => 'Selecione uma foto válida para enviar.'], 400);
}

if (($file['size'] ?? 0) < 1 || $file['size'] > 8 * 1024 * 1024) {
    send_json(['error' => 'A foto deve ter no máximo 8 MB.'], 400);
}

$temporaryPath = $file['tmp_name'] ?? '';
if (!is_string($temporaryPath) || !is_uploaded_file($temporaryPath)) {
    send_json(['error' => 'Não foi possível validar o arquivo enviado.'], 400);
}

$fileInfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $fileInfo->file($temporaryPath);
$extensions = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
];
if (!is_string($mimeType) || !isset($extensions[$mimeType])) {
    send_json(['error' => 'Use uma foto JPEG, PNG ou WebP.'], 400);
}

if (!is_dir(UPLOAD_DIRECTORY) && !mkdir(UPLOAD_DIRECTORY, 0775, true) && !is_dir(UPLOAD_DIRECTORY)) {
    send_json(['error' => 'Não foi possível criar a pasta das fotos no servidor.'], 500);
}

$filename = bin2hex(random_bytes(16)) . '.' . $extensions[$mimeType];
$destination = UPLOAD_DIRECTORY . DIRECTORY_SEPARATOR . $filename;
if (!move_uploaded_file($temporaryPath, $destination)) {
    send_json(['error' => 'Não foi possível salvar a foto no servidor.'], 500);
}

send_json([
    'success' => true,
    'image' => app_base_path() . '/uploads/products/' . $filename,
]);
