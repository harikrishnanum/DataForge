import os
import click
from PIL import Image
from tqdm import tqdm

@click.command()
@click.argument('dataset_path', type=click.Path(exists=True))
@click.argument('compressed_path', type=click.Path())
@click.option('--quality', type=int, default=75, help='JPEG compression quality (default=75)')
def image_compressor(dataset_path, compressed_path, quality):
    os.makedirs(compressed_path, exist_ok=True)
    # for each file in dataset folder compress it and save it in compressed folder
    for file in tqdm(os.listdir(dataset_path), desc='Compressing images'):
        tqdm.write(f'Compressing {file}')
        img_file = Image.open(os.path.join(dataset_path, file))
        filename = os.path.splitext(file)[0] + '.jpg'
        img_file.convert('RGB').save(os.path.join(compressed_path, filename), 'JPEG', quality=quality)

if __name__ == '__main__':
    image_compressor()
