const fs = require('fs');
const { Client } = require('elasticsearch');

const isLocal = false; // change when using in local

const host = "192.168.1.189"
if(isLocal) {
  host = "localhost"
}

const ELASTICSEARCH_HOST = `http://${host}:9200`;
const elasticsearchClient = new Client({
    host: ELASTICSEARCH_HOST
});


// // Read the contents of a JSON file
// fs.readFile('metadata_sample.json', 'utf8', (err, data) => {
//     if (err) throw err;
//     // Parse the JSON data
//     const json = JSON.parse(data);
//     console.log(json);
// });

// Read the contents of a JSON file
fs.readFile('metadata_sample.json', 'utf8', async (err, data) => {
    if (err) throw err;
    // Parse the JSON data
    const json = JSON.parse(data);
    console.log(json);
    
    // Index the data in Elasticsearch
    try {
      const result = await elasticsearchClient.index({
        index: json.datasetName,
        body: json
      });
      console.log(result);
    } catch (err) {
      console.error(err);
    }
  });