import sys
import os
import time

if len(sys.argv) != 3:
    print('Usage: python compress_tiff.py <path to dataset> <path to compressed dataset')
    sys.exit(1)

from PIL import Image
dataset = sys.argv[1]
compressed_path = sys.argv[2]

if not os.path.exists(compressed_path):
    os.mkdir(compressed_path)

start = time.time()
# for each file in dataset folder compress it and save it in compressed folder
for file in os.listdir(dataset):
    if 'mask' in file: # ignore mask files
        continue
    if file.endswith(".tif"):
        tiff_file = Image.open(os.path.join(dataset, file))
        filename = os.path.splitext(file)[0] + '.jpg'
        tiff_file.save(os.path.join(compressed_path, filename), 'JPEG', quality=80)
end = time.time()
print('Time taken to compress all tiff files: ', end - start)
