import os
import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("COSEC_BASE_URL", "").rstrip("/")
USERNAME = os.getenv("COSEC_USERNAME")
PASSWORD = os.getenv("COSEC_PASSWORD")

URL = f"{BASE_URL}/COSEC/api.svc/help"

print("=" * 70)
print("MATRIX COSEC API HELP TEST")
print("=" * 70)

print("URL:", URL)
print("Username:", USERNAME)
print()

try:
    response = requests.get(
        URL,
        auth=HTTPBasicAuth(USERNAME, PASSWORD),
        timeout=20
    )

    print("HTTP STATUS:", response.status_code)
    print("CONTENT TYPE:", response.headers.get("Content-Type"))
    print()

    print("=" * 70)
    print("API HELP RESPONSE")
    print("=" * 70)

    print(response.text[:30000])

    print()
    print("=" * 70)

    if response.status_code == 200:
        print("✅ API HELP SUCCESS")
        print("We can now identify the exact attendance API.")
    elif response.status_code == 401:
        print("❌ Authentication rejected.")
        print("Check COSEC username/password/API permissions.")
    else:
        print("⚠️ Unexpected response.")

except requests.exceptions.ConnectionError:
    print("❌ Cannot connect to COSEC.")

except requests.exceptions.Timeout:
    print("❌ Request timed out.")

except Exception as e:
    print("❌ Error:", e)