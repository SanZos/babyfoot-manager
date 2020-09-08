const fs = require('fs')
const path = require('path')

/**
 * Constante des type MIME
 */
const mime = {
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.html': 'text/html',
  '.css': 'text/css',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
}

/**
 * Routeur HTTP
 * @param {string} basePath
 */
class WebRouter {
  /**
   * Création de l'instance du routeur
   * @param {Object} configuration configuration du routeur
   */
  constructor (configuration) {
    this.basePath = configuration.clientPath
  }

  /**
   * Gestion de la route et envoie de l'HTML
   * @param {Request} req requête web à router
   * @param {Response} res reponse socket de réponse
   */
  handle (req, res) {
    const [type, file] = this.route(req.url)
    if (type === null || file === null) {
      res.writeHead(404, { 'Content-Type': 'text/html' })
      res.end('<html><body style="display: flex;background-color: #242933;color: #D8DEE9;justify-content: center;align-items: center;"><h1>404 - NOT FOUND</h1></body></html>')
    } else {
      res.writeHead(200, { 'Content-Type': mime[type] })
      res.end(fs.readFileSync(file))
    }
  }

  /**
  //  * Verification de l'existence du fichier et extraction de l'extension
   * @param {string} filePath le fichier à récupérer et à servir
   */
  route (filePath) {
    if (filePath === '/') {
      filePath = '/index.html'
    }
    if (fs.existsSync(`${this.basePath}${filePath}`)) {
      return [path.extname(filePath), `${this.basePath}${filePath}`]
    } else return [null, null]
  }
}

module.exports = WebRouter
