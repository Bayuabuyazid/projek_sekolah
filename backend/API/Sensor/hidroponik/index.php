<?php

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../../../config/koneksi.php";
try {
    $sql = "
        SELECT
            id,
            perangkat_id,
            tds_ppm,
            kedalaman_air,
            ph_air,
            kelembapan_tanah,
            waktu
        FROM data_sensor
        WHERE perangkat_id = :perangkat_id
        ORDER BY waktu DESC, id DESC
        LIMIT 20
    ";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        "perangkat_id" => 1
    ]);

    $data = $stmt->fetchAll();

    echo json_encode([
        "status" => "success",
        "jumlah_data" => count($data),
        "data" => $data
    ]);

} catch (PDOException $e) {
    http_response_code(500);

    echo json_encode([
        "status" => "error",
        "pesan" => "Gagal mengambil data sensor."
    ]);
}