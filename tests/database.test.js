const { runner } = require('./testUtils')

const child_process = require('child_process') // eslint-disable-line camelcase

// MockUp
const execSync = child_process.execSync.bind({})
let dbKO = false
child_process.execSync = (commande) => {
  const error = new Error('Erreur')
  const sql = commande.match(/"(?<sql>[\w\s\d');*(,-_]*)"/).groups.sql

  let retour = 'PlaceHolder'

  if (dbKO) {
    error.stderr = 'Pas de base'
    throw error
  }
  const data = sql.split(' ')
  switch (data[0]) {
    case 'CREATE':
      break
    case 'SELECT':
      if (data[3] === 'partie') retour = '1|Marine vs Thibault|f\u00012|Bernadette vs Fargolin|t'
      break
    case 'INSERT':
      retour = [[`2\nINSERT ${data[5] === "('Test')" ? '1 0' : '0 1'}`]]
      break
    case 'UPDATE':
      retour = [[`t\nUPDATE ${Number(data[9]) === 154 ? '0' : '1'}`]]
      break
    case 'DELETE':
      retour = `DELETE ${Number(data[6].replace(';', '')) === 154 ? '0' : '1'}`
      break
    case '\\dt':
      retour = [['Data']]
      break
  }
  return retour
}

const Database = require('../src/database')

class DatabaseTest {
  static tearsDown () {
    child_process.execSync = execSync
  }

  /**
   * Test du constructeur
   * @see Database
   */
  static constructorTest () {
    const config = { hostname: 'localhost', username: 'TestUser', password: 'Password', port: 5432, base: 'TestDB', scripts: `${__dirname}/sql` }
    // Vérification de l'affectation des attributs
    DatabaseTest.object = new Database(config)
    runner('ok', DatabaseTest.object instanceof Database)
    runner('equal', DatabaseTest.object.hostname, config.hostname)
    runner('equal', DatabaseTest.object.username, config.username)
    runner('equal', DatabaseTest.object.port, config.port)
    runner('equal', DatabaseTest.object.base, config.base)
    runner('equal', DatabaseTest.object.scripts, config.scripts)
    runner('equal', process.env.PGPASSWORD, config.password)
  }

  /**
   * Test de la connexion à la base de données
   * @see Database.testConnection
   */
  static testConnectionTest () {
    // Verification dee
    dbKO = true
    runner('throws', DatabaseTest.object.testConnection, 'Pas de base')
    dbKO = false
  }

  /**
   * Test de l'initialisation de la base de données
   * @see Database.initDatabase
   */
  static initDatabaseTest () {
    // Vérification que la fonction n'as pas d'erreur et ne retourne rien
    runner('equal', DatabaseTest.object.initDatabase(), undefined)
  }

  /**
   * Test de l'exécution des migrations
   * @see Database.executeMigration
   */
  static executeMigrationTest () {
    // Vérification de la gestion d'erreur
    dbKO = true
    runner('throws', DatabaseTest.object.executeQuery, 'Pas de base')
    dbKO = false
  }

  /**
   * Test de l'exécution des requêtes
   * @see Database.executeQuery
   */
  static executeQueryTest () {
    // Vérification de la gestion d'erreur
    dbKO = true
    runner('throws', DatabaseTest.object.executeQuery, 'Pas de base')
    dbKO = false
    // Vérification de l'exécution des requêtes
    runner('deepEqual', DatabaseTest.object.executeQuery('SELECT * FROM partie ORDER BY id;'), [
      ['1', 'Marine vs Thibault', 'f'],
      ['2', 'Bernadette vs Fargolin', 't']
    ])
  }

  /**
   * Test de récupération des parties
   * @see Database.getGames
   */
  static async getGamesTest () {
    // Vérification de la gestion d'erreur
    dbKO = true
    runner('rejects', DatabaseTest.object.getGames())
    dbKO = false
    // Vérification de la récupération des partie
    runner('deepEqual', await DatabaseTest.object.getGames(), [
      { gameId: '1', gameName: 'Marine vs Thibault', finished: false },
      { gameId: '2', gameName: 'Bernadette vs Fargolin', finished: true }])
  }

  /**
   * Test d'ajout d'une partie
   * @see Database.addPartie
   */
  static async addGameTest () {
    // Vérification de la gestion d'erreur
    runner('rejects', DatabaseTest.object.addGame('Test'), /2,INSERT 1 0/)
    dbKO = true
    runner('rejects', DatabaseTest.object.addGame('Test'))
    dbKO = false

    // Vérification de l'ajout d'une partie
    runner('equal', await DatabaseTest.object.addGame('truc'), '2')
  }

  /**
   * Test due la mise à jour
   * @see Database.toggleFinished
   */
  static async toggleFinishedTest () {
    // Vérification de la vérification des paramètres
    runner('rejects', DatabaseTest.object.toggleFinished('Bonjour'), new Error('NaN'))

    // Vérification de la gestion d'erreur
    runner('rejects', DatabaseTest.object.toggleFinished(154), /t,UPDATE 0/)
    dbKO = true
    runner('rejects', DatabaseTest.object.toggleFinished(154))
    dbKO = false

    // Vérification de retour de la fonction vide
    runner('equal', await DatabaseTest.object.toggleFinished(1), 't')
  }

  /**
   * Test de suppression d'une partie
   * @see Database.deleteGame
   */
  static async deleteGameTest () {
    // Vérification de la vérification des paramètres
    runner('rejects', DatabaseTest.object.deleteGame('Bonjour'), new Error('NaN'))

    // Vérification de la gestion d'erreur
    runner('rejects', DatabaseTest.object.deleteGame(154), /DELETE 0/)
    dbKO = true
    runner('rejects', DatabaseTest.object.deleteGame(154))
    dbKO = false

    // Vérification de retour de la fonction vide
    runner('ok', await DatabaseTest.object.deleteGame(1) === undefined)
  }
}

/** @type Database */
DatabaseTest.object = {}

module.exports = DatabaseTest
