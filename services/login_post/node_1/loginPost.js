const http = require('http')

const server = http.createServer((req, res) => res.end('{"access_token": "myToken"}'))

const port = process.env.PORT || 3001

process.on('SIGINT', () => process.exit(0))

server.listen(port, err => {
  console.log(`login_post/node_1 listening on port ${port} in process ${process.pid}.`)
})
