import urllib.request
import json

req1 = urllib.request.Request("http://localhost:5000/api/login",
                              data=json.dumps({"username": "admin", "password": "admin123"}).encode('utf-8'),
                              headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req1) as response:
    resp1 = json.loads(response.read().decode())
    token = resp1.get("access_token")

req2 = urllib.request.Request("http://localhost:5000/api/admin/kelurahan/update",
                              data=json.dumps({"id": 1, "elevasi": 2.5}).encode('utf-8'),
                              headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
try:
    with urllib.request.urlopen(req2) as response:
        print("Success:", response.read().decode())
except Exception as e:
    print("Error:", e.read().decode() if hasattr(e, 'read') else str(e))
