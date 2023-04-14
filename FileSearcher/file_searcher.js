/**
 * File Searcher Service.
 * This is an API that provides several endpoints to search on the uploaded datasets using their indexed metadata
 * through search queries on Elasticsearch.
 * The matched metadata of the datasets are returned to the client.
 * Basic filters and pagination are supported.
 */

const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('elasticsearch');
const swagger = require('./swagger');
const cors = require('cors');
require('dotenv').config();

const ELASTICSEARCH_HOST = process.env.ELASTICSEARCH_HOST || 'http://localhost:9200';

const elasticsearchClient = new Client({
    host: ELASTICSEARCH_HOST
});

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';


// Middleware to parse request body as JSON
app.use(bodyParser.json());

/**
 * Healthcheck api 
 */
app.get('/healthcheck', (req, res) => {
    res.send('OK');
});

/**
 * Returns list of overall dataset metadata that match the query and the filters.
 * The response can be filtered based on datasetname prefix, date range, size range and filetype. 
 */
app.get('/datasets', async (req, res) => {
    const { datasetName, fromDate, toDate, minSize, maxSize, fileType, pagination = 1, pageSize = 10 } = req.query;
    try {
        const searchQuery = {
            index: 'datasets',
            body: {
                from: (pagination - 1) * pageSize,
                size: pageSize,
                query: {
                    bool: {
                        must: [
                            {
                                query_string: {
                                    default_field: 'name',
                                    query: `${datasetName}*`
                                }
                            }
                        ],
                        filter: []
                    }
                }
            }
        };

        // Date Filter
        if (fromDate && toDate) {
            searchQuery.body.query.bool.filter.push({
                range: {
                    date: {
                        gte: fromDate,
                        lte: toDate
                    }
                }
            });
        }

        // Size Filter
        if (minSize && maxSize) {
            searchQuery.body.query.bool.filter.push({
                range: {
                    size: {
                        gte: minSize,
                        lte: maxSize
                    }
                }
            });
        }

        // Filetype Filter
        if (fileType) {
            const fileTypes = fileType.split(',');
            searchQuery.body.query.bool.filter.push({
                terms: {
                    filetype: fileTypes
                }
            });
        }

        // Send generated query to Elasticsearch.
        const searchResponse = await elasticsearchClient.search(searchQuery);
        res.send(searchResponse.hits.hits);
    }
    catch (e) {
        console.log(e)
    }
});


/**
 * Returns data(for eg. images) of a particular dataset that match the given filters.
 * The API accepts the exact dataset name of the dataset on which you want to query, the 
 */
app.get('/search/:datasetName', async (req, res) => {
    const datasetName = req.params.datasetName
    const { query, fields, pagination = 1, pageSize = 10, eq_filters } = req.query;
    let filter_data_list = []

    if (eq_filters)
        filter_data_list = eq_filters.match(/(\\.|[^&])+/g)

    let must_clause_list = []

    // Eq filter
    for (var i = 0; i < filter_data_list.length; i++) {
        key_val = filter_data_list[i].match(/(\\.|[^=])+/g)
        key_val_obj = {}
        key_val_obj[key_val[0]] = key_val[1]
        predicate_obj = { "match_phrase": key_val_obj }
        must_clause_list.push(predicate_obj)
    }

    // Generate and send query to Elastic search.
    elasticsearchClient.search({
        index: datasetName.toLocaleLowerCase(),
        body: {
            from: (pagination - 1) * pageSize,
            size: pageSize,
            query:
            {
                bool: {
                    must: [
                        {
                            query_string:
                            {
                                query: query ? `${query}*` : `*`
                            }
                        }, {
                            bool: {
                                must: must_clause_list
                            }
                        }
                    ]
                }
            },
            _source: fields ? fields.split(',') : undefined,

        }
    }).then((result) => {
        // Extract hits and total count
        const { hits } = result;
        const { total } = hits;

        // Return response
        res.json({
            total,
            pagination,
            pageSize,
            results: hits.hits.map((hit) => hit._source),
        });
    }).catch((e) => {
        console.log("Error --")
        console.log(e)
        res.status(e.status).send(e.body.error)
    });
});

// Run Swagger API Interface.
swagger(app);


app.listen(port, host, () => {
    console.log(`Server listening at http://${host}:${port}`);
});
