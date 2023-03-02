import sys
import json

metadata_file = 'dataset-metadatas.rxt'
label_file = 'dataset-labels.txt'

metadata = {}
with open(metadata_file, 'r') as f:
    lines = f.readlines()
lines = [line.strip() for line in lines]
lines = [line for line in lines if line != '']
    
for line in lines:
    if '.tif' in line: 
        filename = line.split(':')[0].replace('.tif', '.jpg')
        metadata[filename] = {}
    elif 'Spectral camera' in line:
        metadata[filename]['Spectral camera'] = line.split(':')[1]
    elif 'Illumination' in line:
        metadata[filename]['Illumination'] = line.split(':')[1]
    elif 'Objective lens' in line:
        metadata[filename]['Objective lens'] = line.split(':')[1]
    elif 'Aperture' in line:
        metadata[filename]['Aperture'] = line.split(':')[1]
    elif 'Reference sample used' in line:
        metadata[filename]['Reference sample used'] = line.split(':')[1]
    elif 'Blood pressure and pulse' in line:
        metadata[filename]['Blood pressure and pulse'] = line.split(':')[1]
    elif 'Blood oxygen saturation' in line:
        metadata[filename]['Blood oxygen saturation'] = line.split(':')[1]

with open(label_file, 'r') as f:
    lines = f.readlines()
lines = [line.strip() for line in lines]
lines = [line for line in lines if line != '']

for line in lines:
    if '.tif' in line:
        filename = line.split(':')[0]
        filename = filename.split('_mask')[0] + '.jpg'
        metadata[filename]['labels'] = []
    else:
        label = line.split()[0]
        metadata[filename]['labels'].append(label)
    
with open('metadata.json', 'w') as f:
    json.dump(metadata, f, indent=4)