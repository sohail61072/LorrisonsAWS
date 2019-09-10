const db = require('./db_connect');

module.exports.getSummary = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    const query_name = event.pathParameters.query_name;
    const result = db.query(`select * from query_table where query_name = '${query_name}'`)
        .then(res => {
            callback(null, {
                statusCode: 200,
                body: JSON.stringify(res)
            })
        })
        .catch(e => {
            console.log(e);
            callback(null, {
                statusCode: e.statusCode || 500,
                body: 'Error in getSummary: ' + e
            })
        })
}

module.exports.createUpdateQuery = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    let body = JSON.parse(event.body);
    const query_name = body.query_name;
    const query_string = body.query_string;
    const query_type = body.query_type;
    const sns_threshold = body.sns_threshold;
    const final_query = 
    `INSERT INTO query_table(query_name, query_string, query_type, sns_threshold) `+
    `VALUES ('${query_name}', '${query_string}', '${query_type}', ${sns_threshold}) `+
    `ON CONFLICT (query_name) DO UPDATE `+
    `SET (query_string, query_type, sns_threshold) = `+
    `ROW('${query_string}', '${query_type}', ${sns_threshold}) WHERE query_table.query_name = '${query_name}';`
    const result = db.query(final_query)
        .then(res => {
            callback(null, {
                statusCode: 200,
                body: JSON.stringify(body)
            })
        })
        .catch(e => {
            console.log(e);
            callback(null, {
                statusCode: e.statusCode || 500,
                body: 'Error in getSummary: ' + e
            })
        })
    
}

module.exports.generateSummary = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    const queries = db.query(
        `select query_string from query_table where query_type = 'summary_generator';`
    )
        .then(res => {
            
            callback(null, {
                statusCode: 200,
                body: JSON.stringify(res)
            })
        }).catch(e => {
            console.log(e);
            callback(null, {
                statusCode: e.statusCode || 500,
                body: 'Error in getSummary: ' + e
            })
        })
    // const lenQueries = queries.length
    // for (i = 0; i < lenQueries; i++) {
    //     db.query(query_string)
    // };
    // const message = 'Success';
}
