import json
import paho.mqtt.client as mqtt
import mysql.connector

# Konfigurasi MQTT

MQTT_BROKER = "127.0.0.1"
MQTT_PORT = 1883
MQTT_USERNAME = "smexa"
MQTT_PASSWORD = "12345678"
TOPIK_SENSOR = "lab/sensor"

# Konfigurasi MySQL Laragon


def koneksi_database():
    return mysql.connector.connect(
        host="127.0.0.1",
        port=3306,
        user="root",
        password="bayu123",
        database="smexa_smart"
    )


# Dipanggil ketika terhubung ke MQTT

def saat_terhubung(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print("MQTT berhasil terhubung!")
        client.subscribe(TOPIK_SENSOR)
        print(f"Mendengarkan topik: {TOPIK_SENSOR}")
    else:
        print(f"Koneksi MQTT gagal: {reason_code}")


# Dipanggil ketika pesan sensor diterima

def saat_pesan(client, userdata, pesan):
    try:
        data = json.loads(pesan.payload.decode("utf-8"))

        # Validasi data wajib
        suhu_air = float(data["suhu_air"])
        ph_air = float(data["ph_air"])
        kedalaman_air = float(data["kedalaman_air"])

        if not all(map(lambda nilai: nilai == nilai and abs(nilai) != float("inf"),
                       [suhu_air, ph_air, kedalaman_air])):
            raise ValueError("Nilai sensor tidak valid.")

        # Simpan ke MySQL
        db = koneksi_database()
        cursor = None

        try:
            cursor = db.cursor()

            sql = """
                INSERT INTO data_sensor
                (perangkat_id, suhu_air, kedalaman_air, ph_air)
                VALUES (%s, %s, %s, %s)
            """

            cursor.execute(
                sql,
                (1, suhu_air, kedalaman_air, ph_air)
            )

            db.commit()

            print(
                f"Data tersimpan | "
                f"Suhu: {suhu_air} | "
                f"pH: {ph_air} | "
                f"Kedalaman: {kedalaman_air}"
            )

        finally:
            if cursor is not None:
                cursor.close()
            db.close()

    except (ValueError, KeyError, json.JSONDecodeError) as error:
        print(f"Data sensor tidak valid: {error}")

    except mysql.connector.Error as error:
        print(f"Kesalahan database: {error}")


# Jalankan receiver

client = mqtt.Client(
    callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
    client_id="smexa-windows-receiver"
)

client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
client.on_connect = saat_terhubung
client.on_message = saat_pesan

try:
    print("Menghubungkan receiver ke MQTT...")
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_forever()

except KeyboardInterrupt:
    print("\nReceiver dihentikan.")

except Exception as error:
    print(f"Receiver gagal berjalan: {error}")

finally:
    client.disconnect()
