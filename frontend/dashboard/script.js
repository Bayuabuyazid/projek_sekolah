const statusKoneksiHidroponik = document.getElementById("status-koneksi-hidroponik");
const sensorApiUrl = "../../backend/API/Sensor/hidroponik/index.php";
const batasDataTerbaruMs = 2 * 60 * 1000;
const intervalPemeriksaanMs = 15 * 1000;

function setStatusKoneksi(status) {
    const labelStatus = {
        checking: "Memeriksa...",
        connected: "Terhubung",
        disconnected: "Tidak terhubung",
        error: "Status tidak dapat diperiksa"
    };

    statusKoneksiHidroponik.textContent = labelStatus[status];
    statusKoneksiHidroponik.classList.toggle("is-checking", status === "checking");
    statusKoneksiHidroponik.classList.toggle("is-connected", status === "connected");
    statusKoneksiHidroponik.classList.toggle("is-disconnected", status === "disconnected");
    statusKoneksiHidroponik.classList.toggle("is-error", status === "error");
}

function parseWaktuSensor(value) {
    if (typeof value !== "string" || value.trim() === "") {
        return null;
    }

    const normalizedValue = value.includes(" ") && !value.includes("T")
        ? value.replace(" ", "T")
        : value;
    const waktu = new Date(normalizedValue);

    return Number.isNaN(waktu.getTime()) ? null : waktu;
}

async function periksaKoneksiHidroponik() {
    try {
        const response = await fetch(sensorApiUrl, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`API sensor merespons HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.status !== "success") {
            throw new Error("API sensor mengembalikan respons gagal.");
        }

        const dataTerbaru = Array.isArray(result.data) ? result.data[0] : result.data;
        if (!dataTerbaru) {
            setStatusKoneksi("disconnected");
            return;
        }

        const waktuDataTerakhir = parseWaktuSensor(dataTerbaru.waktu);
        if (!waktuDataTerakhir) {
            throw new Error("Data sensor terbaru tidak tersedia atau waktu datanya tidak valid.");
        }

        const umurDataMs = Date.now() - waktuDataTerakhir.getTime();
        const terhubung = umurDataMs >= -30 * 1000 && umurDataMs <= batasDataTerbaruMs;
        setStatusKoneksi(terhubung ? "connected" : "disconnected");
    } catch (error) {
        setStatusKoneksi("error");
        console.error("Gagal memeriksa koneksi alat Hidroponik:", error);
    }
}

setStatusKoneksi("checking");
void periksaKoneksiHidroponik();
setInterval(periksaKoneksiHidroponik, intervalPemeriksaanMs);
