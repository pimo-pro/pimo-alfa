<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$scope = $_GET['scope'] ?? 'mine';
$ownerId = $_GET['ownerId'] ?? null;

$response = [
    "status" => "ok",
    "scope" => $scope,
    "ownerId" => $ownerId,
    "projects" => []
];

header("Content-Type: application/json");
echo json_encode($response);
