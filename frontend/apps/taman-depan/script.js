const tombolPenyiraman = document.getElementById("tombol-pompa");
const statusPenyiraman = document.getElementById("status-pompa");

let penyiramanAktif = false;

tombolPenyiraman.addEventListener("click", function () {
    penyiramanAktif = !penyiramanAktif;

    statusPenyiraman.textContent = penyiramanAktif ? "ON" : "OFF";
    tombolPenyiraman.textContent = penyiramanAktif
        ? "MATIKAN PENYIRAMAN"
        : "NYALAKAN PENYIRAMAN";
    statusPenyiraman.style.color = penyiramanAktif ? "#15803d" : "#dc2626";
    statusPenyiraman.style.backgroundColor = penyiramanAktif ? "#dcfce7" : "#fef2f2";
});
