import random
import json
import glob
import uuid
from datetime import datetime, timedelta

labels = ['potholes','normal']
metadata = []

# Define a function to generate a random date
def random_date(start_date, end_date):
    delta = end_date - start_date
    delta_days = delta.days
    random_days = random.randrange(delta_days)
    return start_date + timedelta(days=random_days)

for label in labels:
    images = glob.glob(f'images/{label}/*')
    for image in images:
        image = image.split('/')[-1]
        metadata.append({
            "image_id": uuid.uuid4().hex,
            "image_path": f'images/{label}/{image}',
            "image_type": 'jpg',
            "image_date": random_date(datetime(2018, 1, 1), datetime.now()).strftime('%Y-%m-%d'),
            "label": label
        })

with open('metadata.json', 'w') as f:
    json.dump(metadata, f, indent=4)
    
    
