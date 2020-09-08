const child_process = require('child_process') // eslint-disable-line camelcase
const fs = require('fs')

class Database {
  constructor (config, reapply = false) {
    this.hostname = config.hostname
    this.username = config.username
    this.port = config.port
    this.base = config.base
    process.env.PGPASSWORD = config.password

    this.testConnection()
    this.initDatabase(reapply)
  }

  testConnection () {
    try {
      this.executeQuery('SELECT version();')
    } catch (error) {
      throw new Error(error)
    }
  }

  initDatabase () {
    const migrationBase = this.executeQuery('SELECT file FROM migration;')
    const migration = []
    fs.readdirSync(`${__dirname}/../database`).forEach(file => {
      const ext = file.split('.')
      if (ext[ext.length - 1] === 'sql') {
        if (!JSON.stringify(migrationBase).includes(file)) {
          const migrationFile = fs.readFileSync(`${__dirname}/../database/${file}`, { encoding: 'utf-8' }).split('-- DOWN')
          const up = migrationFile[0].replace('-- UP', '').trim()
          const down = migrationFile[1].trim()
          migration.push({ file: file, up: up, down: down })
        }
      }
    })
    migration.forEach(sql => this.executeMigration(sql.file, sql.up, sql.down))
  }

  executeMigration (file, up, down, drop = false) {
    if (!drop) {
      this.executeQuery(up)
      this.executeQuery(`INSERT INTO migration VALUES ('${file}', '${up}', '${down}');`)
    }
  }

  executeQuery (query) {
    try {
      const retour = child_process.execSync(`psql -h ${this.hostname} -p ${this.port} ${this.base} ${this.username} -t -R $ -A -c "${query}"`)
      return retour.toString().trim().split('$').map(line => line.split('|'))
    } catch (error) {
      throw error.stderr.toString()
    }
  }

  getParties () {
    return new Promise((resolve, reject) => {
      try {
        const games = this.executeQuery('SELECT * FROM partie ORDER BY id;')
        const gamesObject = []
        for (const game of games) {
          gamesObject.push({
            gameId: game[0],
            gameName: game[1],
            finished: game[2] === 't'
          })
        }
        resolve(gamesObject)
      } catch (error) {
        reject(error)
      }
    })
  }

  addPartie (gameName) {
    return new Promise((resolve, reject) => {
      try {
        const retour = this.executeQuery(`INSERT INTO partie (name) VALUES ('${gameName}') RETURNING id;`)[0][0].split('\n')[0]
        resolve(retour)
      } catch (error) {
        reject(error)
      }
    })
  }

  toggleFinished (id) {
    return new Promise((resolve, reject) => {
      try {
        const retour = this.executeQuery(`UPDATE partie SET finished = NOT(finished) WHERE id = ${id} RETURNING finished;`)[0][0].split('\n')
        if (retour[1] !== 'UPDATE 1') throw new Error(retour)
        resolve(retour[0])
      } catch (error) {
        reject(error)
      }
    })
  }

  deleteGame (gameId) {
    return new Promise((resolve, reject) => {
      try {
        const retour = this.executeQuery(`DELETE FROM partie WHERE id = ${gameId};`)[0][0]
        if (retour !== 'DELETE 1') throw new Error(retour)
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }
}

module.exports = Database
