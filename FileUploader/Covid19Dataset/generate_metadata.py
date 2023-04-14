import names
import sys
import os
import random
import json
import glob
import uuid
from datetime import datetime, timedelta

# Define a function to generate a random date
def random_date(start_date, end_date):
    delta = end_date - start_date
    delta_days = delta.days
    random_days = random.randrange(delta_days)
    return start_date + timedelta(days=random_days)

labels = ['Covid','Normal','Viral Pneumonia']
metadata = []

for label in labels:
    images = glob.glob(f'./images/{label}/*')
    for image in images:
        image = image.split('/')[-1]
        metadata.append({
            "patient_name": names.get_full_name(),
            "image_id": uuid.uuid4().hex,
            "image_path": f'images/{label}/{image}',
            "image_type": 'jpg',
            "label": label,
            "pulse": random.randint(60, 100),
            "blood pressure": f'{random.randint(90, 120)}/{random.randint(60, 80)}',
            "Blood oxygen saturation": random.randint(90, 100),
            "image_date": random_date(datetime(2020, 1, 1), datetime.now()).strftime('%Y-%m-%d')
        })

with open('metadata.json', 'w') as f:
    json.dump(metadata, f, indent=4)
    
    
