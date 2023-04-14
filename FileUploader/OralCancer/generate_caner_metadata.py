import os
import random
import string
import json
from datetime import datetime, timedelta
from pathlib import Path
import names
import sys

if len(sys.argv) != 2:
    print("Usage: python generate_metadata.py <directory_path>")
    sys.exit(1)
dir_path = sys.argv[1]

# Set up the list of possible lesion locations and labels
lesion_locations = ["Lips", "Tongue", "Gums", "Floor of the mouth", "Roof of the mouth", "Inner lining of the cheeks"]
labels = ["Squamous cell carcinoma", "Verrucous carcinoma", "Mucoepidermoid carcinoma", "Adenoid cystic carcinoma", "Acinic cell carcinoma", "Lymphoma", "Minor salivary gland carcinomas", "Melanoma"]
clinical_reports = [
    "Patient reports difficulty swallowing and a persistent sore in the mouth that does not heal.",
    "Patient presents with a lump or thickening in the cheek or neck.",
    "Patient reports pain or numbness in the tongue, lips, or other areas of the mouth.",
    "Oral examination reveals white or red patches on the gums, tongue, or lining of the mouth.",
    "Patient reports a chronic sore throat or hoarseness.",
    "Patient reports a persistent earache on one side.",
    "Patient reports unexplained weight loss and fatigue.",
    "Patient presents with a non-healing ulcer in the mouth.",
    "Patient reports difficulty moving the tongue or jaw.",
    "Patient reports a change in the fit of dentures.",
    "Oral examination reveals a growth or swelling in the mouth.",
    "Patient reports a metallic taste in the mouth.",
    "Patient presents with a persistent bad breath.",
    "Patient reports bleeding or pain in the mouth.",
    "Oral examination reveals a lump or mass in the mouth.",
    "Patient reports a feeling of something caught in the throat.",
    "Patient reports a burning sensation in the mouth or throat.",
    "Patient presents with a sore on the lip or in the mouth.",
    "Patient reports a white or red patch on the tongue.",
    "Patient reports difficulty opening the mouth.",
    "Patient reports a lump or swelling in the jaw.",
    "Oral examination reveals a lesion or ulcer in the mouth.",
    "Patient reports a persistent cough or sore throat.",
    "Patient reports a change in the way the teeth fit together.",
    "Patient presents with a lump or sore in the mouth that does not heal."
]

# Define a function to generate a random date
def random_date(start_date, end_date):
    delta = end_date - start_date
    delta_days = delta.days
    random_days = random.randrange(delta_days)
    return start_date + timedelta(days=random_days)

# Define a function to generate random clinical notes
def random_notes():
    num_notes = random.randint(1, 3)
    notes = random.sample(clinical_reports, num_notes)
    return " ".join(notes)

# Get a list of all image files in the current directory
images = list(Path(dir_path).glob("*.jpg")) + list(Path(dir_path).glob("*.png"))

# Create an empty dictionary to store metadata
metadata = {}

# Iterate over each image file and generate metadata
for image_file in images:
    # Generate random metadata values
    patient_id = names.get_full_name()
    image_type = image_file.suffix.split('.')[-1]
    image_date = random_date(datetime(2010, 1, 1), datetime.now())
    lesion_location = random.choice(lesion_locations)
    clinical_notes = random_notes()
    label = random.choice(labels)

    # Store metadata in a dictionary
    metadata[str(image_file).split('/')[-1]] = {
        "patient_id": patient_id,
        "image_type": image_type,
        "image_date": image_date.strftime('%Y-%m-%d'),
        "lesion_location": lesion_location,
        "clinical_notes": clinical_notes,
        "label": label
    }

# Write the metadata to a JSON file
with open("metadata.json", "w") as outfile:
    json.dump(metadata, outfile, indent=4)
