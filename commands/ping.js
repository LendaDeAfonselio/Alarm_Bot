'use strict';
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Ping!'),
    name: 'ping',
    description: 'Ping!',
    usage: '`/ping`',
    async execute(interaction) {
        await interaction.reply('Pong!');
    }
};