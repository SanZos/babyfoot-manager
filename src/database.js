
const child_process = require('child_process') // eslint-disable-line camelcase
const fs = require('fs')

/**
 * Gestion de la base de donnée
 * @prop {string} hostname
 * @prop {string} username
 * @prop {number} port
 * @prop {string} base
 */
class Database {
  /**
   * Initialisation des attributs de la couche d'accès à la base
   * @param {object} config configuration pour accéder à la base Postgre
   */
  constructor (config) {
    this.hostname = config.hostname
    this.username = config.username
    this.port = config.port
    this.base = config.base
    this.scripts = config.scripts
    process.env.PGPASSWORD = config.password

    this.testConnection()
    this.initDatabase()
  }

  /**
   * Test de la connexion à la base en lançant une requête sur la version de la base de donnée
   */
  testConnection () {
    try {
      this.executeQuery('SELECT version();')
    } catch (error) {
      throw new Error(error)
    }
  }

  /**
   * Initialisation de la base de donnée avec les scripts d'installation
   */
  initDatabase () {
    const migrationExist = this.executeQuery('\\dt migration')
    let migrationBase = ''
    if (migrationExist[0][0] !== '') migrationBase = this.executeQuery('SELECT file FROM migration;')
    const migration = []
    fs.readdirSync(this.scripts).forEach(file => {
      const ext = file.split('.')
      if (ext[ext.length - 1] === 'sql') {
        if (!JSON.stringify(migrationBase).includes(file)) {
          const migrationFile = fs.readFileSync(`${this.scripts}/${file}`, { encoding: 'utf-8' }).split('-- DOWN')
          const up = migrationFile[0].replace('-- UP', '').trim()
          const down = migrationFile[1].trim()
          migration.push({ file: file, up: up, down: down })
        }
      }
    })
    migration.forEach(sql => this.executeMigration(sql.file, sql.up, sql.down))
  }

  /**
   * Exécution de la requête sql puis enregistrement du sql dans la table migration
   * @param {string} file nom du fichier de migration
   * @param {string} up partie -- UP du fichier sql
   * @param {string} down partie -- DOWN du fichier sql
   */
  executeMigration (file, up, down) {
    try {
      this.executeQuery(up)
      this.executeQuery(`INSERT INTO migration VALUES ('${file}', '${up}', '${down}');`)
    } catch (error) {
      throw new Error(error)
    }
  }

  /**
   * Lancement de la requête en mode texte par le client psql
   * @param {string} query requête sql à executer sur la base
   */
  executeQuery (query) {
    try {
      const retour = child_process.execSync(`psql -h ${this.hostname} -p ${this.port} ${this.base} ${this.username} -t -R \u0001 -A -c "${query}"`)
      return retour.toString().trim().split('\u0001').map(line => line.split('|'))
    } catch (error) {
      throw error.stderr.toString()
    }
  }

  /**
   * Récupération de toutes les parties
   * @returns Promise
   */
  getGames () {
    return new Promise((resolve, reject) => {
      try {
        const games = this.executeQuery('SELECT * FROM partie ORDER BY id;')
        const gamesObject = []
        for (const game of games) {
          if (game[0] !== '') {
            gamesObject.push({
              gameId: game[0],
              gameName: game[1],
              finished: game[2] === 't'
            })
          }
        }
        resolve(gamesObject)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Ajout d'une nouvelle partie en base de données
   * @param {string} gameName nom de la nouvelle partie à ajouter
   * @returns Promise
   */
  addGame (gameName) {
    return new Promise((resolve, reject) => {
      try {
        const retour = this.executeQuery(`INSERT INTO partie (name) VALUES ('${gameName.replace('"', '\\"').replace('\'', '\'\'')}') RETURNING id;`)[0][0].split('\n')
        if (retour[1] !== 'INSERT 0 1') reject(retour)
        resolve(retour[0])
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Mets à jour la partie dans la base de données
   * @param {number} gameId Id de la partie à mettre à jour
   */
  toggleFinished (gameId) {
    return new Promise((resolve, reject) => {
      try {
        if (isNaN(gameId)) throw new Error('NaN')
        const retour = this.executeQuery(`UPDATE partie SET finished = NOT(finished) WHERE id = ${gameId} RETURNING finished;`)[0][0].split('\n')
        if (retour[1] !== 'UPDATE 1') throw new Error(retour)
        resolve(retour[0])
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Supprimer une partie de la base de données
   * @param {number} gameId Id de la partie à supprimer
   * @return Promise
   */
  deleteGame (gameId) {
    return new Promise((resolve, reject) => {
      try {
        if (isNaN(gameId)) throw new Error('NaN')
        const retour = this.executeQuery(`DELETE FROM partie WHERE id = ${gameId};`)[0][0]
        if (retour !== 'DELETE 1') reject(retour)
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }
}

module.exports = Database
