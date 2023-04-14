import random
import json
import glob
from datetime import datetime, timedelta
import uuid

metadata = []

# Define a function to generate a random date
def random_date(start_date, end_date):
    delta = end_date - start_date
    delta_days = delta.days
    random_days = random.randrange(delta_days)
    return start_date + timedelta(days=random_days)

images = glob.glob(f'./images/potholes/*')
for image in images:
    image = image.split('/')[-1]
    metadata.append({
    "image_id": uuid.uuid4().hex,
    "image_path": f'images/potholes/{image}',
    "image_type": 'jpg',
    "image_date": random_date(datetime(2018, 1, 1), datetime.now()).strftime('%Y-%m-%d'),
    "label": 'potholes'
})

with open('metadata.json', 'w') as f:
    json.dump(metadata, f, indent=4)
    
    
