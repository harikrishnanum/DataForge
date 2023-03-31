
# CLI to upload datasets to MinIO

## Steps to upload a dataset to MinIO

1. Create a .env file with the following format:
```
    MINIO_ENDPOINT= ...
    MINIO_ACCESS_KEY= ...
    MINIO_SECRET_KEY= ...
    RM_QUEUE= <queue name>
    RM_HOST= ...
    RM_PORT= ...
    RM_USERNAME= ...
    RM_PASSWORD= ...
```
\
2. Run the following commands to install the required packages :

   - Create a new Python virtual environment by running the following command: `python3 -m venv venv`
   - Activate the virtual environment by running: `source venv/bin/activate`
   - Install the required Python packages by running: `pip install -r requirements.txt`

3. To upload a dataset, copy the dataset folder to the FileUploader directory and run the following command:
```
    python3 file_uploader.py --dir_path <path_to_data_set_folder> --bucket <name_of_the_bucket_on_minio_where_you_want_to_upload>
```

Example of the above command :
```
    python3 file_uploader.py --dir_path Covid19-dataset --bucket covid19
```
