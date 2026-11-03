<?php

header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . "/../../../config/koneksi.php";

try {

    $query = "
        SELECT
            status_pompa,
            diperbarui_pada
        FROM status_perangkat
        WHERE perangkat_id = 2
        LIMIT 1
    ";

    $stmt = $pdo->query($query);

    $data = $stmt->fetch();

    echo json_encode([
        "status" => "success",
        "pesan" => $data
            ? "Status pompa taman berhasil diambil."
            : "Status pompa taman belum tersedia.",
        "data" => $data ?: null
    ], JSON_PRETTY_PRINT);

} catch (PDOException $e) {

    error_log(
        "Gagal mengambil status pompa taman: " . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        "status" => "error",
        "pesan" => "Terjadi kesalahan saat mengambil status pompa taman."
    ]);
}
 