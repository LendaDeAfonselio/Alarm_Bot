/* eslint-disable no-use-before-define */
'use strict';

const auth = require('./../auth.json');
const utility = require('./../Utils/utility_functions');
const utility_functions = require('./../Utils/utility_functions');
const db_alarms = require('../data_access/alarm_index');
const { SlashCommandBuilder } = require('@discordjs/builders');
const logging = require('../Utils/logging');

const optionFlag = 'id-only';
const allInfoFlag = 'all-info';
module.exports = {
    name: 'myAlarms',
    description: 'Fetches all of your alarms.\n`myAlarms -id` sends a non embed message with the ids for easier copy/pasting on phone.',
    usage: auth.prefix + 'myAlarms',
    data: new SlashCommandBuilder()
        .setName('myalarms')
        .setDescription('Fetches all alarms')
        .addSubcommand(option => option.setName(optionFlag).setDescription('The message only contains the id of the alarms when assigning yes to this field'))
        .addSubcommand(option => option.setName(allInfoFlag).setDescription('Contains all info')),
    async execute(interaction) {
        let flag = interaction.options.getSubcommand();
        let guild_id = interaction.channel.type === 'dm' ? '' : interaction.guild?.id;

        let results_pub = await db_alarms.get_all_alarms_from_user_and_guild(interaction.user.id, guild_id);
        let results_ota_pub = await db_alarms.get_all_oneTimeAlarm_from_user(interaction.user.id, interaction.guild?.id);
        let results_tts = await db_alarms.get_all_ttsalarms_from_user_and_guild(interaction.user.id, guild_id);

        if (flag && flag === optionFlag) {
            let id_stg = '**Public Alarms**:\n';
            results_pub.forEach(alarm => {
                id_stg += `${alarm.alarm_id}\n`;
            });
            results_ota_pub.forEach(ota => {
                id_stg += `${ota.alarm_id}\n`;
            });
            results_tts.forEach(ta => {
                id_stg += `${ta.alarm_id}\n`;
            });
            let chunks = utility_functions.chunkArray(id_stg, 2000);


            for (let chunk of chunks) {
                await interaction.reply(chunk);
            }

            chunks = utility_functions.chunkArray(id_stg, 2000);
            return;
        }

        // create alarm messages
        let general_alarms = createMessageWithEntries(results_pub);
        let tts_alarms = createMessageWithEntries(results_tts);

        // ota message
        let general_otas = createMessageWithOTAEntries(results_ota_pub);

        // chunk it because of the max size for discord messages
        let public_chunks = utility.chunkArray(general_alarms, 20);

        let public_chunks2 = utility.chunkArray(general_otas, 20);

        let tts_chunks = utility.chunkArray(tts_alarms, 20);

        if (general_alarms.length <= 0 && tts_alarms.length <= 0 && general_otas <= 0) {
            await interaction.reply('You do not have alarms in this server!');
        }

        // send public alarms
        const alarmsEmbed = makeEmbedsForPubMsg(public_chunks, 'Your public alarms in this server are:');
        const otaembeds = makeEmbedsForPubMsg(public_chunks2, 'Your public one time alarms in this server are:');
        const ttsembeds = makeEmbedsForPubMsg(tts_chunks, 'Your TTS alarms for this server are:');
        const all_embeds = [...alarmsEmbed, ...otaembeds, ...ttsembeds];
        if (all_embeds.length > 0) {
            await interaction.reply({
                embeds: all_embeds
            });
        }
    }
};

function makeEmbedsForPubMsg(public_chunks, title_message) {
    let embeds = [];
    for (let chunk of public_chunks) {
        let e = {
            color: 0xff80d5,
            title: title_message,
            fields: chunk,
        };
        embeds.push(e);
    }
    return embeds;
}

function createMessageWithEntries(msgs) {
    let general_alarms = [];
    for (let alarm of msgs) {
        let alarm_id = alarm.alarm_id;
        let alarm_params = alarm.alarm_args;
        let alarm_preview = alarm.message.substring(0, 30);
        let active_alarm = alarm.isActive ? 'Active' : 'Silenced';
        let server = (alarm.server_name ?? alarm.guild) ?? 'N/A';
        let field = {
            name: `ID: ${alarm_id}`,
            value: `\tWith params: ${alarm_params}\nMessage: ${alarm_preview}\n${active_alarm}\nIn server: ${server}`
        };
        general_alarms.push(field);
    }
    return general_alarms;
}

function createMessageWithOTAEntries(results) {
    let general_alarms = [];
    for (let alarm of results) {
        let alarm_id = alarm.alarm_id;
        let alarm_params = alarm.alarm_date;
        let alarm_preview = alarm.message.substring(0, 30);
        let server = alarm.server_name ?? alarm.guild;
        let field = {
            name: `ID: ${alarm_id}`,
            value: `\tFor date: ${alarm_params}\nMessage: ${alarm_preview}\nIn server: ${server}`
        };
        general_alarms.push(field);

    }
    return general_alarms;
}