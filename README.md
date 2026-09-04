# 🤖 Tut'Helper V3

Bot Discord de vérification des étudiants et d'attribution automatique des rôles de filière et de campus pour le tutorat santé.

---

## ⚙️ Fonctionnement du Code

* **`index.js`** : Point d'entrée principal. Initialise le client Discord, charge l'ensemble des commandes et intercepte les interactions (`/verify`, `/setup`).
* **`verify.js`** : Commande `/verify <numéro_étudiant>`.
  * Scanne les 8 onglets du Google Sheet (`PASS Brabois`, `PASS Bridoux`, `LAS 1 Brabois`, `LAS 1 Bridoux`, `LAS 2 Brabois`, `LAS 2 Bridoux`, `LAS 3 Brabois`, `LAS 3 Bridoux`).
  * Attribue automatiquement le rôle de filière et le rôle de campus correspondant à l'étudiant.
  * Renomme l'utilisateur sur le serveur sous la forme `Prénom N.`.
* **`setup.js`** : Commande `/setup <nouveau_serveur_id> <sheet_id>`.
  * Vérifie que les 6 rôles indispensables (`PASS`, `LAS 1`, `LAS 2`, `LAS 3`, `Brabois`, `Bridoux`) existent bien sur le nouveau serveur.
  * Met à jour le fichier local `state.json` pour basculer l'activité du bot et synchronise les commandes Slash.
* **`sheetService.js`** : Service de lecture en temps réel des onglets Google Sheets via leur flux JSON public.
* **`deployService.js`** : Gère l'enregistrement et le nettoyage des Slash Commands via l'API REST de Discord.

---

## 🖥️ Déploiement et Maintenance sur le Serveur VPS (Ionos)

Le bot tourne en arrière-plan sur une instance Ubuntu avec **PM2** sous le nom de processus `TuthelperV3`.

### 1. Modifier un fichier et actualiser le bot
1. Modifier le fichier en local sur votre machine.
2. Envoyer le fichier mis à jour vers le serveur :
   ```bash
   scp "chemin/vers/fichier.js" "root@212.132.111.205:/root/Tuthelper V3/"
