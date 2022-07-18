'use strict';
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'premium',
    description: 'Information about premium membership',
    usage: '`/premium`',
    data: new SlashCommandBuilder()
        .setName('premium')
        .setDescription('Information about premium membership'),
    execute(interaction) {
        interaction.reply('Get access to 75 alarms by getting premium membership for 2.85€ per month: https://ko-fi.com/summary/58d0513c-2b41-482e-8814-805b7d56b098');
    },
};