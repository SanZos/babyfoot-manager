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
* Disposer du client psql sur la machine hébergeant le serveur (l'avoir dans le PATH pour windows)
* L'utilisateur lançant le serveur doit disposer des droits pour utiliser psql

### Base de données

Création d'un utilisateur en base

*Pour Linux*
```shell
sudo -u postgres -i
createuser --pwprompt babyfoot
Enter password for new role: 
Enter it again: 
psql
```

*Pour Windows*
```shell
createuser -U postgres --pwprompt babyfoot
Enter password for new role: 
Enter it again: 
psql -U postgres
```

Dans le prompt psql

```shell
CREATE DATABASE babyfootmanager;
GRANT ALL ON DATABASE babyfootmanager TO babyfoot;
```

### Lancement des tests 

Se positionner dans le répertoire d'installation puis lancer

```shell
# Pour les tests en verbose
npm test
```

*Pour Linux*
```shell
# Pour les tests avec un retour bref
SMALL_LOG=true npm test
```

*Pour Windows PowerShell*
```shell
# Pour les tests avec un retour bref
$env:SMALL_LOG=true 
npm test
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
npm run start
```

## Utilisation de l'application

![Page de garde](/docs/accueil.png)


### Gestionnaire de partie de babyfoot
La gestion des parties se retrouve sur la partie gauche de l'écran

![Partie](/docs/parties.png)

Cet affichage se découpe en plusieurs blocs.

Tout d'abord la boîte de texte qui permet de saisir le nom d'une partie et de l'ajouter à la liste lors de l'appui sur la touche entrée.

La deuxième partie, qui se trouve en dessous, regroupe les parties sauvegardées. Il y a un compteur de partie en cours, et en dessous, une ligne par partie.

Chaque ligne de partie a un bouton de chaque côté.

Le bouton de gauche qui donne l'état de la partie, gris pour une partie en cours et vert pour une partie fini. Aux cliques sur le bouton, on change l'état de la partie.

Le bouton de droite permet, quant à lui, de supprimer une partie après validation de la boîte de confirmation.

### Chat

![Chat](/docs/chat.png)

La fenêtre de chat se trouve sur la gauche de l'écran.

On peut changer de nom d'utilisateur en double cliquant sur le nom en vert en haut. Validez le changement de nom en appuyant sur la touche entrée.
Le nouveau nom est envoyé aux autres utilisateurs et vos précédents messages sont mis à jour.

Au centre se trouvent les messages envoyer par vous et les autres personnes connectées.

En bas se trouve la boîte de texte qui permet de saisir les messages, ils sont envoyés à l'appui sur la touche entrée.
