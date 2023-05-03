
# CLI to upload datasets to MinIO

## Steps to upload a dataset to MinIO

1. ```
    cp .env.example .env
    ```
2. Download and install Go from [here](https://golang.org/doc/install)
3. Run the following commands to install the required packages :
   ```
    cd FileUploader
    go mod tidy
    ```

4. To upload a dataset, copy the dataset folder to the FileUploader directory and run the following command: <br>
    `go run main.go --dir_path <path_to_data_set_folder> --dataclass oralcancer --bucket <name_of_the_bucket_on_minio_where_you_want_to_upload>`

    Example of the above command :
    `go run main.go --dir_path OralCancer --dataclass oralcancer --bucket oralcancerdb`
