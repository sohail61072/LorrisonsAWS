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
    const query_name = event.query_name;
    const query_string = event.query_string;
    if (event.query_type) {
        const query_type = event.query_type;
        const sns_threshold = event.sns_threshold;
        const result = db.query(
            `INSERT INTO query_table(query_name, query_string, query_type, sns_threshold) `+
            `VALUES ('${query_name}', '${query_string}', '${query_type}', ${sns_threshold})`)
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
    } else {
        const result = db.query(
            `UPDATE query_table SET (query_string) = ROW('${query_string}') WHERE query_name = '${query_name}';`)
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
}

module.exports.generateSummary = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    const query_name = event.query_name;
    const query_string = event.query_string;
    if (event.query_type) {
        const query_type = event.query_type;
        const sns_threshold = event.sns_threshold;
        const result = db.query(
            `INSERT INTO query_table(query_name, query_string, query_type, sns_threshold) `+
            `VALUES ('${query_name}', '${query_string}', '${query_type}', ${sns_threshold})`)
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
}