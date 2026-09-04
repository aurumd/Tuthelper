const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { deployCommandsToGuild, clearCommandsFromGuild } = require('./deployService');

const STATE_PATH = path.join(__dirname, 'state.json');

function getState() {
    if (!fs.existsSync(STATE_PATH)) return { activeGuildId: null, sheetId: null };
    try {
        return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    } catch {
        return { activeGuildId: null, sheetId: null };
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Transfère l\'activité du bot et déploie les commandes sur le nouveau serveur')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('nouveau_serveur_id')
                .setDescription('ID du nouveau serveur Discord')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('sheet_id')
                .setDescription('ID ou URL du Google Sheet des inscrits')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const state = getState();

        // 1. Sécurité : vérifier que l'appel provient du serveur actif (sauf lors de la toute première initialisation)
        if (state.activeGuildId && interaction.guildId !== state.activeGuildId) {
            return interaction.editReply(
                `❌ **Action non autorisée** : Cette commande doit être exécutée depuis le serveur officiel actuel (\`${state.activeGuildName || state.activeGuildId}\`).`
            );
        }

        const targetGuildId = interaction.options.getString('nouveau_serveur_id').trim();
        let sheetInput = interaction.options.getString('sheet_id').trim();

        // Extraction de l'ID si une URL complète est fournie
        const urlMatch = sheetInput.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (urlMatch) {
            sheetInput = urlMatch[1];
        }

        // 2. Vérification que le bot a bien rejoint le nouveau serveur
        const targetGuild = interaction.client.guilds.cache.get(targetGuildId);
        if (!targetGuild) {
            return interaction.editReply(
                `❌ **Le bot n'a pas trouvé le serveur cible** (\`${targetGuildId}\`).\nAssure-toi de l'avoir invité sur le nouveau serveur avant de lancer cette commande.`
            );
        }

        // 3. Diagnostic des rôles requis sur le serveur cible (Filières + Campus)
        const requiredRoles = ['PASS', 'LAS 1', 'LAS 2', 'LAS 3', 'Brabois', 'Bridoux'];
        let roleReport = '';
        let missingRoles = 0;

        for (const roleName of requiredRoles) {
            const foundRole = targetGuild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
            if (foundRole) {
                roleReport += `• **${roleName}** : Trouvé (\`@${foundRole.name}\`)\n`;
            } else {
                roleReport += `• **${roleName}** : ⚠️ *Introuvable*\n`;
                missingRoles++;
            }
        }

        if (missingRoles > 0) {
            return interaction.editReply(
                `⚠️ **Transition suspendue** : ${missingRoles} rôle(s) obligatoire(s) manquent sur le nouveau serveur (${targetGuild.name}) :\n\n` +
                `${roleReport}\n` +
                `Crée ces rôles sur le nouveau serveur puis relance la commande.`
            );
        }

        // 4. Déploiement automatique des slash commands sur le nouveau serveur
        try {
            await deployCommandsToGuild(targetGuild.id);
            if (state.activeGuildId && state.activeGuildId !== targetGuild.id) {
                // Nettoyage des commandes de l'ancien serveur
                await clearCommandsFromGuild(state.activeGuildId);
            }
        } catch (deployErr) {
            console.error('Erreur lors du déploiement automatique des commandes :', deployErr);
            return interaction.editReply('❌ **Erreur technique** lors du déploiement des commandes sur le nouveau serveur.');
        }

        // 5. Sauvegarde de la nouvelle configuration
        const newState = {
            activeGuildId: targetGuild.id,
            activeGuildName: targetGuild.name,
            sheetId: sheetInput,
            transferredAt: new Date().toISOString(),
            transferredBy: interaction.user.tag
        };

        fs.writeFileSync(STATE_PATH, JSON.stringify(newState, null, 2), 'utf-8');

        // 6. Message récapitulatif
        let successMessage = `## ✅ Transition et déploiement réussis !\n\n`;
        successMessage += `• **Nouveau serveur actif :** **${targetGuild.name}** (\`${targetGuild.id}\`)\n`;
        successMessage += `• **Commandes Slash :** Déployées et immédiatement actives sur le nouveau serveur.\n`;
        successMessage += `• **Google Sheet :** \`${sheetInput}\`\n\n`;
        successMessage += `✨ Les étudiants peuvent dès à présent utiliser \`/verify\` sur le nouveau serveur.`;

        await interaction.editReply({ content: successMessage });
    }
};