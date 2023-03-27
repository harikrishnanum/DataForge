import os
import click
from minio import Minio
from minio.error import S3Error
import logging

logging.basicConfig(level=logging.INFO)

@click.command()
@click.option('--endpoint', default='192.168.1.189:9000', help='MinIO server endpoint URL')
@click.option('--access-key', default='minio', help='MinIO server access key')
@click.option('--secret-key', default='miniostorage', help='MinIO server secret key')
@click.option('--bucket', default='my-bucket', help='Name of the MinIO bucket to upload to')
@click.argument('file', type=click.Path(exists=True))
def upload_file(endpoint, access_key, secret_key, bucket, file):
    """Upload FILE to MinIO."""
    # Set up MinIO client
    client = Minio(
        endpoint,
        access_key=access_key,
        secret_key=secret_key,
        secure=False  # Set to True if using HTTPS
    )
    logging.info(f'Initialized MinIO client with endpoint {endpoint}.')
    # Upload file to MinIO
    try:
        # Ensure bucket exists
        found = client.bucket_exists(bucket)
        if not found:
            client.make_bucket(bucket)
        # Upload file to bucket
        client.fput_object(bucket, os.path.basename(file), file)
        click.echo(f"Successfully uploaded {file} to {bucket}")
    except S3Error as e:
        click.echo(f"Error uploading {file} to {bucket}: {e}")
        raise click.Abort()

if __name__ == '__main__':
    upload_file()
