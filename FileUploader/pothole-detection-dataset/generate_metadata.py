import random
import json
import glob

labels = ['potholes','normal']
metadata = {}

for label in labels:
    images = glob.glob(f'./images/{label}/*')
    for image in images:
        image = image.split('/')[-1]
        metadata[image] = {}
        metadata[image]['labels'] = [label]
        metadata[image]['Date'] = f'{random.randint(1, 12)}/{random.randint(1, 28)}/{random.randint(2020, 2022)}'

with open('metadata.json', 'w') as f:
    json.dump(metadata, f, indent=4)
    
    
