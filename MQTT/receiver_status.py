import paho.mqtt.client as mqtt
import mysql.connector

# =====================================
# 1. KONFIGURASI MQTT
# =====================================

MQTT_BROKER = "127.0.0.1"
MQTT_PORT = 1883
MQTT_USERNAME = "smexa"
MQTT_PASSWORD = "12345678"

TOPIK_STATUS = "SMEXA/test/status"


# =====================================
# 2. KONFIGURASI DATABASE
# =====================================

def koneksi_database():
    return mysql.connector.connect(
        host="127.0.0.1",
        port=3306,
        user="root",
        password="bayu123",
        database="smexa_smart"
    )


# =====================================
# 3. KETIKA TERHUBUNG KE MQTT
# =====================================

def saat_terhubung(client, userdata, flags, reason_code, properties):

    if reason_code == 0:

        print("MQTT berhasil terhubung!")

        client.subscribe(TOPIK_STATUS)

        print(f"Mendengarkan topik: {TOPIK_STATUS}")

    else:

        print(f"Koneksi MQTT gagal: {reason_code}")


# =====================================
# 4. KETIKA STATUS ESP32 DITERIMA
# =====================================

def saat_pesan(client, userdata, pesan):

    db = None
    cursor = None

    try:

        # Membaca pesan dari ESP32
        status = pesan.payload.decode("utf-8").strip().upper()

        # Validasi status
        if status not in ["ON", "OFF"]:

            print(f"Status tidak valid: {status}")
            return

        print(f"Status diterima dari ESP32: {status}")

        # Koneksi database
        db = koneksi_database()
        cursor = db.cursor()

        # =====================================
        # 5. PERBARUI STATUS POMPA TERBARU
        # =====================================

        sql_status = """
            INSERT INTO status_perangkat
            (perangkat_id, status_pompa)
            VALUES (%s, %s)

            ON DUPLICATE KEY UPDATE
                status_pompa = VALUES(status_pompa),
                diperbarui_pada = CURRENT_TIMESTAMP
        """

        cursor.execute(sql_status, (1, status))

        # =====================================
        # 6. SIMPAN RIWAYAT POMPA
        # =====================================

        sql_riwayat = """
            INSERT INTO riwayat_pompa
            (perangkat_id, aktivitas, sumber, waktu)
            VALUES (%s, %s, %s, NOW())
        """

        cursor.execute(
            sql_riwayat,
            (1, status, "SISTEM")
        )

        # =====================================
        # 7. SIMPAN KE DATABASE
        # =====================================

        db.commit()

        print(
            f"Status berhasil diperbarui | "
            f"Perangkat: 1 | "
            f"Status: {status}"
        )

        print(
            f"Riwayat berhasil disimpan | "
            f"Aktivitas: {status} | "
            f"Sumber: ESP32"
        )

    except mysql.connector.Error as error:

        if db is not None and db.is_connected():
            db.rollback()

        print(f"Kesalahan database: {error}")

    except Exception as error:

        if db is not None and db.is_connected():
            db.rollback()

        print(f"Kesalahan receiver: {error}")

    finally:

        if cursor is not None:
            cursor.close()

        if db is not None and db.is_connected():
            db.close()


# =====================================
# 8. JALANKAN MQTT RECEIVER
# =====================================

client = mqtt.Client(
    callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
    client_id="smexa-status-receiver"
)

client.username_pw_set(
    MQTT_USERNAME,
    MQTT_PASSWORD
)

client.on_connect = saat_terhubung
client.on_message = saat_pesan


try:

    print("Menjalankan MQTT Status Receiver...")

    client.connect(MQTT_BROKER, MQTT_PORT, 60)

    client.loop_forever()

except KeyboardInterrupt:

    print("\nReceiver status dihentikan.")

except Exception as error:

    print(f"Receiver gagal berjalan: {error}")

finally:

    client.disconnect()