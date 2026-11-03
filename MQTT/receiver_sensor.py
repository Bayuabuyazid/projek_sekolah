import json
import math
import paho.mqtt.client as mqtt
import mysql.connector

# ================= KONFIGURASI MQTT =================

MQTT_BROKER = "127.0.0.1"
MQTT_PORT = 1883
MQTT_USERNAME = "smexa"
MQTT_PASSWORD = "12345678"

TOPIK_SENSOR = "lab/sensor"


# ================= KONFIGURASI DATABASE =================

def koneksi_database():
    return mysql.connector.connect(
        host="127.0.0.1",
        port=3306,
        user="root",
        password="bayu123",
        database="smexa_smart"
    )


# ================= KONEKSI MQTT =================

def saat_terhubung(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print("MQTT berhasil terhubung!")
        client.subscribe(TOPIK_SENSOR)
        print(f"Mendengarkan topik: {TOPIK_SENSOR}")
    else:
        print(f"Koneksi MQTT gagal: {reason_code}")


# ================= MENERIMA DATA TDS =================

def saat_pesan(client, userdata, pesan):

    db = None
    cursor = None

    try:
        # Membaca JSON dari ESP32
        data = json.loads(pesan.payload.decode("utf-8"))

        # Mengambil nilai TDS
        tds_ppm = float(data["tds_ppm"])

        # Validasi nilai
        if not math.isfinite(tds_ppm) or tds_ppm < 0:
            raise ValueError("Nilai TDS tidak valid.")

        # Membuka koneksi database
        db = koneksi_database()
        cursor = db.cursor()

        # Menyimpan TDS ke MySQL
        sql = """
            INSERT INTO data_sensor
            (perangkat_id, tds_ppm)
            VALUES (%s, %s)
        """

        cursor.execute(
            sql,
            (1, round(tds_ppm, 2))
        )

        db.commit()

        print(
            f"TDS BERHASIL DISIMPAN | "
            f"Nilai: {tds_ppm:.2f} PPM"
        )

    except (ValueError, KeyError, json.JSONDecodeError) as error:
        print(f"Data TDS tidak valid: {error}")

    except mysql.connector.Error as error:
        print(f"Kesalahan database: {error}")

        if db is not None:
            db.rollback()

    finally:
        if cursor is not None:
            cursor.close()

        if db is not None and db.is_connected():
            db.close()


# ================= MENJALANKAN RECEIVER =================

client = mqtt.Client(
    callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
    client_id="smexa-windows-receiver"
)

client.username_pw_set(
    MQTT_USERNAME,
    MQTT_PASSWORD
)

client.on_connect = saat_terhubung
client.on_message = saat_pesan

try:
    print("Menghubungkan receiver ke MQTT...")

    client.connect(
        MQTT_BROKER,
        MQTT_PORT,
        60
    )

    client.loop_forever()

except KeyboardInterrupt:
    print("\nReceiver dihentikan.")

except Exception as error:
    print(f"Receiver gagal berjalan: {error}")

finally:
    client.disconnect()