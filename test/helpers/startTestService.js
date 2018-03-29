const spawn = require('child_process').spawn

module.exports = ({ accessTokenSecret, targetDir }) => new Promise(
  resolve => {
    const serverProcess = spawn('make', ['start-test-service'], {
      cwd: targetDir,
      env: {
        ACCESS_TOKEN_SECRET: accessTokenSecret,
        ...process.env,
      },
    })

    serverProcess.stdout.on('data', buffer => {
      const portRegex = /listening on port (\d+) in process (\d+)./g
      const portMatch = portRegex.exec(buffer.toString())
      if (portMatch) {
        const baseUrl = `http://localhost:${portMatch[1]}`
        const serverPid = portMatch[2]
        resolve({ serverProcess, baseUrl, serverPid })
      } else {
        console.log(`Ignoring server output: ${buffer}`)
      }
    })
    serverProcess.stderr.on('data', buffer => {
      console.log(`Server error: "${buffer}"`)
    })
    serverProcess.stdout.on('end', () => { throw new Error('Server died.') })
  }
)
