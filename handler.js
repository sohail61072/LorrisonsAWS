const db = require('./db_connect');
const aws = require("aws-sdk");

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
        `select query_name, query_string, sns_threshold from query_table where query_type = 'summary_generator';`
    )
        .then(res => {
            for(var i = 0; i < res.length; i++) {
                var obj = res[i];
                var originalString = obj.query_string;
                var newString = originalString.replace(/\"/g, "\'");
                const count = db.query(`${newString}`).catch(e => {
                    console.log(e);
                    callback(null, {
                        statusCode: e.statusCode || 500,
                        body: `Error executing query: ${newString} :` + e
                    })
                })
                if (obj.sns_threshold != null) {
                    if (count > 1) {
                        var sns = new aws.SNS();
                        var params = {
                            Message: `The ${obj.query_name} query has found ${count} files in error. Check the dashboard.`, 
                            Subject: "NS From AWSMonitoringTask SummaryGenerator Lambda",
                            TopicArn: "arn:aws:sns:eu-west-2:503104246251:AWSMonitoringMock"
                        };
                        sns.publish(params);
                    }
                } 
            }
            var message = 'Successfully executed summary_generator queries'            
            callback(null, {
                statusCode: 200,
                body: JSON.stringify(message)
            })
        }).catch(e => {
            console.log(e);
            callback(null, {
                statusCode: e.statusCode || 500,
                body: 'Error in getSummary: ' + e
            })
        })
}
