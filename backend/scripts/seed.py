import subprocess, json

images = [
    ("natur-wald.jpg", "Wald im goldenen Licht", "natur", 91),
    ("architektur-stadt.jpg", "Stadtsilhouette bei Nacht", "architektur", 84),
    ("business-daten.jpg", "Datenvisualisierung Business", "business", 65),
    ("technologie-cyberpunk.jpg", "Cyberpunk Stadt bei Nacht", "technologie", 98),
    ("kreativ-neon.jpg", "Neon Kunstinstallation", "kreativ", 89),
    ("menschen-studenten.jpg", "Studenten beim Lernen", "menschen", 42),
]

for filename, title, category, score in images:
    payload = json.dumps({
        "filename": filename,
        "path": f"/uploads/{filename}",
        "title": title,
        "category": category,
        "score": score
    })
    result = subprocess.run([
        "curl", "-s", "-X", "POST", "http://localhost:3001/api/upload",
        "-H", "Content-Type: application/json",
        "-d", payload
    ], capture_output=True, text=True)
    print(f"{title}: {result.stdout}")
