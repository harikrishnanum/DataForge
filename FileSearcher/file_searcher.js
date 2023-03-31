// api.js

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


// middleware to parse request body as JSON
app.use(bodyParser.json());

// Healthcheck api 
app.get('/healthcheck', (req, res) => {
    res.send('OK');
});

// Endpoint to search for dataset
app.get('/search/:datasetName', async (req, res) => {
    const datasetName = req.params.datasetName
    const { query, fields, pagination = 1, pageSize = 10, eq_filters, range_filters } = req.query;
    let filter_data_list = []
    let range_filter_list = []

    if (eq_filters)
        filter_data_list = eq_filters.match(/(\\.|[^&])+/g)

    if (range_filters)
        range_filter_list = range_filters.match(/(\\.|[^&])+/g)  // key=gt:3|lt:32&key=gt:3|lt:32

    let must_clause_list = []
    // Eq filter
    for (var i = 0; i < filter_data_list.length; i++) {
        key_val = filter_data_list[i].match(/(\\.|[^=])+/g)
        // console.log(key_val)
        key_val_obj = {}
        key_val_obj[key_val[0]] = key_val[1]
        predicate_obj = { "match_phrase": key_val_obj }
        must_clause_list.push(predicate_obj)
    }

    // Range filter
    // for (var i = 0; i < range_filter_list.length; i++) {
    //   key_val = range_filter_list[i].match(/(\\.|[^=])+/g)
    //   // console.log(key_val)

    //   // key_val_obj = {}
    //   // key_val_obj[key_val[0]] = key_val[1]
    //   // predicate_obj = {"match_phrase" : key_val_obj}
    //   // must_clause_list.push(predicate_obj)
    // }

    console.log(must_clause_list)
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

        // console.log(hits.hits);
        // Return response
        res.json({
            total,
            pagination,
            pageSize,
            results: hits.hits.map((hit) => hit._source),
        });
        // res.send(searchResponse.hits.hits);
    }).catch((e) => {
        console.log("Error --")
        console.log(e)
        res.status(e.status).send(e.body.error)
    });
});

// Endpoint for filtering
app.post('/filter', async (req, res) => {
    // dummy implementation for now
    res.send('Dummy filter endpoint');
});

app.get('/datasets', async (req, res) => {
    const { datasetName, fromDate, toDate, minSize, maxSize, fileType } = req.query;
    try {
        const searchQuery = {
            index: 'datasets',
            body: {
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

        if (fileType) {
            const fileTypes = fileType.split(',');
            searchQuery.body.query.bool.filter.push({
                terms: {
                    filetype: fileTypes
                }
            });
        }

        const searchResponse = await elasticsearchClient.search(searchQuery);
        res.send(searchResponse.hits.hits);
    }
    catch (e) {
        console.log(e)
    }
});

swagger(app);

app.listen(port, host, () => {
    console.log(`Server listening at http://${host}:${port}`);
});
