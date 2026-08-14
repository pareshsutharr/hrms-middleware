import os
import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("COSEC_BASE_URL", "").rstrip("/")
USERNAME = os.getenv("COSEC_USERNAME")
PASSWORD = os.getenv("COSEC_PASSWORD")

print("=" * 70)
print("        MATRIX COSEC CONNECTION & API TEST")
print("=" * 70)

print(f"\nCOSEC Server : {BASE_URL}")
print(f"Username     : {USERNAME}")
print()

session = requests.Session()
session.timeout = 15


# ============================================================
# 1. TEST BASIC CONNECTION
# ============================================================

print("[1] Testing COSEC server...")
print("-" * 70)

try:
    response = session.get(BASE_URL)

    print("HTTP Status :", response.status_code)
    print("Final URL   :", response.url)

    if response.status_code < 500:
        print("✅ COSEC server is reachable")
    else:
        print("⚠️ COSEC server returned an error")

except requests.exceptions.ConnectionError:
    print("❌ Cannot connect to COSEC")
    print()
    print("Make sure you are running this script on the")
    print("same company network where this URL opens:")
    print()
    print(f"{BASE_URL}/COSEC/Login")
    raise SystemExit(1)

except requests.exceptions.Timeout:
    print("❌ Connection timed out")
    raise SystemExit(1)

except Exception as e:
    print("❌ Error:", e)
    raise SystemExit(1)


# ============================================================
# 2. TEST COSEC LOGIN PAGE
# ============================================================

print("\n[2] Testing COSEC Login page...")
print("-" * 70)

login_url = f"{BASE_URL}/COSEC/Login"

try:
    response = session.get(login_url)

    print("HTTP Status :", response.status_code)
    print("Final URL   :", response.url)

    if response.ok:
        print("✅ Login page is reachable")
    else:
        print("⚠️ Login page returned an unexpected response")

except Exception as e:
    print("❌ Login page error:", e)


# ============================================================
# 3. TEST POSSIBLE API ENDPOINTS
# ============================================================

print("\n[3] Testing possible COSEC API endpoints...")
print("-" * 70)

api_paths = [
    "/COSEC/api.svc",
    "/COSEC/API.svc",
    "/cosec/api.svc",
    "/api.svc",
    "/API.svc",
    "/COSEC/WebAPI",
    "/COSEC/WebAPI/",
    "/COSEC/api",
    "/COSEC/API",
]

working_endpoints = []

for path in api_paths:

    url = BASE_URL + path

    try:
        response = session.get(url)

        print(
            f"{path:<25} "
            f"HTTP {response.status_code:<4} "
            f"Length={len(response.text)}"
        )

        # Anything other than 404 may be interesting
        if response.status_code != 404:
            working_endpoints.append(
                (path, response.status_code)
            )

    except requests.exceptions.RequestException as e:
        print(f"{path:<25} CONNECTION ERROR")


# ============================================================
# 4. TEST T&A EVENT API
# ============================================================

print("\n[4] Testing COSEC T&A Event API...")
print("-" * 70)

event_paths = [
    "/COSEC/api.svc/event-ta",
    "/cosec/api.svc/event-ta",
    "/api.svc/event-ta",
]

for path in event_paths:

    url = BASE_URL + path

    print(f"\nTesting: {url}")

    params = {
        "action": "get",
        "index": "0",
        "count": "5",
        "format": "xml",
    }

    try:

        response = session.get(
            url,
            params=params,
            auth=HTTPBasicAuth(
                USERNAME,
                PASSWORD
            ),
            timeout=15
        )

        print("HTTP Status:", response.status_code)
        print("Final URL  :", response.url)

        print("\nResponse:")
        print("-" * 70)

        # Print only first 5000 characters
        print(response.text[:5000])

        print("-" * 70)

        if response.status_code == 200:

            print("✅ Endpoint responded with HTTP 200")

        elif response.status_code == 401:

            print("⚠️ API exists but authentication was rejected")

        elif response.status_code == 403:

            print("⚠️ API exists but access is forbidden")

        elif response.status_code == 404:

            print("❌ Endpoint does not exist")

        else:

            print(
                f"⚠️ Endpoint responded with HTTP "
                f"{response.status_code}"
            )

    except requests.exceptions.ConnectionError:

        print("❌ Connection error")

    except requests.exceptions.Timeout:

        print("❌ Request timed out")

    except Exception as e:

        print("❌ Error:", e)


# ============================================================
# 5. SUMMARY
# ============================================================

print("\n")
print("=" * 70)
print("                         SUMMARY")
print("=" * 70)

if working_endpoints:

    print("\nPotential API endpoints found:")

    for path, status in working_endpoints:
        print(f"  {path} → HTTP {status}")

else:

    print("\nNo obvious API endpoint was detected.")

print()
print("IMPORTANT:")
print("This script only tests connectivity and API availability.")
print("It does NOT modify Matrix or Frappe data.")
print("It does NOT create attendance records.")
print()
print("Send the complete terminal output back for the next step.")
print("=" * 70)