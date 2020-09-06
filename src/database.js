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

  initDatabase (reapply) {
    const migrationBase = this.executeQuery('SELECT file FROM migration;')
    const migration = []
    fs.readdirSync(`${__dirname}/../database`).forEach(file => {
      const ext = file.split('.')
      if (ext[ext.length - 1] === 'sql') {
        if (!JSON.stringify(migrationBase).includes(file) || reapply) {
          const migrationFile = fs.readFileSync(`${__dirname}/../database/${file}`, { encoding: 'utf-8' }).split('-- DOWN')
          const up = migrationFile[0].replace('-- UP', '').trim()
          const down = migrationFile[1].trim()
          migration.push({ file: file, up: up, down: down })
        }
      }
    })
    if (reapply) {
      migration.reverse()
      migration.forEach(sql => this.executeMigration(sql.file, sql.up, sql.down, true))
      migration.reverse()
    }
    migration.forEach(sql => this.executeMigration(sql.file, sql.up, sql.down))
  }

  executeMigration (file, up, down, drop = false) {
    if (!drop) {
      this.executeQuery(up)
      this.executeQuery(`INSERT INTO migration VALUES ('${file}', '${up}', '${down}');`)
    } else {
      this.executeQuery(down)
      this.executeQuery(`DELETE FROM migration WHERE file = '${file}';`)
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
}

module.exports = Database
