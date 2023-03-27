import names
import sys
import os
import random
import json
import glob

labels = ['Covid','Normal','Viral Pneumonia']
metadata = {}

for label in labels:
    images = glob.glob(f'./images/{label}/*')
    for image in images:
        image = image.split('/')[-1]
        metadata[image] = {}
        metadata[image]['labels'] = [label]
        metadata[image]['pulse'] = random.randint(60, 100)
        metadata[image]['blood pressure'] = f'{random.randint(90, 120)}/{random.randint(60, 80)}'
        metadata[image]['Blood oxygen saturation'] = random.randint(90, 100)
        metadata[image]['age'] = random.randint(0, 100)
        metadata[image]['name'] = names.get_full_name()
        metadata[image]['Date'] = f'{random.randint(1, 12)}/{random.randint(1, 28)}/{random.randint(2020, 2022)}'

with open('metadata.json', 'w') as f:
    json.dump(metadata, f, indent=4)
    
    
