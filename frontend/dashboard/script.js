// ==================================================
// KONFIGURASI API SMEXA SMART
// ==================================================

const posisiFrontend = window.location.pathname.indexOf("/frontend/");

const basePath = posisiFrontend !== -1
    ? window.location.pathname.slice(0, posisiFrontend)
    : "/SMEXA-smart";

const API_POMPA =
    `${basePath}/backend/API/Pompa/hidroponik/index.php`;

const API_SENSOR =
    `${basePath}/backend/API/Sensor/hidroponik/index.php`;

const INTERVAL_UPDATE = 2000;
const BATAS_DATA_SENSOR = 2 * 60 * 1000;

let sedangMemuat = false;


// ==================================================
// FUNGSI DASAR
// ==================================================

function tampilkan(id, nilai) {
    const elemen = document.getElementById(id);

    if (elemen) {
        elemen.textContent = nilai;
    }
}


async function ambilAPI(url) {
    const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: {
            "Accept": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }

    const teks = await response.text();

    let result;

    try {
        result = JSON.parse(teks);
    } catch {
        throw new Error(
            `Respons bukan JSON: ${teks.slice(0, 150)}`
        );
    }

    if (result.status !== "success") {
        throw new Error(
            result.pesan || "API gagal mengambil data."
        );
    }

    return result;
}


// ==================================================
// STATUS KONEKSI ESP32
// ==================================================

function setStatusKoneksi(status) {

    const elemen = document.getElementById(
        "status-koneksi-hidroponik"
    );

    if (!elemen) return;

    const label = {
        checking: "Memeriksa...",
        connected: "Terhubung",
        disconnected: "Tidak terhubung",
        error: "Tidak dapat diperiksa"
    };

    elemen.textContent = label[status];

    elemen.classList.toggle(
        "is-checking",
        status === "checking"
    );

    elemen.classList.toggle(
        "is-connected",
        status === "connected"
    );

    elemen.classList.toggle(
        "is-disconnected",
        status === "disconnected"
    );

    elemen.classList.toggle(
        "is-error",
        status === "error"
    );
}


// ==================================================
// MEMBACA WAKTU SENSOR
// ==================================================

function parseWaktu(value) {

    if (typeof value === "number") {
        const waktu = new Date(
            value < 1000000000000 ? value * 1000 : value
        );

        return Number.isNaN(waktu.getTime()) ? null : waktu;
    }

    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    const normalisasi = value.trim().replace(" ", "T");

    const waktu = new Date(normalisasi);

    return Number.isNaN(waktu.getTime()) ? null : waktu;
}


function ambilWaktu(data) {

    const kandidat = [
        "waktu",
        "diperbarui_pada",
        "waktu_data",
        "timestamp",
        "created_at",
        "updated_at",
        "tanggal"
    ];

    for (const key of kandidat) {
        if (data[key] !== undefined && data[key] !== null) {
            return parseWaktu(data[key]);
        }
    }

    return null;
}


// ==================================================
// MEMBACA DATA SENSOR
// ==================================================

function ambilRecordSensor(result) {

    let data = result.data;

    for (let i = 0; i < 4; i++) {

        if (Array.isArray(data)) {

            if (data.length === 0) return null;

            const recordDenganWaktu = data
                .map(item => ({
                    item,
                    waktu: ambilWaktu(item)
                }))
                .filter(item => item.waktu !== null);

            if (recordDenganWaktu.length > 0) {

                recordDenganWaktu.sort(
                    (a, b) => b.waktu - a.waktu
                );

                return recordDenganWaktu[0].item;
            }

            return data[0];
        }

        if (!data || typeof data !== "object") {
            return null;
        }

        const nested =
            data.data_sensor ??
            data.sensor_terbaru ??
            data.terbaru ??
            data.latest ??
            data.sensor ??
            data.data;

        if (nested === undefined) {
            return data;
        }

        data = nested;
    }

    return data && typeof data === "object" ? data : null;
}


// Mengambil nilai berdasarkan beberapa kemungkinan nama kolom.
function ambilNilai(data, daftarKey) {

    if (!data) return null;

    for (const key of daftarKey) {

        if (data[key] !== undefined && data[key] !== null) {
            return data[key];
        }
    }

    return null;
}


