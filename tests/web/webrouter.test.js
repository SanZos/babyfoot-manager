const fs = require('fs')

const { runner } = require('../testUtils')
const WebRouter = require('../../src/web/webrouter')

const HTTP_404_HTML = '<html><body style="display: flex;background-color: #242933;color: #D8DEE9;justify-content: center;align-items: center;"><h1>404 - NOT FOUND</h1></body></html>'

class WebRouterTest {
  /**
   * Test du constructeur
   * @see WebRouter()
   */
  static constructorTest () {
    WebRouterTest.object = new WebRouter({ clientPath: '' })
    // Test de la création de l'objet
    runner('ok', (WebRouterTest.object instanceof WebRouter))

    // Test de l'accès et de la valeur de l'option passé
    runner('equal', WebRouterTest.object.basePath, '')

    // Test de l'attribution de la valeur
    runner('equal', new WebRouter({ clientPath: './static/' }).basePath, './static/')

    // Test de la non collision de donnée
    runner('notEqual', WebRouterTest.object.basePath, './static/')
  }

  /**
   * Test de handle
   * @see WebRouter.handle()
   */
  static handleTest () {
    /**
     * MockUp
     */
    const res = {
      head: [],
      data: '',
      writeHead: (code, header) => { res.head = [code, header] },
      end: (data) => { res.data = data }
    }
    // Test de l'existence de la méthode
    runner('equal', typeof WebRouterTest.object.handle, 'function')

    // Test de l'erreur 404
    WebRouterTest.object.handle({ url: '/' }, res)
    // Header
    runner('deepEqual', res.head, [404, { 'Content-Type': 'text/html' }])
    // Texte
    runner('equal', res.data, HTTP_404_HTML)

    // Test d'un fichier existant
    res.head = []
    res.data = ''
    WebRouterTest.object.handle({ url: `${__dirname}/webrouter.test.js` }, res)
    // Header
    runner('deepEqual', res.head, [200, { 'Content-Type': 'application/javascript' }])
    // Texte
    runner('equal', res.data.toString(), fs.readFileSync(`${__dirname}/webrouter.test.js`).toString())
  }

  static routeTest () {
    // Test de l'existence de la méthode
    runner('equal', typeof WebRouterTest.object.route, 'function')

    // Test du retour si le fichier n'existe pas
    runner('deepEqual', WebRouterTest.object.route('/'), [null, null])

    // Test du retour d'un fichier existant
    runner('deepEqual', WebRouterTest.object.route(`${__dirname}/webrouter.test.js`), ['.js', `${__dirname}/webrouter.test.js`])
  }
}

WebRouterTest.object = {}

module.exports = WebRouterTest
