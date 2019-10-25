const db = require('./db_connect');
var AWS = require("aws-sdk");
const sns = new AWS.SNS({ region: 'eu-west-2' })

module.exports.getQuery = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = true;
    console.log("Function getQuery : STARTS")
    const query_name = event.pathParameters.query_name;
    const result = db.query(`select * from query_table where query_name = '${query_name}';`)
        .then(res => {
            console.log(`Successfully received Query: ${query_name}`)
            var obj = res[0];
            callback(null, {
                statusCode: 200,
                body: JSON.stringify(obj)
            })
        })
        .catch(e => {
            console.log(`Error recieving Query: ${query_name}`, e);
            callback(null, {
                statusCode: e.statusCode || 500,
                body: 'Error in getSummary: ' + e
            })
        })
}

module.exports.getDrilldown = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = true;
    console.log("Function Drilldown : STARTS")
    const query_name = event.pathParameters.query_name;
    const result = db.query(`select * from query_table where query_name = '${query_name}';`)
        .then(res => {
            console.log(`Successfully received Query: ${query_name}`)
            var obj = res[0];
            if (obj.query_type != 'summary_generator') {
                var originalString = obj.query_string;
                var newString = originalString.replace(/\"/g, "\'");
                if (obj.query_type != 'drilldown') {
                    console.log(`\'Get Summary\' object detected`)
                    db.query(`${newString}`).then(response => {
                        console.log(`Successfully exectued get_summary query: ${query_name}`)
                        callback(null, {
                            statusCode: 200,
                            body: JSON.stringify(response[0])
                        })
                    }).catch(e => {
                        console.log(`Error executing get_summary query: ${query_name}`, e);
                        callback(null, {
                            statusCode: e.statusCode || 500,
                            body: `Error executing query: ${newString} :` + e
                        })
                    })
                } else {
                    console.log(`\'Drilldown\' query detected`)
                    db.query(`${newString}`).then(response => {
                        console.log(`Successfully executed drilldown query: ${query_name}`)
                        returnObject = []
                        for (i=0;i<response.length;i++){
                            returnObject[i] = response[i]
                            console.log(`Errored Item ${i+1}: ${JSON.stringify(response[i].order_id)}`)
                        }
                        callback(null, {
                            statusCode: 200,
                            body: JSON.stringify(returnObject)
                        })
                    }).catch(e => {
                        console.log(`Error executing Drilldown query: ${query_name}`, e);
                        callback(null, {
                            statusCode: e.statusCode || 500,
                            body: `Error executing query: ${newString} :` + e
                        })
                    })
                }

            } else {
                console.log(`\'Summary Generator\' query detected - Query returned`)
                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify(obj)
                })
            }
            
        })
        .catch(e => {
            console.log(`Error recieving query: ${query_name}`, e);
            callback(null, {
                statusCode: e.statusCode || 500,
                body: 'Error in getSummary: ' + e
            })
        })
}

module.exports.getScenarios = (event, context, callback) => {
    console.log(`Function getScenarios: STARTS`)
    context.callbackWaitsForEmptyEventLoop = true;
    const result = db.query(`SELECT scenario_name from master_scenario_table`)
        .then(res => {
            console.log(`Successfully recieved Scenarios`)
            callback(null, {
                statusCode: 200,
                body: JSON.stringify(res)
            })
        })
        .catch(e => {
            console.log(`Error recieving Scenarios: `, e);
            callback(null, {
                statusCode: e.statusCode || 500,
                body: 'Error in getSummary: ' + e
            })
        })
}

