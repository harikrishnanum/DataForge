# CLI to upload datasets to MinIO

## Steps to run the CLI

1. Create a .env file with the following format:
```
    MINIO_ENDPOINT= ...
    MINIO_ACCESS_KEY= ...
    MINIO_SECRET_KEY= ...
    RM_QUEUE= ...
    RM_HOST= ...
    RM_PORT= ...
    RM_USERNAME= ...
    RM_PASSWORD= ...
    MONGO_URI= ...
    MONGO_DB= ...
    MONGO_COLLECTION= ...
```
\
2. Run the following commands to install the required packages :

```
    pip install minio
    pip install pika
    pip install pymongo
    pip install dotenv
```

3. To run the cli run the following command from the /datasets folder :
```
    python3 cli.py --dir_path <path_to_data_set_folder> --bucket <name_of_the_bucket_on_minio_where_you_want_to_upload>
```

Example of the above command :
```
    python3 cli.py --dir_path Covid19-dataset --bucket covid19
```
