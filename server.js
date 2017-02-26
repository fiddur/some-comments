
// Setup eventstore.

// Factor models?
//  user
//  comment
//  site?

// Inject dependencies

const esp = aawait(EventStorePromise(options))

const Users = require('./lib/users')

const users = Users({ esp, stream: 'users' })

users.getById()
users.getByAccount()
users.create()

// mailer...  idempotent, perhaps as separate listener...


//

//

const server = require('./lib/app')

const models = require('./models/')

models(config, {})
  .then(model => server.start(model, config))
  .done()
