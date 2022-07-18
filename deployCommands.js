'use strict';
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, token } = require('./appsettings.json');
const logging = require('./Utils/logging');
const fs = require('node:fs');

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(token);

async function registerSlashCommandsInGuild(guildId) {
    return await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
        .catch(logging.logger.error);
}

async function registerGlobalSlashCommands() {
    return await rest.put(Routes.applicationCommands(clientId), { body: commands })
        .catch(logging.logger.error);
}

registerGlobalSlashCommands()
    .then(result => logging.logger.info(`Setup ${result.length} global slash command alarms`))
    .catch(logging.logger.error);

module.exports = {
    registerSlashCommandsInGuild: registerSlashCommandsInGuild,
    registerGlobalSlashCommands: registerGlobalSlashCommands
};
