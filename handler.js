const db = require('./db_connect');

// module.exports.getAllTodos = (event, context, callback) => {
//     context.callbackWaitsForEmptyEventLoop = false;
//     db.getAll('mock_prod_table')
//         .then(res => {
//             callback(null, {
//                 statusCode: 200,
//                 body: JSON.stringify(res)
//             })
//         })
//         .catch(e => {
//             console.log(e);
//             callback(null, {
//                 statusCode: e.statusCode || 500,
//                 body: 'Error: Could not find Todos: ' + e
//             })
//         })
// };

// module.exports.apiLambda = (event, context, callback) => {
//     context.callbackWaitsForEmptyEventLoop = false;

//     if (event.httpMethod === 'GET') {
//         return getSummary(event, context, callback);
//     }
//     if (event.httpMethod === 'POST') {
//         return createUpdateQuery(event, context, callback);
//     }
// }

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

// module.exports.getAllTodos = (event, context, callback) => {
//     context.callbackWaitsForEmptyEventLoop = false;
//     const sql = 'select * from mock_prod_table';
//     const result = db.query(sql)
//         .then(res => {
//             callback(null, {
//                 statusCode: 200,
//                 body: JSON.stringify(res)
//             })
//         })
//         .catch(e => {
//             console.log(e);
//             callback(null, {
//                 statusCode: e.statusCode || 500,
//                 body: 'Error: Could not find Todos: ' + e
//             })
//         })
// };

// module.exports.createTodo = (event, context, callback) => {
//   context.callbackWaitsForEmptyEventLoop = false;
//   const data = JSON.parse(event.body);
//   db.insert('todo', data)
//     .then(res => {
//       callback(null,{
//         statusCode: 200,
//         body: "Todo Created! id: " + res
//       })
//     })
//     .catch(e => {
//       callback(null,{
//         statusCode: e.statusCode || 500,
//         body: "Could not create Todo " + e
//       })
//     }) 
// };


// module.exports.updateTodo = (event, context, callback) => {
//   context.callbackWaitsForEmptyEventLoop = false;

//   const data = JSON.parse(event.body);
//   db.updateById('todo', event.pathParameters.id, data)
//   .then(res => {
//       callback(null,{
//           statusCode: 200,
//           body: "Todo Updated!" + res
//       })
//   })
//   .catch(e => {
//       callback(null,{
//           statusCode: e.statusCode || 500,
//           body: "Could not update Todo " + e
//       })
//   })
// }

// module.exports.getTodo = (event, context, callback) => {
//     context.callbackWaitsForEmptyEventLoop = false;
//     db.getById('mock_prod_table', event.pathParameters.id)
//     .then(res => {
//         callback(null,{
//             statusCode: 200,
//             body: JSON.stringify(res)
//         })
//     })
//     .catch(e => {
//         callback(null,{
//             statusCode: e.statusCode || 500,
//             body: "Could not find Todo: " + e
//         })
//     })
// };