// ========================================
// 1. ELEMENT HTML
// ========================================

const tombolPompa = document.getElementById("tombol-pompa");
const statusPompa = document.getElementById("status-pompa");

let statusPompaSaatIni = null;
let sedangMengirim = false;
let sedangAmbilStatus = false;


// ========================================
// 2. ALAMAT API
// ========================================

const API_POMPA =
    "http://localhost/SMEXA-smart/backend/API/Pompa/hidroponik/index.php";

const API_SENSOR =
    "http://localhost/SMEXA-smart/backend/API/Sensor/hidroponik/index.php";

const API_KONTROL =
    "http://localhost/SMEXA-smart/backend/API/Pompa/hidroponik/kontrol.php";


// ========================================
// 3. TAMPILAN STATUS POMPA
// ========================================

function perbaruiTampilanPompa(status) {

    if (!tombolPompa || !statusPompa) return;

    statusPompaSaatIni = status;
    statusPompa.textContent = status;

    if (status === "ON") {

        tombolPompa.textContent = "MATIKAN POMPA";

        statusPompa.style.color = "#15803d";
        statusPompa.style.backgroundColor = "#dcfce7";

    } else {

        tombolPompa.textContent = "NYALAKAN POMPA";

        statusPompa.style.color = "#dc2626";
        statusPompa.style.backgroundColor = "#fef2f2";

    }
}


// ========================================
// 4. AMBIL JSON
// ========================================

async function ambilJSON(url, options = {}) {

    const response = await fetch(url, options);

    let hasil;

    try {
        hasil = await response.json();
    } catch {
        throw new Error("Respons API bukan JSON yang valid.");
    }

    if (!response.ok || hasil.status !== "success") {

        throw new Error(
            hasil.pesan ||
            hasil.message ||
            `HTTP Error ${response.status}`
        );

    }

    return hasil;
}


// ========================================
// 5. BACA STATUS DARI DATABASE
// ========================================

async function bacaStatusPompaDariAPI() {

    const hasil = await ambilJSON(API_POMPA);

    const status = hasil.data?.status_pompa;

    if (status !== "ON" && status !== "OFF") {
        throw new Error("Status pompa tidak valid.");
    }

    return status;
}


async function ambilStatusPompa() {

    if (sedangMengirim || sedangAmbilStatus) return;

    sedangAmbilStatus = true;

    try {

        const status = await bacaStatusPompaDariAPI();

        if (!sedangMengirim) {
            perbaruiTampilanPompa(status);
        }

        console.log("Status database:", status);

    } catch (error) {

        console.error("Gagal mengambil status pompa:", error);

    } finally {

        sedangAmbilStatus = false;

    }

}


// ========================================
// 6. AMBIL DATA SENSOR
// ========================================

async function ambilDataSensor() {

    try {

        const hasil = await ambilJSON(API_SENSOR);

        const data = Array.isArray(hasil.data)
            ? hasil.data[0]
            : hasil.data;

        if (!data) {
            throw new Error("Data sensor tidak tersedia.");
        }

        const tdsAir = document.getElementById("tds-air");
        const kedalamanAir = document.getElementById("kedalaman-air");
        const phAir = document.getElementById("ph-air");

        if (tdsAir) {
            tdsAir.textContent = data.tds_ppm ?? "—";
        }

        if (kedalamanAir) {
            kedalamanAir.textContent = data.kedalaman_air ?? "—";
        }

        if (phAir) {
            phAir.textContent = data.ph_air ?? "—";
        }

        console.log("Data sensor:", data);

    } catch (error) {

        console.error("Gagal mengambil data sensor:", error);

    }

}


// ========================================
// 7. TUNGGU KONFIRMASI DARI DATABASE
// ========================================

async function tungguKonfirmasiStatus(target, batasWaktu = 10000) {

    const waktuMulai = Date.now();

    while (Date.now() - waktuMulai < batasWaktu) {

        try {

            const status = await bacaStatusPompaDariAPI();

            perbaruiTampilanPompa(status);

            console.log("Status dari database:", status);

            if (status === target) {
                return true;
            }

        } catch (error) {

            console.warn("Menunggu pembaruan database:", error);

        }

        await new Promise(resolve => setTimeout(resolve, 500));

    }

    return false;

}


// ========================================
// 8. KIRIM PERINTAH POMPA
// ========================================

async function kirimPerintahPompa() {

    if (!tombolPompa || sedangMengirim) return;

    if (statusPompaSaatIni !== "ON" &&
        statusPompaSaatIni !== "OFF") {

        console.error("Status pompa belum diketahui.");
        return;

    }

    const perintah =
        statusPompaSaatIni === "ON" ? "OFF" : "ON";

    try {

        sedangMengirim = true;
        tombolPompa.disabled = true;

        console.log("Mengirim perintah:", perintah);

        const hasil = await ambilJSON(API_KONTROL, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                perintah: perintah
            })

        });

        console.log("Respons backend:", hasil);

        if (hasil.perintah !== perintah) {
            throw new Error("Perintah backend tidak sesuai.");
        }

        // Tunggu status aktual masuk ke database
        const terkonfirmasi =
            await tungguKonfirmasiStatus(perintah);

        if (terkonfirmasi) {

            console.log(
                "Status pompa terkonfirmasi:",
                perintah
            );

        } else {

            console.warn("Database belum mengonfirmasi status pompa.");

            alert(
                "Perintah sudah dikirim, tetapi status terbaru belum diterima database."
            );

        }

    } catch (error) {

        console.error("Gagal mengendalikan pompa:", error);

        alert("Gagal mengirim perintah: " + error.message);

    } finally {

        sedangMengirim = false;
        tombolPompa.disabled = false;

    }

}


// ========================================
// 9. JALANKAN DASHBOARD
// ========================================

async function jalankanDashboard() {

    if (!tombolPompa || !statusPompa) {
        console.error("Elemen kontrol pompa tidak ditemukan.");
        return;
    }

    // Nonaktifkan tombol selama mengambil status awal
    tombolPompa.disabled = true;

    tombolPompa.addEventListener(
        "click",
        kirimPerintahPompa
    );

    await ambilStatusPompa();

    if (statusPompaSaatIni !== null) {
        tombolPompa.disabled = false;
    }

    ambilDataSensor();

    // Perbarui status aktual setiap 3 detik
    setInterval(ambilStatusPompa, 3000);

    // Perbarui sensor setiap 5 detik
    setInterval(ambilDataSensor, 5000);

}

jalankanDashboard();