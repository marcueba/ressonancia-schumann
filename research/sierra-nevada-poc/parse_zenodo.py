import urllib.request
import json
import urllib.parse
import os

os.makedirs('research/sierra-nevada-poc', exist_ok=True)

try:
    url = "https://zenodo.org/api/records/6348690"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        record = json.loads(response.read().decode('utf-8'))
        
        print(f"Title: {record['metadata']['title']}")
        print(f"DOI: {record['metadata']['doi']}")
        print(f"Authors: {[c['name'] for c in record['metadata']['creators']]}")
        print(f"License: {record['metadata']['license']['id']}")
        
        files = record.get('files', [])
        print("\nFiles available:")
        for f in files:
            print(f"- {f['key']} ({f['size']} bytes) -> {f['links']['self']}")
            
        # Download the first smallest file if it's data
        if files:
            target_file = min(files, key=lambda x: x['size'])
            download_url = target_file['links']['self']
            filename = f"research/sierra-nevada-poc/{target_file['key']}"
            print(f"\nDownloading {target_file['key']} to {filename}...")
            
            urllib.request.urlretrieve(download_url, filename)
            print("Download complete.")
except Exception as e:
    print(f"Error: {e}")
