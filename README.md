# Projet BabyFoot Manager

## Description du projet
BabyFoot Manager est une application web de type RIA permettant de créer des parties de babyfoot.
Sa particularité sera de pouvoir créer des parties de manière collaborative.

## Choix et implémentation
## Norme de codage
La norme utilisée pour le javascript est [standardjs](https://standardjs.com/)

### WebSocket
Pour les WebSockets côté serveur j'ai décidé de coder le minimum requis pour le fonctionnement de l'application.
Dans l'implémentation ne sont gérées que :
- les trames dont le payload est sur 7 bits
- les trames de type texte
- les trames non fragmentées


## Installation 
### Pré-requis
* Node v10 (Testé sur la 10.22.0)
* PostgreSQL 11.9
* Disposer du client psql sur la machine hébergeant le serveur
* L'utilisateur lançant le serveur doit disposer des droits pour utiliser psql

### Base de données

Création d'un utilisateur en base
```shell
$ sudo -u postgres -i
$ createuser --pwprompt babyfoot
Enter password for new role: 
Enter it again: 
$ psql
# CREATE DATABASE babyfootmanager;
# GRANT ALL ON DATABASE babyfootmanager TO babyfoot;
```

### Lancement des tests 

Se positionner dans le répertoire d'installation puis lancer

```shell
$ # Pour les tests en verbose
$ npm test
$ # Pour les tests avec un retour bref
$ SMALL_LOG=true npm test
```

### Configuration de l'application

Modifier le fichier ./static/configuration.json avec les valeurs correspondant à l'environnement

```json
{
    "server": {
        "port": <Port d'ecoute HTTP>, 
        "clientPath": <Répertoire de stockage du client> 
    },
    "database": {
        "hostname": <Hostname de la base donnée>,
        "port": <Port de la base donnée>,
        "username": <Utilisateur de la base de donnée>,
        "password": <Mot de passe de l'utilisateur de la base de donnée>,
        "base": <Nom de la base de donnée>,
        "scripts": <Répertoire contenants les scripts de migration>
    }
}
```

### Lancement de l'application

Se positionner dans le répertoire d'installation puis lancer

```shell
$ npm run start
```

## Utilisation de l'application

![Page de garde](/docs/accueil.png)

La gestion des parties se retrouve sur la partie gauche de l'écran

![Partie](/docs/parties.png)

