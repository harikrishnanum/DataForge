package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/streadway/amqp"
	"github.com/xeipuuv/gojsonschema"
)

func check_path(path string) bool {
	_, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			fmt.Printf("Path %s does not exist\n", path)
		} else {
			fmt.Printf("Error checking path %s: %s\n", path, err)
		}
		return false
	} else {
		return true
	}
}

func validateMetadata(dirPath, metadatafile, dataclass string) (bool, interface{}) {
	API := os.Getenv("API")

	// Construct the path to the metadata file
	metadataPath := filepath.Join(dirPath, metadatafile)

	// Check if the metadata file exists
	if _, err := os.Stat(metadataPath); os.IsNotExist(err) {
		fmt.Printf("Error: metadata file %s does not exist.\n", metadataPath)
		return false, nil
	}

	// Load the metadata from the file
	metadataBytes, err := ioutil.ReadFile(metadataPath)
	if err != nil {
		fmt.Printf("Error reading metadata file %s: %s\n", metadataPath, err)
		return false, nil
	}

	var metadata interface{}
	err = json.Unmarshal(metadataBytes, &metadata)
	if err != nil {
		fmt.Printf("Error parsing metadata file %s: %s\n", metadataPath, err)
		return false, nil
	}

	// Retrieve the JSON schema for the dataclass
	schemaURL := fmt.Sprintf("%s/%s", API, dataclass)
	res, err := http.Get(schemaURL)
	if err != nil {
		fmt.Printf("Error connecting to server: %s\n", err)
		return false, nil
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		fmt.Printf("Error retrieving schema for dataclass %s from the database.\n", dataclass)
		return false, nil
	}

	schemaBytes, err := ioutil.ReadAll(res.Body)
	if err != nil {
		fmt.Printf("Error reading schema for dataclass %s: %s\n", dataclass, err)
		return false, nil
	}
	// Validate the metadata against the schema
	schemaLoader := gojsonschema.NewBytesLoader(schemaBytes)
	metadataLoader := gojsonschema.NewGoLoader(metadata)

	result, err := gojsonschema.Validate(schemaLoader, metadataLoader)
	if err != nil {
		fmt.Printf("Error validating metadata file %s: %s\n", metadataPath, err)
		return false, nil
	}

	if !result.Valid() {
		for _, desc := range result.Errors() {
			fmt.Printf("Error validating metadata file %s: %s\n", metadataPath, desc)
		}
		return false, nil
	}

	fmt.Printf("Validated metadata file %s against the schema.\n", metadataPath)
	return true, metadata
}

func uploadToMinIO(dirPath string, metadata []map[string]string, dataClass string, bucket string, endpoint string, accessKey string, secretKey string) (bool, map[string]interface{}) {
	// Initialize MinIO client
	client, err := minio.New(endpoint, &minio.Options{
		Creds: credentials.NewStaticV4(accessKey, secretKey, ""),
	})
	if err != nil {
		log.Printf("Failed to initialize MinIO client: %v\n", err)
		return false, nil
	}
	log.Printf("Initialized MinIO client with endpoint %s.\n", endpoint)

	// Upload file to MinIO
	ctx := context.Background()
	err = client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{})
	if err != nil {
		// Check to see if we already own this bucket (which happens if you run this twice)
		exists, errBucketExists := client.BucketExists(ctx, bucket)
		if errBucketExists == nil && exists {
			log.Printf("Bucket %s already exists\n", bucket)
		} else {
			log.Fatalln(err)
		}
	} else {
		log.Printf("Successfully created %s\n", bucket)
	}

	var indexingMetadata = make(map[string]interface{})
	indexingMetadata["files"] = []map[string]string{}

	// loop through all files in the directory
	imgFormat := make(map[string]bool)
	log.Printf("Uploading files in %s to bucket %s on MinIO server.\n", dirPath, bucket)
	for _, fileDetails := range metadata {
		filePath := filepath.Join(dirPath, fileDetails["image_path"])
		imgFormat[fileDetails["image_type"]] = true

		file, err := os.Open(filePath)
		if err != nil {
			log.Printf("Failed to open file %s: %v\n", filePath, err)
			continue
		}

		// Upload the file to MinIO server
		log.Printf("Uploading %s to %s on MinIO server.\n", filePath, bucket)
		_, err = client.PutObject(context.Background(), bucket, fileDetails["image_path"], file, -1, minio.PutObjectOptions{})
		if err != nil {
			log.Printf("Failed to upload file %s to bucket %s: %v\n", filePath, bucket, err)
			continue
		}
		log.Printf("Successfully uploaded %s to %s on MinIO server.\n", filePath, bucket)

		fileDetails["bucket"] = bucket
		indexingMetadata["files"] = append(indexingMetadata["files"].([]map[string]string), fileDetails)
	}
	indexingMetadata["dataset_name"] = bucket

	log.Printf("Successfully uploaded %s to %s on MinIO server.\n", dirPath, bucket)

	datasetDetails := map[string]interface{}{
		"name":     dirPath,
		"bucket":   bucket,
		"date":     time.Now().Format("2006-01-02"),
		"size":     getDatasetSize(dirPath),
		"filetype": getKeys(imgFormat),
	}
	indexingMetadata["dataset_details"] = datasetDetails

	return true, indexingMetadata
}

func getDatasetSize(path string) int64 {
	rootDirectory := filepath.FromSlash(path)
	var size int64
	err := filepath.Walk(rootDirectory, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			size += info.Size()
		}
		return nil
	})
	if err != nil {
		log.Fatalf("Error walking directory: %s", err)
	}
	return size
}

