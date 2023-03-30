# File Searcher and Event Receiver

## Steps to run

[In the /backend folder]

1. Create a .env file with the following content:
```
    ELASTICSEARCH_HOST = <host-name>:<elastic-search-port (9200 by default)>
    RM_HOST = <host-name>
```
\
2. Run the following command to install the required packages :

```
    npm install
```
\
3. Start the server (this will start both the File Searcher and the Event Receiver modules) :
```
    node server.js
```