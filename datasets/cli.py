import os
import json
import click
from minio import Minio
import pika
from pymongo import MongoClient
import glob
import logging
from tqdm import tqdm
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, filename='cli.log', filemode='w')

@click.command()
@click.option('--dir_path', type=click.Path(exists=True), required=True, help='The path to the directory containing the dataset.')
@click.option('--metadatafile', default='metadata.json', help='The name of the metadata file.')
@click.option('--img_format', default='jpg', help='The image format of the dataset.')
@click.option('--bucket', default='', help='The bucket to upload the file to.')
@click.option('--endpoint', default=os.getenv('MINIO_ENDPOINT'), help='The MinIO server endpoint.')
@click.option('--access-key', default=os.getenv('MINIO_ACCESS_KEY'), help='The access key for the MinIO server.')
@click.option('--secret-key', default=os.getenv('MINIO_SECRET_KEY'), help='The secret key for the MinIO server.')
@click.option('--queue', default=os.getenv('RM_QUEUE'), help='The RabbitMQ queue name to send the metadata to.')
@click.option('--host', default=os.getenv('RM_HOST'), help='The RabbitMQ server hostname.')
@click.option('--port', default=os.getenv('RM_PORT'), help='The RabbitMQ server port.')
@click.option('--username', default=os.getenv('RM_USERNAME'), help='The RabbitMQ server username.')
@click.option('--password', default=os.getenv('RM_PASSWORD'), help='The RabbitMQ server password.')
@click.option('--mongo-uri', default=os.getenv('MONGO_URI'), help='The MongoDB server URI.')
@click.option('--mongo-db', default=os.getenv('MONGO_DB'), help='The name of the MongoDB database.')
@click.option('--mongo-collection', default=os.getenv('MONGO_COLLECTION'), help='The name of the MongoDB collection.')
def upload_dataset(dir_path, metadatafile, img_format, bucket, endpoint, access_key, secret_key, queue, host, port, username, password, mongo_uri, mongo_db, mongo_collection):
    """Upload a dataset to MinIO and write its metadata to RabbitMQ, and create a MongoDB document for the dataset."""
    
    metadatafile = os.path.join(dir_path, metadatafile)
    if not os.path.exists(metadatafile):
        click.echo(f'Error: metadata file {metadatafile} does not exist.')
        return
    metadata = json.load(open(metadatafile))
    indexing_metadata = {}
    indexing_metadata['files'] = []
    if not bucket:
        # Use the parent directory name of the directory as the bucket name
        if '/' in dir_path:
            bucket = dir_path.split('/')[-1]
        else:
            bucket = dir_path
        bucket = bucket.lower()
    
    # Initialize MinIO client
    client = Minio(endpoint=endpoint, access_key=access_key, secret_key=secret_key, secure=False)
    logging.info(f'Initialized MinIO client with endpoint {endpoint}.')
    
    # Upload file to MinIO
    try:
        if client.bucket_exists(bucket):
            click.echo(f'Bucket {bucket} already exists on MinIO server.')
        else:
            logging.info(f'Creating bucket {bucket} on MinIO server.')
            client.make_bucket(bucket)
            click.echo(f'Bucket {bucket} created on MinIO server.')

        # loop through all files in the directory
        logging.info(f'Uploading files in {dir_path} to bucket {bucket} on MinIO server.')
        for file_path in tqdm(glob.glob(f'{dir_path}/**/*.{img_format}', recursive=True), desc='Uploading files to MinIO server'):
            if img_format not in file_path:
                continue
            with open(file_path, 'rb') as f:
                file_name = os.path.basename(file_path)
                logging.info(f'Uploading {file_path} to {bucket} on MinIO server.')
                client.put_object(bucket, file_path, f, length=os.fstat(f.fileno()).st_size)
                logging.info(f'Successfully uploaded {file_path} to {bucket} on MinIO server.')
                if file_name not in metadata:
                    continue
                file_details = metadata[file_name]
                file_details['name'] = file_name
                file_details['bucket'] = bucket
                file_details['path'] = file_path
                indexing_metadata['files'].append(file_details)
        indexing_metadata['dataset_name'] = bucket

        click.echo(f'Successfully uploaded {dir_path} to {bucket} on MinIO server.')
            
        # Update status, name, and readme in MongoDB document
        mongo_client = MongoClient(mongo_uri)
        db = mongo_client[mongo_db]
        collection = db[mongo_collection]
        logging.info(f'MongoDB client connected to {mongo_uri}')
        dataset = {
            'name': dir_path,
            'bucket': bucket,
            'status': 'waiting_for_indexing'
        }
        collection.insert_one(dataset)
        logging.info(f'Successfully created MongoDB document for {dir_path}.')
        
    except Exception as err:
        click.echo(f'Error uploading file: {err}')
        
        # Update status in MongoDB document to reflect upload failure
        mongo_client = MongoClient(mongo_uri)
        db = mongo_client[mongo_db]
        collection = db[mongo_collection]
        collection.update_one({'name': dir_path}, {'$set': {'status': 'upload_failed'}})
        logging.info(f'Updated MongoDB document for {dir_path} to mark upload failure.')
        
        return
    
    # Send metadata to RabbitMQ
    try:
        # Connect to RabbitMQ server
        credentials = pika.PlainCredentials(username, password)
        connection = pika.BlockingConnection(pika.ConnectionParameters(host=host, port=port, credentials=credentials))
        channel = connection.channel()

        # Declare queue
        channel.queue_declare(queue=queue, durable=True)
        
        # Send metadata to queue
        channel.basic_publish(exchange='', routing_key=queue, body=json.dumps(indexing_metadata), properties=pika.BasicProperties(
            delivery_mode=2,  # make message persistent
        ))
        click.echo(f'Successfully sent metadata for {dir_path} to {queue} on RabbitMQ server.')
        
        # Update status and readme in MongoDB document
        mongo_client = MongoClient(mongo_uri)
        db = mongo_client[mongo_db]
        collection = db[mongo_collection]
        collection.update_one({'name': dir_path}, {'$set': {'status': 'waiting_for_indexing'}})
        logging.info(f'Updated MongoDB document for {dir_path} to mark waiting for indexing.')
        
        # Close connection to RabbitMQ server
        connection.close()

    except Exception as err:
        click.echo(f'Error sending metadata to RabbitMQ')
        
        # Update status in MongoDB document to reflect metadata sending failure
        mongo_client = MongoClient(mongo_uri)
        db = mongo_client[mongo_db]
        collection = db[mongo_collection]
        collection.update_one({'name': dir_path}, {'$set': {'status': 'metadata_sending_failed'}})
        logging.info(f'Updated MongoDB document for {dir_path} to mark metadata sending failure.')
    
    return


if __name__ == '__main__':
    upload_dataset()