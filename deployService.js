const { REST, Routes } = require('discord.js');
const { clientId, token } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');

const rest = new REST().setToken(token);

/**
 * Récupère le payload JSON de toutes les commandes disponibles
 */
function getCommandsPayload() {
    const ignoredFiles = ['index.js', 'deployService.js', 'sheetService.js'];
    const commands = [];
    
    const commandFiles = fs.readdirSync(__dirname).filter(file => 
        file.endsWith('.js') && !ignoredFiles.includes(file)
    );

    for (const file of commandFiles) {
        const filePath = path.join(__dirname, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        }
    }
    return commands;
}

/**
 * Déploie les commandes sur un serveur spécifique (instantané)
 */
async function deployCommandsToGuild(guildId) {
    const commands = getCommandsPayload();
    return await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
    );
}

/**
 * Supprime les commandes d'un serveur (pour nettoyer l'ancien)
 */
async function clearCommandsFromGuild(guildId) {
    return await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: [] }
    );
}

module.exports = { deployCommandsToGuild, clearCommandsFromGuild };

// --- Bloc d'exécution directe en ligne de commande ---
if (require.main === module) {
    const targetGuildId = process.argv[2];

    if (!targetGuildId) {
        console.error('❌ Veuillez préciser l\'identifiant du serveur cible.');
        console.log('👉 Utilisation : node deployService.js <GUILD_ID>');
        process.exit(1);
    }

    console.log(`🚀 Déploiement manuel en cours sur le serveur : ${targetGuildId}...`);

    deployCommandsToGuild(targetGuildId)
        .then(data => {
            console.log(`✅ Succès : ${data.length} commandes déployées sur le serveur ${targetGuildId}.`);
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ Erreur lors du déploiement manuel :', err);
            process.exit(1);
        });
}