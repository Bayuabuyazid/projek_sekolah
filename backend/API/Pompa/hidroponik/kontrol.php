<?php

header("Content-Type: application/json; charset=utf-8");

try {
    // Membaca JSON dari website
    $raw = file_get_contents("php://input");
    $input = json_decode($raw, true);

    if (!is_array($input)) {
        http_response_code(400);

        echo json_encode([
            "status" => "error",
            "pesan" => "Format JSON tidak valid.",
            "detail" => json_last_error_msg()
        ]);

        exit;
    }

    // Validasi perintah
    $perintah = strtoupper(trim((string) ($input["perintah"] ?? "")));

    if (!in_array($perintah, ["ON", "OFF"], true)) {
        http_response_code(400);

        echo json_encode([
            "status" => "error",
            "pesan" => "Perintah harus ON atau OFF."
        ]);

        exit;
    }

    // Konfigurasi MQTT
    $topik = "SMEXA/test";
    $wsl = "C:\\Windows\\System32\\wsl.exe";

    $password = getenv("SMEXA_MQTT_PASSWORD") ?: "12345678";

    // Menyusun perintah MQTT
    $command = escapeshellarg($wsl)
        . " mosquitto_pub"
        . " -h 127.0.0.1"
        . " -p 1883"
        . " -u " . escapeshellarg("smexa")
        . " -P " . escapeshellarg($password)
        . " -t " . escapeshellarg($topik)
        . " -m " . escapeshellarg($perintah)
        . " 2>&1";

    // Mengirim perintah
    exec($command, $output, $hasil);

    if ($hasil !== 0) {
        error_log("MQTT error: " . implode("\n", $output));

        http_response_code(500);

        echo json_encode([
            "status" => "error",
            "pesan" => "Gagal mengirim perintah MQTT.",
            "detail" => implode("\n", $output)
        ]);

        exit;
    }

    // Respons API
    echo json_encode([
        "status" => "success",
        "pesan" => "Perintah berhasil dikirim ke MQTT.",
        "perintah" => $perintah,
        "topik" => $topik
    ]);

} catch (Throwable $e) {
    error_log("Kontrol pompa: " . $e->getMessage());

    http_response_code(500);

    echo json_encode([
        "status" => "error",
        "pesan" => "Terjadi kesalahan pada server."
    ]);
}