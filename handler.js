const db = require('./db_connect');
var AWS = require("aws-sdk");
const sns = new AWS.SNS({ region: 'eu-west-2' })

module.exports.getSummary = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    const query_name = event.pathParameters.query_name;
    const result = db.query(`select * from query_table where query_name = '${query_name}';`)
        .then(res => {
            var obj = res[0];
            if (obj.query_type != 'summary_generator') {
                var originalString = obj.query_string;
                var newString = originalString.replace(/\"/g, "\'");
                if (obj.query_type != 'drilldown') {
                    db.query(`${newString}`).then(response => {
                        callback(null, {
                            statusCode: 200,
                            body: JSON.stringify(response[0])
                        })
                    }).catch(e => {
                        console.log(e);
                        callback(null, {
                            statusCode: e.statusCode || 500,
                            body: `Error executing query: ${newString} :` + e
                        })
                    })
                } else {
                    db.query(`${newString}`).then(response => {
                        callback(null, {
                            statusCode: 200,
                            body: JSON.stringify(response[0])
                        })
                    }).catch(e => {
                        console.log(e);
                        callback(null, {
                            statusCode: e.statusCode || 500,
                            body: `Error executing query: ${newString} :` + e
                        })
                    })
                }

            } else {
                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify(obj)
                })
            }
            
        })
        .catch(e => {
            console.log(e);
            callback(null, {
                statusCode: e.statusCode || 500,
                body: 'Error in getSummary: ' + e
            })
        })
}

module.exports.getScenarios = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = true;
    const result = db.query(`SELECT query_name from query_table where scenario = `)
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

module.exports.getStats = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = true;
    var jsonObj = {};
    const scenario_name = event.pathParameters.scenario_name;
    const result = db.query(`SELECT query_name, query_string FROM query_table where scenario = '${scenario_name}'`)
        .then(res => {
            // for (i=0; i<res.length; i++) {
                var recievedResponse = [];
                var obj = res[0];
                var status = obj.query_name.replace(`${scenario_name}_`, "");
                var originalString = obj.query_string;
                var newString = originalString.replace(/\"/g, "\'");
                const loopResult = db.query(`${newString}`).then(response => {
                    // callback(null, {
                    //     statusCode: 200,
                    //     body: JSON.stringify(response[0].summary_count)
                    // })
                    recievedResponse = response[0].summary_count;
                }).catch(e => {
                    console.log(e);
                    callback(null, {
                        statusCode: e.statusCode || 500,
                        body: `Error executing query: ${newString} :` + e
                    })
                })
                jsonObj[`${status}`] = `${recievedResponse}`;
            // }
            callback(null, {
                statusCode: 200,
                body: JSON.stringify(recievedResponse)
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
    context.callbackWaitsForEmptyEventLoop = true;
    const queries = db.query(
        `select query_name, query_string, sns_threshold from query_table where query_type = 'summary_generator';`
    )
        .then(res => {
            for(var i = 0; i < res.length; i++) {
                var obj = res[i];
                var originalString = obj.query_string;
                var newString = originalString.replace(/\"/g, "\'");
                var finalString = newString.replace(/generate_/g, "");
                const count = db.query(`${finalString}`).catch(e => {
                    console.log(e);
                    callback(null, {
                        statusCode: e.statusCode || 500,
                        body: `Error executing query: ${newString} :` + e
                    })
                })
                console.info(`for ${obj.query_name} obj sns_threshold =  ${obj.sns_threshold}, count = ${count}`)
                if (obj.sns_threshold != null) {
                    console.info(`sns_threshold not null for ${obj.query_name}`)
                    if (4 > obj.sns_threshold) {
                        try {
                            const metadata = publishSnsTopic(`INSERT SNS MESSAGE HERE`, `SNS Subject`)
                            return generateResponse(200, {
                                message: 'Successfully added the calculation.',
                                data: metadata
                            })
                        } catch (err) {
                            return generateError(500, new Error('Couldn\'t add the calculation due to an internal error.'))
                        }
                        // console.info(`count is bigger than threshold for ${obj.query_name}`)
                        //     var eventText = 'Here is some Text';
                        //     var sns = new AWS.SNS();
                        //     var params = {
                        //         Message: eventText, 
                        //         Subject: "Test SNS From Lambda",
                        //         TopicArn: "arn:aws:sns:eu-west-2:503104246251:AWSMonitoringMock"
                        //     };
                        //     sns.publish(params, function(err,data) {
                        //         if(err) {
                        //             console.error('error publishing to SNS');
                        //             context.fail(err);
                        //         } else {
                        //             console.info('message published to SNS');
                        //             context.succeed(null, data);
                        //         }
                        //     });
                    } else {
                        console.info(`count not bigger than threshold for ${obj.query_name}`)
                    }
                } else {
                    console.info(`sns_threshold null for ${obj.query_name}`)
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
    return context.logStreamName;
}

async function publishSnsTopic (message, subject) {
    const params = {
      Message: message,
      Subject: subject,
      TopicArn: `arn:aws:sns:eu-west-2:503104246251:AWSMonitoringMock`
    }
    return sns.publish(params).promise()
  }

  function generateResponse (code, payload) {
    console.log(payload)
    return {
      statusCode: code,
      body: JSON.stringify(payload)
    }
  }
  function generateError (code, err) {
    console.error(err)
    return generateResponse(code, {
      message: err.message
    })
  }