func getKeys(m map[string]bool) []string {
	keys := make([]string, len(m))
	i := 0
	for k := range m {
		keys[i] = k
		i++
	}
	return keys
}

func sendMetadataToRabbitMQ(username, password, host, queue string, indexingMetadata map[string]interface{}) bool {
	// Create connection to RabbitMQ server
	conn, err := amqp.Dial(fmt.Sprintf("amqp://%s:%s@%s/", username, password, host))
	if err != nil {
		fmt.Printf("failed to connect to RabbitMQ server: %s", err)
		return false
	}
	defer conn.Close()

	// Create channel
	ch, err := conn.Channel()
	if err != nil {
		fmt.Printf("failed to open a channel: %s", err)
		return false
	}
	defer ch.Close()

	// Declare queue
	if _, err := ch.QueueDeclare(queue, true, false, false, false, nil); err != nil {
		fmt.Printf("failed to declare queue: %s", err)
		return false
	}

	// Convert indexingMetadata to JSON
	body, err := json.Marshal(indexingMetadata)
	if err != nil {
		fmt.Printf("failed to encode indexing metadata: %s", err)
		return false
	}

	// Publish message to queue
	if err := ch.Publish("", queue, false, false, amqp.Publishing{
		DeliveryMode: amqp.Persistent,
		ContentType:  "application/json",
		Body:         body,
	}); err != nil {
		fmt.Printf("failed to publish message to queue: %s", err)
		return false
	}

	log.Printf("Successfully sent metadata to queue %s on RabbitMQ server.\n", queue)
	return true
}

func convertToMapSlice(data []interface{}) ([]map[string]string, error) {
	var result []map[string]string

	for _, item := range data {
		// Assert that the item is a map[string]interface{}
		itemMap, ok := item.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("invalid data format: expected map[string]interface{}, got %T", item)
		}

		// Convert the item to a map[string]string
		var itemStringMap = make(map[string]string)
		for key, value := range itemMap {
			if s, ok := value.(string); ok {
				itemStringMap[key] = s
			} else {
				return nil, fmt.Errorf("invalid data format: expected string value for key %s, got %T", key, value)
			}
		}

		// Append the item to the result slice
		result = append(result, itemStringMap)
	}

	return result, nil
}

func main() {
	err := godotenv.Load()
	if err != nil {
		fmt.Println("Error loading .env file")
	}
	var dirPath string
	flag.StringVar(&dirPath, "dir_path", "", "The path to the directory containing the dataset.")

	var metadatafile string
	flag.StringVar(&metadatafile, "metadatafile", "metadata.json", "The name of the metadata file.")

	var dataclass string
	flag.StringVar(&dataclass, "dataclass", "", "The dataclass of the dataset.")

	var bucket string
	flag.StringVar(&bucket, "bucket", "", "The bucket to upload the file to.")

	var endpoint string
	flag.StringVar(&endpoint, "endpoint", os.Getenv("MINIO_ENDPOINT"), "The MinIO server endpoint.")

	var accessKey string
	flag.StringVar(&accessKey, "access-key", os.Getenv("MINIO_ACCESS_KEY"), "The access key for the MinIO server.")

	var secretKey string
	flag.StringVar(&secretKey, "secret-key", os.Getenv("MINIO_SECRET_KEY"), "The secret key for the MinIO server.")

	var queue string
	flag.StringVar(&queue, "queue", os.Getenv("RM_QUEUE"), "The RabbitMQ queue name to send the metadata to.")

	var host string
	flag.StringVar(&host, "host", os.Getenv("RM_HOST"), "The RabbitMQ server hostname.")

	var port_str string
	flag.StringVar(&port_str, "port", os.Getenv("RM_PORT"), "The RabbitMQ server port.")
	port, _ := strconv.Atoi(port_str)

	var username string
	flag.StringVar(&username, "username", os.Getenv("RM_USERNAME"), "The RabbitMQ server username.")

	var password string
	flag.StringVar(&password, "password", os.Getenv("RM_PASSWORD"), "The RabbitMQ server password.")

	flag.Parse()

	if !check_path(dirPath) {
		return
	}

	fmt.Printf("dir_path: %s\n", dirPath)
	fmt.Printf("port: %d\n", port)
	fmt.Printf("metadatafile: %s\n", metadatafile)
	fmt.Printf("dataclass: %s\n", dataclass)

	status, metadata := validateMetadata(dirPath, metadatafile, dataclass)
	if !status {
		return
	}

	indexingMetadata := make(map[string]interface{})
	indexingMetadata["files"] = []interface{}{}
	if bucket == "" {
		// Use the parent directory name of the directory as the bucket name
		dirs := strings.Split(dirPath, "/")
		bucket = dirs[len(dirs)-1]
		bucket = strings.ToLower(bucket)
	}
	metadataSlice, _ := metadata.([]interface{})
	metadataMapSlice, err := convertToMapSlice(metadataSlice)
	if err != nil {
		fmt.Println("error converting metadata to map slice:", err)
		return
	}
	minio_status, indexingMetadata := uploadToMinIO(dirPath, metadataMapSlice, dataclass, bucket, endpoint, accessKey, secretKey)
	if !minio_status {
		return
	}
	rabbitmq_status := sendMetadataToRabbitMQ(username, password, host, queue, indexingMetadata)
	if !rabbitmq_status {
		return
	}
	fmt.Println("Successfully uploaded to MinIO and sent metadata to RabbitMQ. Waiting for indexing to complete...")
}
