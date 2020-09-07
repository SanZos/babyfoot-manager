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
