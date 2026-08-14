import os
import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("COSEC_BASE_URL").rstrip("/")
USERNAME = os.getenv("COSEC_USERNAME")
PASSWORD = os.getenv("COSEC_PASSWORD")

session = requests.Session()
session.auth = HTTPBasicAuth(USERNAME, PASSWORD)
session.timeout = 20

paths = [
    "/COSEC/api.svc/help/V2DataTransfer/request/schema",
    "/COSEC/api.svc/help/V2DataTransfer/request/example",
    "/COSEC/api.svc/help/V2DataTransfer/response/schema",
    "/COSEC/api.svc/help/V2DataTransfer/response/example",
]

for path in paths:
    url = BASE_URL + path

    print("\n" + "=" * 80)
    print(url)
    print("=" * 80)

    try:
        r = session.get(url)

        print("HTTP:", r.status_code)
        print("Content-Type:", r.headers.get("Content-Type"))
        print()
        print(r.text[:30000])

    except Exception as e:
        print("ERROR:", e)