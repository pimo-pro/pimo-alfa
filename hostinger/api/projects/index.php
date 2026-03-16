<?php
declare(strict_types=1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if (($_SERVER["REQUEST_METHOD"] ?? "") === "OPTIONS") {
    http_response_code(200);
    exit();
}

const MAX_PROJECTS = 2000;
const STORAGE_DIR = "/public_html/pimo_storage/projects";
const LOCK_FILE = STORAGE_DIR . "/.projects.lock";

function send_json(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function ensure_storage_dirs(): void
{
    if (!is_dir(STORAGE_DIR) && !mkdir(STORAGE_DIR, 0775, true) && !is_dir(STORAGE_DIR)) {
        throw new RuntimeException("Não foi possível criar diretório de projetos.");
    }
}

function read_json_file(string $path, array $fallback): array
{
    if (!file_exists($path)) {
        return $fallback;
    }
    $raw = file_get_contents($path);
    if ($raw === false || trim($raw) === "") {
        return $fallback;
    }
    $parsed = json_decode($raw, true);
    return is_array($parsed) ? $parsed : $fallback;
}

function read_request_body(): ?array
{
    $raw = file_get_contents("php://input");
    if ($raw === false || trim($raw) === "") {
        return null;
    }
    $parsed = json_decode($raw, true);
    return is_array($parsed) ? $parsed : null;
}

function normalize_project_name(?string $name, int $sequence): string
{
    $trimmed = trim((string)$name);
    return $trimmed !== "" ? $trimmed : "Projeto " . $sequence;
}

function slugify_name(string $name): string
{
    $normalized = iconv("UTF-8", "ASCII//TRANSLIT//IGNORE", $name);
    if ($normalized === false) {
        $normalized = $name;
    }
    $slug = preg_replace("/[^a-zA-Z0-9]+/", "_", $normalized ?? "") ?? "";
    $slug = trim($slug, "_");
    return $slug !== "" ? $slug : "Projeto";
}

function build_pimo_filename(string $id, string $name): string
{
    return STORAGE_DIR . "/" . $id . "_" . slugify_name($name) . ".pimo.json";
}

function generate_project_id(): string
{
    return (string)round(microtime(true) * 1000);
}

function list_pimo_files(): array
{
    $files = glob(STORAGE_DIR . "/*.pimo.json");
    return is_array($files) ? $files : [];
}

function find_project_file_by_id(string $id): ?string
{
    $files = glob(STORAGE_DIR . "/" . $id . "_*.pimo.json");
    if (is_array($files) && count($files) > 0) {
        return $files[0];
    }
    return null;
}

function ensure_pimo_shape(array $project): array
{
    $defaults = [
        "id" => "",
        "name" => "Projeto",
        "ownerId" => "usuario-local",
        "createdAt" => gmdate("c"),
        "updatedAt" => gmdate("c"),
        "room" => null,
        "boxes" => [],
        "shelves" => [],
        "dividers" => [],
        "centerDisplay" => ["thumbnailDataUrl" => null],
        "holes" => [],
        "drillMarkers" => [],
        "materials" => null,
        "viewerSnapshot" => null,
        "settings" => [],
    ];
    return array_merge($defaults, $project);
}

function legacy_record_to_pimo(array $record): array
{
    $snapshot = isset($record["snapshot"]) && is_array($record["snapshot"]) ? $record["snapshot"] : [];
    $projectState = isset($snapshot["projectState"]) && is_array($snapshot["projectState"]) ? $snapshot["projectState"] : [];
    $now = gmdate("c");
    $projectName = trim((string)($record["name"] ?? ($projectState["projectName"] ?? "Projeto")));
    $id = trim((string)($record["id"] ?? generate_project_id()));
    $material = $projectState["material"] ?? null;
    $materialId = $projectState["materialId"] ?? null;
    $cutList = isset($projectState["cutList"]) && is_array($projectState["cutList"]) ? $projectState["cutList"] : [];
    $holes = [];
    foreach ($cutList as $piece) {
        if (is_array($piece) && isset($piece["drillHoles"]) && is_array($piece["drillHoles"])) {
            foreach ($piece["drillHoles"] as $hole) {
                $holes[] = $hole;
            }
        }
    }
    return ensure_pimo_shape([
        "id" => $id,
        "name" => $projectName !== "" ? $projectName : "Projeto",
        "ownerId" => (string)($record["ownerId"] ?? "usuario-local"),
        "ownerName" => (string)($record["ownerName"] ?? ($record["ownerId"] ?? "usuario-local")),
        "createdAt" => (string)($record["createdAt"] ?? $now),
        "updatedAt" => (string)($record["updatedAt"] ?? $now),
        "room" => $snapshot["roomSnapshot"] ?? null,
        "boxes" => $projectState["workspaceBoxes"] ?? ($projectState["boxes"] ?? []),
        "shelves" => $projectState["shelves"] ?? [],
        "dividers" => $projectState["dividers"] ?? [],
        "centerDisplay" => [
            "thumbnailDataUrl" => $record["thumbnailDataUrl"] ?? null,
        ],
        "holes" => $holes,
        "drillMarkers" => $projectState["drillMarkers"] ?? [],
        "materials" => [
            "materialId" => $materialId,
            "material" => $material,
        ],
        "viewerSnapshot" => $snapshot["viewerSnapshot"] ?? null,
        "settings" => [
            "projectState" => $snapshot["projectState"] ?? [],
            "viewerSettings" => $projectState["viewerSettings"] ?? null,
            "ownerName" => $record["ownerName"] ?? null,
            "thumbnailDataUrl" => $record["thumbnailDataUrl"] ?? null,
        ],
    ]);
}

function request_body_to_pimo(array $body): array
{
    if (isset($body["snapshot"]) && is_array($body["snapshot"])) {
        return legacy_record_to_pimo($body);
    }
    return ensure_pimo_shape($body);
}

function pimo_to_meta(array $project, int $sequence): array
{
    $center = isset($project["centerDisplay"]) && is_array($project["centerDisplay"]) ? $project["centerDisplay"] : [];
    return [
        "id" => (string)$project["id"],
        "name" => (string)$project["name"],
        "sequence" => $sequence,
        "createdAt" => (string)$project["createdAt"],
        "updatedAt" => (string)$project["updatedAt"],
        "ownerId" => (string)$project["ownerId"],
        "ownerName" => (string)($project["ownerName"] ?? $project["ownerId"]),
        "thumbnailDataUrl" => $center["thumbnailDataUrl"] ?? ($project["thumbnailDataUrl"] ?? null),
    ];
}

function read_all_projects(): array
{
    $projects = [];
    foreach (list_pimo_files() as $file) {
        $project = read_json_file($file, []);
        if (!is_array($project)) {
            continue;
        }
        $project = ensure_pimo_shape($project);
        if (!isset($project["id"]) || trim((string)$project["id"]) === "") {
            continue;
        }
        $projects[] = $project;
    }
    usort($projects, static function (array $a, array $b): int {
        return strcmp((string)$b["updatedAt"], (string)$a["updatedAt"]);
    });
    return array_slice($projects, 0, MAX_PROJECTS);
}

function migrate_legacy_files(): void
{
    $legacyIndexPath = STORAGE_DIR . "/index.json";
    $legacyRecords = [];
    if (file_exists($legacyIndexPath)) {
        $index = read_json_file($legacyIndexPath, ["projects" => []]);
        if (isset($index["projects"]) && is_array($index["projects"])) {
            foreach ($index["projects"] as $meta) {
                if (!is_array($meta)) {
                    continue;
                }
                $id = trim((string)($meta["id"] ?? ""));
                if ($id === "") {
                    continue;
                }
                $legacyFile = STORAGE_DIR . "/" . $id . ".json";
                if (!file_exists($legacyFile)) {
                    continue;
                }
                $record = read_json_file($legacyFile, []);
                if (!is_array($record)) {
                    continue;
                }
                $legacyRecords[] = $record;
            }
        }
    }
    foreach (glob(STORAGE_DIR . "/*.json") ?: [] as $jsonFile) {
        if (str_ends_with($jsonFile, ".pimo.json")) {
            continue;
        }
        if (basename($jsonFile) === "index.json") {
            continue;
        }
        $record = read_json_file($jsonFile, []);
        if (is_array($record)) {
            $legacyRecords[] = $record;
        }
    }
    if (count($legacyRecords) === 0) {
        if (file_exists($legacyIndexPath)) {
            @unlink($legacyIndexPath);
        }
        return;
    }

    foreach ($legacyRecords as $record) {
        $project = legacy_record_to_pimo($record);
        $id = trim((string)$project["id"]);
        if ($id === "") {
            $id = generate_project_id();
            $project["id"] = $id;
        }
        $project["name"] = normalize_project_name((string)$project["name"], 1);
        $target = build_pimo_filename($id, (string)$project["name"]);
        if (!file_exists($target)) {
            $ok = file_put_contents($target, json_encode($project, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            if ($ok === false) {
                throw new RuntimeException("Falha ao migrar projeto legado para .pimo.json");
            }
        }
    }
    foreach (glob(STORAGE_DIR . "/*.json") ?: [] as $jsonFile) {
        if (str_ends_with($jsonFile, ".pimo.json")) {
            continue;
        }
        @unlink($jsonFile);
    }
}

function parse_project_id(): ?string
{
    $path = "";
    if (isset($_GET["path"]) && is_string($_GET["path"])) {
        $path = trim($_GET["path"], "/");
    } else {
        $requestPath = (string)parse_url($_SERVER["REQUEST_URI"] ?? "", PHP_URL_PATH);
        $apiBase = "/api/projects";
        if (str_starts_with($requestPath, $apiBase)) {
            $path = trim(substr($requestPath, strlen($apiBase)), "/");
        }
    }
    if ($path === "") {
        return null;
    }
    return rawurldecode(explode("/", $path)[0]);
}

function with_lock(callable $callback): void
{
    ensure_storage_dirs();
    $lockHandle = fopen(LOCK_FILE, "c+");
    if ($lockHandle === false) {
        throw new RuntimeException("Não foi possível abrir lock de projetos.");
    }
    try {
        if (!flock($lockHandle, LOCK_EX)) {
            throw new RuntimeException("Não foi possível bloquear projetos.");
        }
        $callback();
    } finally {
        flock($lockHandle, LOCK_UN);
        fclose($lockHandle);
    }
}

try {
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";
    $projectId = parse_project_id();
    with_lock(function (): void {
        migrate_legacy_files();
    });

    if ($method === "GET" && $projectId === null) {
        $scope = (isset($_GET["scope"]) && $_GET["scope"] === "all") ? "all" : "mine";
        $ownerId = trim((string)($_GET["ownerId"] ?? ""));
        $projects = read_all_projects();
        if ($scope !== "all") {
            $projects = $ownerId === ""
                ? []
                : array_values(array_filter($projects, static fn(array $p): bool => ((string)($p["ownerId"] ?? "")) === $ownerId));
        }
        $metaProjects = [];
        foreach ($projects as $i => $project) {
            $metaProjects[] = pimo_to_meta($project, $i + 1);
        }
        send_json(200, ["ok" => true, "projects" => $metaProjects]);
    }

    if ($method === "POST" && $projectId === null) {
        $body = read_request_body();
        if (!is_array($body)) {
            send_json(400, ["ok" => false, "error" => "Payload inválido."]);
        }

        with_lock(function () use ($body): void {
            $project = request_body_to_pimo($body);
            $id = trim((string)($project["id"] ?? ""));
            if ($id === "") {
                $id = generate_project_id();
            }
            $project["id"] = $id;
            $project["name"] = normalize_project_name((string)($project["name"] ?? ""), 1);
            $project["ownerId"] = trim((string)($project["ownerId"] ?? "usuario-local")) ?: "usuario-local";
            $project["ownerName"] = trim((string)($project["ownerName"] ?? $project["ownerId"])) ?: (string)$project["ownerId"];
            $now = gmdate("c");
            if (trim((string)($project["createdAt"] ?? "")) === "") {
                $project["createdAt"] = $now;
            }
            $project["updatedAt"] = $now;
            $project = ensure_pimo_shape($project);

            $targetFile = build_pimo_filename((string)$project["id"], (string)$project["name"]);
            $ok = file_put_contents($targetFile, json_encode($project, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            if ($ok === false) {
                throw new RuntimeException("Não foi possível escrever ficheiro do projeto.");
            }

            $allProjects = read_all_projects();
            $sequence = 1;
            foreach ($allProjects as $idx => $row) {
                if ((string)$row["id"] === (string)$project["id"]) {
                    $sequence = $idx + 1;
                    break;
                }
            }
            send_json(200, ["ok" => true, "project" => pimo_to_meta($project, $sequence)]);
        });
    }

    if ($method === "GET" && $projectId !== null) {
        $file = find_project_file_by_id($projectId);
        if ($file === null || !file_exists($file)) {
            send_json(404, ["ok" => false, "error" => "Projeto não encontrado."]);
        }
        $project = read_json_file($file, []);
        send_json(200, ["ok" => true, "project" => ensure_pimo_shape($project)]);
    }

    if ($method === "PUT" && $projectId !== null) {
        $body = read_request_body();
        $nextName = trim((string)($body["name"] ?? ""));
        if ($nextName === "") {
            send_json(400, ["ok" => false, "error" => "Nome inválido."]);
        }
        with_lock(function () use ($projectId, $nextName): void {
            $file = find_project_file_by_id($projectId);
            if ($file === null || !file_exists($file)) {
                send_json(404, ["ok" => false, "error" => "Projeto não encontrado."]);
            }
            $project = ensure_pimo_shape(read_json_file($file, []));
            $now = gmdate("c");
            $project["name"] = $nextName;
            $project["updatedAt"] = $now;
            $newFile = build_pimo_filename((string)$project["id"], (string)$project["name"]);
            $ok = file_put_contents($newFile, json_encode($project, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            if ($ok === false) {
                throw new RuntimeException("Falha ao atualizar projeto.");
            }
            if (realpath($newFile) !== realpath($file)) {
                @unlink($file);
            }

            $allProjects = read_all_projects();
            $sequence = 1;
            foreach ($allProjects as $idx => $row) {
                if ((string)$row["id"] === (string)$project["id"]) {
                    $sequence = $idx + 1;
                    break;
                }
            }
            send_json(200, ["ok" => true, "project" => pimo_to_meta($project, $sequence)]);
        });
    }

    if ($method === "DELETE" && $projectId !== null) {
        with_lock(function () use ($projectId): void {
            $file = find_project_file_by_id($projectId);
            if ($file === null || !file_exists($file)) {
                send_json(404, ["ok" => false, "error" => "Projeto não encontrado."]);
            }
            @unlink($file);
            send_json(200, ["ok" => true]);
        });
    }

    send_json(405, ["ok" => false, "error" => "Method not allowed"]);
} catch (Throwable $error) {
    send_json(500, [
        "ok" => false,
        "error" => "Falha interna ao processar projetos.",
        "details" => $error->getMessage(),
    ]);
}
