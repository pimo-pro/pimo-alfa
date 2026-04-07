<?php
/**
 * PIMO — endpoint dedicado de listagem de projetos (versão Hostinger).
 *
 * GET /api/projects/list.php
 * GET /api/projects/list.php?scope=all
 * GET /api/projects/list.php?scope=mine&ownerId=guest-xxxx
 *
 * Parâmetros:
 *   scope   = "mine" (padrão) | "all"
 *   ownerId = string (obrigatório quando scope=mine)
 *
 * scope=all  → devolve TODOS os projetos do sistema, incluindo:
 *               - ownerId com prefixo "guest-"  (visitantes)
 *               - ownerId com prefixo "anon-"   (sistema legacy)
 *               - utilizadores registados
 * scope=mine → filtra pelo ownerId exato enviado pelo cliente.
 *
 * Resposta:
 *   { "status": "ok", "scope": "...", "ownerId": "...", "total": N, "projects": [ ... ] }
 */
declare(strict_types=1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if (($_SERVER["REQUEST_METHOD"] ?? "") === "OPTIONS") {
    http_response_code(200);
    exit;
}

if (($_SERVER["REQUEST_METHOD"] ?? "GET") !== "GET") {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Apenas GET permitido"], JSON_UNESCAPED_UNICODE);
    exit;
}

$dataDir = __DIR__ . "/data";

if (!is_dir($dataDir)) {
    echo json_encode([
        "status"   => "ok",
        "scope"    => "all",
        "ownerId"  => null,
        "total"    => 0,
        "projects" => [],
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$scope   = isset($_GET["scope"])   ? trim((string)$_GET["scope"])   : "mine";
$ownerId = isset($_GET["ownerId"]) ? trim((string)$_GET["ownerId"]) : "";
$now     = gmdate("c");

/**
 * Extrai thumbnailDataUrl do projeto (top-level ou dentro de centerDisplay).
 */
function list_thumbnail(array $data): ?string
{
    if (array_key_exists("thumbnailDataUrl", $data)) {
        $t = $data["thumbnailDataUrl"];
        return (is_string($t) || $t === null) ? $t : null;
    }
    $cd = $data["centerDisplay"] ?? null;
    if (is_array($cd) && array_key_exists("thumbnailDataUrl", $cd)) {
        $t = $cd["thumbnailDataUrl"];
        return (is_string($t) || $t === null) ? $t : null;
    }
    return null;
}

$files    = glob($dataDir . "/project-*.json") ?: [];
$projects = [];

foreach ($files as $file) {
    $raw  = file_get_contents($file);
    $data = json_decode($raw !== false ? $raw : "null", true);

    if (!is_array($data)) {
        continue;
    }

    $pid = isset($data["id"]) ? trim((string)$data["id"]) : "";
    if ($pid === "") {
        continue;
    }

    // scope=mine → filtrar por ownerId exato.
    // scope=all  → sem filtro (inclui guest-, anon-, registados).
    if ($scope === "mine" && $ownerId !== "") {
        if (($data["ownerId"] ?? "") !== $ownerId) {
            continue;
        }
    }

    $projects[] = [
        "id"               => $pid,
        "name"             => isset($data["name"]) ? (string)$data["name"] : "Projeto",
        "sequence"         => 0,
        "createdAt"        => isset($data["createdAt"]) && is_string($data["createdAt"])
            ? $data["createdAt"] : $now,
        "updatedAt"        => isset($data["updatedAt"]) && is_string($data["updatedAt"])
            ? $data["updatedAt"]
            : (isset($data["createdAt"]) ? $data["createdAt"] : $now),
        "ownerId"          => isset($data["ownerId"])   ? (string)$data["ownerId"]   : "usuario-local",
        "ownerName"        => isset($data["ownerName"]) ? (string)$data["ownerName"] : (string)($data["ownerId"] ?? "Utilizador"),
        "thumbnailDataUrl" => list_thumbnail($data),
    ];
}

// Ordenar por updatedAt descendente (mais recente primeiro).
usort($projects, static function (array $a, array $b): int {
    return strcmp($b["updatedAt"] ?? "", $a["updatedAt"] ?? "");
});

// Atribuir sequence após ordenação.
foreach ($projects as $i => &$p) {
    $p["sequence"] = $i + 1;
}
unset($p);

echo json_encode([
    "status"   => "ok",
    "scope"    => $scope,
    "ownerId"  => $ownerId !== "" ? $ownerId : null,
    "total"    => count($projects),
    "projects" => $projects,
], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
