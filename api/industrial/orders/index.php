<?php
declare(strict_types=1);

/**
 * POST /api/industrial/orders — recebe ordem industrial do Painel Mestre (PIMO TRAK).
 * Persistência em JSON: data/industrial_orders/{orderId}.json
 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function pimo_orders_json(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    if (!@mkdir($dataDir, 0755, true)) {
        pimo_orders_json(['ok' => false, 'error' => 'Não foi possível criar diretório de dados'], 500);
    }
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $files = glob($dataDir . '/*.json') ?: [];
    $orders = [];
    foreach ($files as $file) {
        $raw = @file_get_contents($file);
        if ($raw === false) {
            continue;
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            continue;
        }
        $orders[] = [
            'orderId' => $decoded['orderId'] ?? basename($file, '.json'),
            'projeto' => $decoded['projeto'] ?? null,
            'createdAt' => $decoded['createdAt'] ?? null,
            'pecasCount' => isset($decoded['pecas']) && is_array($decoded['pecas']) ? count($decoded['pecas']) : 0,
        ];
    }
    usort($orders, static function ($a, $b) {
        return strcmp((string) ($b['createdAt'] ?? ''), (string) ($a['createdAt'] ?? ''));
    });
    pimo_orders_json(['ok' => true, 'orders' => $orders]);
}

if ($method !== 'POST') {
    pimo_orders_json(['ok' => false, 'error' => 'Método não suportado'], 405);
}

$rawBody = file_get_contents('php://input');
if ($rawBody === false || trim($rawBody) === '') {
    pimo_orders_json(['ok' => false, 'error' => 'Corpo vazio'], 400);
}

try {
    $payload = json_decode($rawBody, true, 512, JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    pimo_orders_json(['ok' => false, 'error' => 'JSON inválido'], 400);
}

if (!is_array($payload)) {
    pimo_orders_json(['ok' => false, 'error' => 'Payload inválido'], 400);
}

$projeto = $payload['projeto'] ?? null;
if (!is_array($projeto) || !isset($projeto['nome']) || trim((string) $projeto['nome']) === '') {
    pimo_orders_json(['ok' => false, 'error' => 'Campo projeto.nome obrigatório'], 422);
}

$orderId = 'ord-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(4));
$record = [
    'orderId' => $orderId,
    'createdAt' => gmdate('c'),
    'projeto' => $payload['projeto'] ?? null,
    'caixas' => $payload['caixas'] ?? [],
    'pecas' => $payload['pecas'] ?? [],
    'ferragens' => $payload['ferragens'] ?? [],
    'medidas' => $payload['medidas'] ?? null,
    'observacoes' => $payload['observacoes'] ?? [],
    'operacoes' => $payload['operacoes'] ?? [],
    'ownerId' => $payload['ownerId'] ?? null,
    'ownerName' => $payload['ownerName'] ?? null,
];

$filePath = $dataDir . '/' . $orderId . '.json';
$written = @file_put_contents(
    $filePath,
    json_encode($record, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
    LOCK_EX
);

if ($written === false) {
    pimo_orders_json(['ok' => false, 'error' => 'Falha ao gravar ordem'], 500);
}

pimo_orders_json([
    'ok' => true,
    'orderId' => $orderId,
    'createdAt' => $record['createdAt'],
    'pecasCount' => is_array($record['pecas']) ? count($record['pecas']) : 0,
]);