// ==================================================
// MENAMPILKAN STATUS POMPA
// ==================================================

function tampilkanPompa(result) {

    const data = result.data;

    const status = ambilNilai(data, [
        "status_pompa",
        "status",
        "relay_status"
    ]);

    if (status === null) {
        tampilkan("status-hidroponik", "Data tidak tersedia");
        return;
    }

    const nilai = String(status).trim().toUpperCase();

    if (["ON", "1", "TRUE"].includes(nilai)) {
        tampilkan("status-hidroponik", "ON");
    } else if (["OFF", "0", "FALSE"].includes(nilai)) {
        tampilkan("status-hidroponik", "OFF");
    } else {
        tampilkan("status-hidroponik", status);
    }
}


// ==================================================
// MENAMPILKAN DATA SENSOR
// ==================================================

function tampilkanSensor(result) {

    const data = ambilRecordSensor(result);

    console.log("Data sensor dari API:", result);

    if (!data) {

        tampilkan("tds-air", "Data tidak tersedia");
        tampilkan("kedalaman-air", "Data tidak tersedia");
        tampilkan("ph-air", "Data tidak tersedia");

        setStatusKoneksi("disconnected");

        return;
    }

    // TDS AIR
    const tds = ambilNilai(data, [
        "tds_ppm",
        "tds"
    ]);

    tampilkan(
        "tds-air",
        tds !== null ? `${tds} PPM` : "Data tidak tersedia"
    );


    // KEDALAMAN AIR
    const kedalaman = ambilNilai(data, [
        "kedalaman_air",
        "kedalaman",
        "ketinggian_air",
        "level_air",
        "water_level"
    ]);

    tampilkan(
        "kedalaman-air",
        kedalaman !== null ? `${kedalaman} cm` : "Data tidak tersedia"
    );


    // PH AIR
    const ph = ambilNilai(data, [
        "ph_air",
        "ph",
        "nilai_ph"
    ]);

    tampilkan(
        "ph-air",
        ph !== null ? ph : "Data tidak tersedia"
    );


    // STATUS KONEKSI BERDASARKAN UMUR DATA SENSOR
    const waktuTerakhir = ambilWaktu(data);

    if (!waktuTerakhir) {

        setStatusKoneksi("error");

        console.warn(
            "Timestamp sensor tidak ditemukan."
        );

        return;
    }

    const umurData = Date.now() - waktuTerakhir.getTime();

    const terhubung =
        umurData >= -30000 &&
        umurData <= BATAS_DATA_SENSOR;

    setStatusKoneksi(
        terhubung ? "connected" : "disconnected"
    );

    console.log(
        "Status koneksi ESP32:",
        terhubung ? "Terhubung" : "Tidak terhubung",
        "| Waktu data:",
        waktuTerakhir.toLocaleString("id-ID")
    );
}


// ==================================================
// MEMPERBARUI DASHBOARD
// ==================================================

async function perbaruiDashboard() {

    if (sedangMemuat) return;

    sedangMemuat = true;

    try {

        // Mengambil API Pompa dan Sensor secara bersamaan.
        const hasil = await Promise.allSettled([
            ambilAPI(API_POMPA),
            ambilAPI(API_SENSOR)
        ]);


        // HASIL API POMPA
        if (hasil[0].status === "fulfilled") {

            tampilkanPompa(hasil[0].value);

        } else {

            tampilkan(
                "status-hidroponik",
                "Gagal memuat"
            );

            console.error(
                "API Pompa gagal:",
                hasil[0].reason
            );
        }


        // HASIL API SENSOR
        if (hasil[1].status === "fulfilled") {

            tampilkanSensor(hasil[1].value);

        } else {

            tampilkan("tds-air", "Gagal memuat");
            tampilkan("kedalaman-air", "Gagal memuat");
            tampilkan("ph-air", "Gagal memuat");

            setStatusKoneksi("error");

            console.error(
                "API Sensor gagal:",
                hasil[1].reason
            );
        }

    } finally {

        sedangMemuat = false;

    }
}


// ==================================================
// MULAI DASHBOARD
// ==================================================

setStatusKoneksi("checking");

void perbaruiDashboard();

setInterval(
    perbaruiDashboard,
    INTERVAL_UPDATE
);