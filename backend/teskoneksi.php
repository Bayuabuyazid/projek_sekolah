<?php

require_once __DIR__ . "/config/koneksi.php";

header("Content-Type: application/json; charset=utf-8");

echo json_encode([
    "status" => "success",
    "pesan" => "Koneksi database Hidroponik berhasil."
]);