module.exports.getLatestData = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = true;
    console.log(`Function getLatestData: STARTS`)
    const get_query = `SELECT * FROM (
        SELECT
         summary_id, summary_count, created_dt,
     summary_table.query_name, query_table.scenario,
        RANK() OVER (PARTITION BY summary_table.query_name
                     ORDER BY created_dt DESC) AS Rank
        FROM summary_table inner join query_table on query_table.query_name = summary_table.query_name) a
      order by rank asc
     `
      const result = db.query(get_query)
      .then(res => {
        console.log(`Latest summaries recieved`)
        var result = res.reduce( (acc, obj) => {
          acc[obj.scenario] = acc[obj.scenario] || [];
          acc[obj.scenario].push(obj);
          return acc;
        }, {});
    
        var scenarioName = Object.keys(result);
        console.log(`Found Scenarios: ${JSON.stringify(scenarioName)}`)
    
    
        var newobj ={};
        
        for (i=0; i<scenarioName.length; i++) {
          var currKey = scenarioName[i]
          console.log(`Reformatting data for scenario: ${JSON.stringify(currKey)}`)
          var currentObj = result[currKey]
          var index = 1
          var valueArray = [];
          
          var valueObj = {};
    
          for (j=0; j< currentObj.length; j++) {
            
            // var objString =JSON.stringify(obj.summary_count)
            var obj = currentObj[j];
            if(obj.rank != index){
                      index=obj.rank
                      valueArray.push(valueObj)
                      valueObj = {}
                    }
            
            valueObj.rank = obj.rank              
            var status = obj.query_name.replace(currKey+'_', "");
            var summaryCount = obj.summary_count;
            valueObj[status]= summaryCount;
            valueObj.created_dt = obj.created_dt
            obj[status] = summaryCount;
            
                }
                newobj[currKey] = valueArray
              }
    
        var message = 'executed  get query'
        console.log("Returning latest data")
        callback(null, {
          statusCode: 200,
          body: JSON.stringify(newobj)
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
    console.log('Function createUpdateQuery: STARTS')
    context.callbackWaitsForEmptyEventLoop = true;
    let body = JSON.parse(event.body);
    if (body.request == 'create') {
        console.log(`Creating new query:`)
        const query_name = body.query_name;
        const query_string = body.query_string;
        const query_type = body.query_type;
        const sns_threshold = body.sns_threshold || null;
        const scenario = body.scenario || null;
        console.log(`Recieved information from body: query_name: ${query_name}, `+
        `query_string: ${query_string}, query_type: ${query_type}, sns_threshold: ${sns_threshold}, `+
        `scenario: ${scenario}`)
        var values = `'${query_name}', '${query_string}', '${query_type}'`;
        var columns = `query_name, query_string, query_type`
        if (sns_threshold != null) {
            values = values.concat(`, '${sns_threshold}'`)
            columns = columns.concat(`, sns_threshold`)
            console.log(`sns_threshold not null - new strings - values: ${values}, columns: ${columns}`)
        }
        if (scenario != null) {
            values = values.concat(`, '${scenario}'`)
            columns = columns.concat(`, scenario`)
            console.log(`scenario not null - new strings - values: ${values}, columns: ${columns}`)
        }
        const final_query = 
        `INSERT INTO query_table(${columns}) `+
        `VALUES (${values})`
        
        const result = db.query(final_query)
            .then(res => {
                console.log(`Successfully added query`)
                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify(`Query created for ${body.query_name}`)
                })
            })
            .catch(e => {
                console.log(`Error adding query: `, e);
                callback(null, {
                    statusCode: e.statusCode || 500,
                    body: 'Error in getSummary: ' + e
                })
            })

    } else if (body.request == 'update') {
        console.log(`Updating ${body.query_name} query:`)
        var updates = {};
        const query_name = body.query_name;
        if (body.query_name) {
            updates[`query_name`] = `'${body.query_name}'`
        }
        if (body.query_string) {
            updates[`query_string`] = `'${body.query_string}'`
        }
        if (body.query_type) {
            updates[`query_type`] = `'${body.query_type}'`
        }
        if (body.sns_threshold) {
            updates[`sns_threshold`] = `'${body.sns_threshold}'`
        }
        if (body.scenario) {
            updates[`scenario`] = `'${body.scenario}'`
        }
        var Columns = ""
        var Data = ""
        updates_keys = Object.keys(updates)
        console.log(`Columns to update: `,updates_keys)
        for (i=0;i<updates_keys.length;i++) {
            Columns = Columns.concat(`, ${updates_keys[i]}`)
            Data = Data.concat(`, ${updates[updates_keys[i]]}`)
        }
        Columns = Columns.replace(/, /, "");
        Data = Data.replace(/, /, "");
        console.log(`Recieved information from body: Columns = ${Columns}, Data = ${Data}`)
        const final_query = 
        `UPDATE query_table `+
        `SET (${Columns}) = `+
        `(${Data}) WHERE query_table.query_name = '${query_name}';`
        const result = db.query(final_query)
            .then(res => {
                console.log(`Successfully executed query`)
                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify(body)
                })
            })
            .catch(e => {
                console.log(`Error executing query: `, e);
                callback(null, {
                    statusCode: e.statusCode || 500,
                    body: 'Error in getSummary: ' + e
                })
            })

    }
}

