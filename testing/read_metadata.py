import json
import sys
metadata_path = sys.argv[1]
with open(metadata_path, 'r') as f:
    metadata = json.load(f)
print(type(metadata))
for key, value in metadata.items():
    print(f'{key}={value}')
    break