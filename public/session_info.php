<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_rol'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autenticado']);
    exit();
}

echo json_encode([
    'usuario' => $_SESSION['user_name'] ?? 'Usuario',
    'rol'     => trim($_SESSION['user_rol'])
]);