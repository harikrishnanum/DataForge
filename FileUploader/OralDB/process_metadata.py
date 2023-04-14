import json
import names 
import uuid
import random
from datetime import datetime, timedelta

# Define a function to generate a random date
def random_date(start_date, end_date):
    delta = end_date - start_date
    delta_days = delta.days
    random_days = random.randrange(delta_days)
    return start_date + timedelta(days=random_days)

metadata = []
label_file = 'dataset-labels.txt'

with open(label_file, 'r') as f:
    lines = f.readlines()
    labels = []
    for line in lines:
        line = line.strip()
        if line == '': 
            if len(labels) > 0 and filename != '':
                patient_name = names.get_full_name()
                image_type = 'jpg'
                image_date = random_date(datetime(2010, 1, 1), datetime.now())
                label = random.choice(labels)
                metadata.append({
                    "image_id": uuid.uuid4().hex,
                    "patient_name": patient_name,
                    "image_path": 'images/' + filename,
                    "image_type": image_type,
                    "image_date": image_date.strftime('%Y-%m-%d'),
                    "labels": labels 
                })
            labels = []
            filename = ''
        elif '.tif' in line:
            filename = line.split(':')[0]
            filename = filename.split('_mask')[0] + '.jpg'
        else:
            label = line.split()[0]
            labels.append(label)
        
with open('metadata.json', 'w') as f:
    json.dump(metadata, f, indent=4)