module.exports.generateSummary = (event, context, callback) => {
    console.log(`Function generateSummary: STARTS`)
    context.callbackWaitsForEmptyEventLoop = true;
    const queries = db.query(
        `select query_name, query_string, sns_threshold from ops_dashboard.query_table where query_type = 'summary_generator';`
    )
        .then(res => {
            console.log(`Successfully returned generator queries`)
            returnedQueries = res;
            for(var i = 0; i < returnedQueries.length; i++) {
                var obj = returnedQueries[i];
                var originalString = obj.query_string;
                var newString = originalString.replace(/\"/g, "\'");
                //var finalString = newString.replace(/generate_/g, "");
                summaryQuery(newString, obj, callback)
                console.log(`Query for ${obj.query_name} added to queue`)
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
                body: 'Error in generateSummary: ' + e
            })
        })
}

function summaryQuery (queryString, queryObject, callback) {
    db.query(`${queryString}`).then(response => {
        console.log(`Query for ${queryObject.query_name} executed successfully - Summary Generated`)
        if (queryObject.sns_threshold != null) {
            console.log(`${queryObject.query_name} detected to be 'error status' query`)
            if (response[0].summary_count > queryObject.sns_threshold) {
                console.log(`summary_count: ${response[0].summary_count} exceeds sns_threshold: ${queryObject.sns_threshold}. Proceed to publish SNS alert`)
                try {
                    var snsMessage = `${queryObject.query_name} returned ${response[0].summary_count} files currently in error.`;
                    var snsSubject = `Errors in ${queryObject.query_name} have exceeded the pre-set threshold`;
                    const metadata = publishSnsTopic(snsMessage, snsSubject)
                    console.log(`SNS message sent`)
                    return generateResponse(200, {
                        message: 'Successfully added the calculation.',
                        data: metadata
                    })
                } catch (err) {
                    console.log(`SNS failed to send`)
                    return generateError(500, new Error('Couldn\'t add the calculation due to an internal error.'))
                }
            } else {
                console.log(`summary_count: ${response[0].summary_count} does not exceed sns_threshold. No SNS alert required`)
            }
        } else {
            console.log(`${queryObject.query_name} is not an 'error status' object - no SNS check necessary`)
        }
    }).catch(e => {
        console.log(`Query for ${queryObject.query_name} failed to execute successfully`, e);
        callback(null, {
            statusCode: e.statusCode || 500,
            body: `Error executing query: ${queryString} :` + e
        })
    })
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

module.exports.generateQueries = (event, context, callback) => {
    console.log(`Function generateQueries: STARTS`)
    context.callbackWaitsForEmptyEventLoop = true;

    const queries = db.query(
        `SELECT * FROM ops_dashboard.master_scenario_table;`
    )
        .then(res => {
            console.log(`Successfully returned generator queries`)
            returnedScenarios = res;
            var scen
            for(var i = 0; i < returnedScenarios.length; i++) {
                var obj = returnedScenarios[i];
                setUpQueries(obj, callback)
            }        
            callback(null, {
                statusCode: 200,
                body: JSON.stringify(returnedScenarios)
            })
        }).catch(e => {
            console.log(e);
            callback(null, {
                statusCode: e.statusCode || 500,
                body: 'Error in generateSummary: ' + e
            })
        })
}

function setUpQueries (scenario_obj, callback) {

    const scenario_name = scenario_obj.scenario_name
    const source_table = scenario_obj.source_table
    const channel = scenario_obj.channel
    const status_column_name = scenario_obj.status_column_name
    const sns_threshold = scenario_obj.sns_threshold

    var base_summary_query = `insert into ops_dashboard.summary_table(query_name, summary_count, total_value, created_dt) `+
    `values (\"${scenario_name}_<<<\",`+
    `( select count(*) from ${source_table} where channel = \"${channel}\" `+
    `and ${status_column_name} = \"<<<\" and date(transaction_dt) = date(now())), `+
    `COALESCE((select SUM((sales_payload -> \"transactions\"->0->\"tenders\"->0->\"tenderamount\"->0->>\"amount\")::float) `+
    `AS total_cost from ${source_table} where ${status_column_name} = \"<<<\" and channel = \"${channel}\" and date(transaction_dt) = date(now())`+
    `group by (${status_column_name})),0::float), now()) returning summary_count;`

    var total_summary_queryString = `insert into ops_dashboard.summary_table(query_name, summary_count, total_value, created_dt) `+
    `values (\"${scenario_name}_total\",`+
    `( select count(*) from ${source_table} where channel = \"${channel}\" `+
    `and date(transaction_dt) = date(now())), `+
    `COALESCE((select SUM((sales_payload -> \"transactions\"->0->\"tenders\"->0->\"tenderamount\"->0->>\"amount\")::float) `+
    `AS total_cost from ${source_table} where channel = \"${channel}\" and date(transaction_dt) = date(now())),0::float)`+
    `, now()) returning summary_count;`

    var completed_summary_queryString = base_summary_query.replace(/<<</g, "completed")
    var pending_summary_queryString = base_summary_query.replace(/<<</g, "pending")
    var error_summary_queryString = base_summary_query.replace(/<<</g, "error")
    var drilldown_queryString = `select * from ${source_table} where `+
    `channel = \"${channel}\" and ${status_column_name} = \"error\" and date(transaction_dt) = date(now());`

    //total
    queryGenerator(scenario_name, null, total_summary_queryString, `${scenario_name}_total`, `summary_generator`, callback)

    //completed
    queryGenerator(scenario_name, null, completed_summary_queryString, `${scenario_name}_completed`, `summary_generator`, callback)

    //pending
    queryGenerator(scenario_name, null, pending_summary_queryString, `${scenario_name}_pending`, `summary_generator`, callback)

    //error
    queryGenerator(scenario_name, sns_threshold, error_summary_queryString, `${scenario_name}_error`, `summary_generator`, callback)

    //drilldown
    queryGenerator(scenario_name, null, drilldown_queryString, `drilldown_${scenario_name}_error`, `drilldown`, callback)
}

function queryGenerator (scenario_name_param, threshold_param, query_string_param, query_name_param, query_type_param, callback) {

    const query_name = query_name_param;
    const query_string = query_string_param;
    const query_type = query_type_param;
    const sns_threshold = threshold_param;
    const scenario = scenario_name_param;

    var values = `\'${query_name}\', \'${query_string}\', \'${query_type}\'`;
    var columns = `query_name, query_string, query_type`
    if (sns_threshold != null) {
        values = values.concat(`, \'${sns_threshold}\'`)
        columns = columns.concat(`, sns_threshold`)
    }
    if (scenario != null) {
        values = values.concat(`, \'${scenario}\'`)
        columns = columns.concat(`, scenario`)
    }
    const final_query = 
    `INSERT INTO ops_dashboard.query_table(${columns}) `+
    `VALUES (${values}) ON CONFLICT (query_name) DO NOTHING RETURNING query_name as new`

    //console.log(final_query)
    
    const result = db.query(final_query)
        .then(res => {
            try {
                const newQuery = res[0].new
                console.log(`Adding new query: ${query_name} - ${JSON.stringify(res)}`)
            } catch(err) {
                console.log(`The query ${query_name} already exists`)
            }
        })
        .catch(e => {
            console.log(`Error adding query: ${query_name}`, e);
        })
}

module.exports.createScenario = (event, context, callback) => {
    console.log('Function createScenario: STARTS')
    context.callbackWaitsForEmptyEventLoop = true;
    let body = JSON.parse(event.body);
    console.log(`Creating new scenario:`)

    const scenario_name = body.scenario_name;
    const sns_threshold = body.sns_threshold;
    const source_table = body.source_table;
    const channel = body.channel;
    const status_column_name = body.status_column_name;

    console.log(`Recieved information from body: scenario_name: ${scenario_name}, `+
    `sns_threshold: ${sns_threshold}, source_table: ${source_table}, channel: ${channel}, `+
    `status_column_name: ${status_column_name}`)

    var values = `'${scenario_name}', '${sns_threshold}', '${source_table}', '${channel}', '${status_column_name}'`;
    var columns = `scenario_name, sns_threshold, source_table, channel, status_column_name`

    const final_query = 
    `INSERT INTO ops_dashboard.master_scenario_table(${columns}) `+
    `VALUES (${values})`
    
    const result = db.query(final_query)
        .then(res => {
            console.log(`Successfully added query`)
            callback(null, {
                statusCode: 200,
                body: JSON.stringify(`${body.scenario_name} added to master_scenario_table`)
            })
        })
        .catch(e => {
            console.log(`Error adding query: `, e);
            callback(null, {
                statusCode: e.statusCode || 500,
                body: 'Error in getSummary: ' + e
            })
        })
}