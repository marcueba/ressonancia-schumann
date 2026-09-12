import urllib.request
import json
import urllib.parse

def search_zenodo(query):
    encoded_query = urllib.parse.quote(query)
    url = f"https://zenodo.org/api/records?q={encoded_query}&size=10"
    
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data['hits']['hits']
    except Exception as e:
        print(f"Error querying Zenodo: {e}")
        return []

hits = search_zenodo('title:"Schumann resonance data processing programs"')
if not hits:
    hits = search_zenodo('title:"four-year measurements from Sierra Nevada ELF station"')
if not hits:
    hits = search_zenodo('"four-year measurements from Sierra Nevada ELF station"')

for hit in hits:
    print(f"Title: {hit['metadata']['title']}")
    print(f"DOI: {hit['metadata']['doi']}")
    print(f"License: {hit['metadata'].get('license', {}).get('id', 'N/A')}")
    print(f"Authors: {[a['name'] for a in hit['metadata']['creators']]}")
    print("Files:")
    for f in hit.get('files', []):
        print(f"  - {f['key']} ({f['size']} bytes) -> {f['links']['self']}")
    print("-" * 50)
