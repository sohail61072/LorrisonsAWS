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

module.exports.getAllTodos = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    const sql = 'select * from mock_prod_table';
    const result = db.query(sql)
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
                body: 'Error: Could not find Todos: ' + e
            })
        })
};

module.exports.createTodo = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const data = JSON.parse(event.body);
  db.insert('todo', data)
    .then(res => {
      callback(null,{
        statusCode: 200,
        body: "Todo Created! id: " + res
      })
    })
    .catch(e => {
      callback(null,{
        statusCode: e.statusCode || 500,
        body: "Could not create Todo " + e
      })
    }) 
};


module.exports.updateTodo = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const data = JSON.parse(event.body);
  db.updateById('todo', event.pathParameters.id, data)
  .then(res => {
      callback(null,{
          statusCode: 200,
          body: "Todo Updated!" + res
      })
  })
  .catch(e => {
      callback(null,{
          statusCode: e.statusCode || 500,
          body: "Could not update Todo " + e
      })
  })
}

module.exports.getTodo = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    db.getById('mock_prod_table', event.pathParameters.id)
    .then(res => {
        callback(null,{
            statusCode: 200,
            body: JSON.stringify(res)
        })
    })
    .catch(e => {
        callback(null,{
            statusCode: e.statusCode || 500,
            body: "Could not find Todo: " + e
        })
    })
};