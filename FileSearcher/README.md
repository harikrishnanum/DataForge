# File Searcher and Event Receiver

## Steps to run


1. Create a .env file with the following content:
```
    ELASTICSEARCH_HOST = <host-name>:<elastic-search-port (9200 by default)>
    SERVER_IP=... 
    SERVER_PORT=...
```
2. Install the required Node.js packages by running: `npm install`
3. Run the file searcher script by running: `node file_searcher.js`
4. To access the API documentation by opening localhost:3000/api-docs in your web browser.