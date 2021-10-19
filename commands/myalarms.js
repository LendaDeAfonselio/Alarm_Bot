"use strict";

const auth = require('./../auth.json');
const utility = require('./../Utils/utility_functions');
const utility_functions = require('./../Utils/utility_functions');
const db_alarms = require('../data_access/alarm_index');

module.exports = {
    name: 'myAlarms',
    description: 'Fetches all of your alarms.\n`myAlarms -id` sends a non embed message with the ids for easier copy/pasting on phone.',
    usage: auth.prefix + 'myAlarms',
    async execute(msg, args, client, cron, cron_list, mongoose) {

        let guild_id = msg.channel.type === 'dm' ? "" : msg.guild?.id;

        let results_pub = await db_alarms.get_all_alarms_from_user_and_guild(msg.author.id, guild_id);
        let results_priv = await db_alarms.get_all_privAlarms_from_user(msg.author.id);
        let results_ota_pub = await db_alarms.get_all_oneTimeAlarm_from_user(msg.author.id, false, msg.guild?.id);
        let results_ota_priv = await db_alarms.get_all_oneTimeAlarm_from_user(msg.author.id, true, msg.guild?.id);
        let results_tts = await db_alarms.get_all_ttsalarms_from_user_and_guild(msg.author.id, guild_id);

        if (args.length >= 1 && utility_functions.compareIgnoringCase(args[0], '-id')) {
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
                msg.channel.send(chunk);
            }

            id_stg = '**Private Alarms**:\n';
            results_priv.forEach(p_alarm => {
                id_stg += `${p_alarm.alarm_id}\n`;
            });

            id_stg += '**Private One Time Alarms:**\n';

            results_ota_priv.forEach(ota => {
                id_stg += `${ota.alarm_id}\n`
            })

            chunks = utility_functions.chunkArray(id_stg, 2000);

            for (let chunk of chunks) {
                msg.author.send(chunk);
            }
            return;
        }

        // create alarm messages
        let general_alarms = createMessageWithEntries(results_pub);
        let private_alarms = createMessageWithEntries(results_priv);
        let tts_alarms = createMessageWithEntries(results_tts);

        // ota message
        let general_otas = createMessageWithOTAEntries(results_ota_pub);
        let priv_otas = createMessageWithOTAEntries(results_ota_priv);


        // chunk it because of the max size for discord messages
        let public_chunks = utility.chunkArray(general_alarms, 20);
        let private_chunks = utility.chunkArray(private_alarms, 20);

        let public_chunks2 = utility.chunkArray(general_otas, 20);
        let private_chunks2 = utility.chunkArray(priv_otas, 20);

        let tts_chunks = utility.chunkArray(tts_alarms, 20);

        if (general_alarms.length <= 0 && tts_alarms.length <= 0) {
            msg.channel.send('You do not have alarms in this server!');
        }

        // send public alarms
        sendChunksAsPublicMsg(public_chunks, msg, "Your public alarms in this server are:");
        sendChunksAsPublicMsg(public_chunks2, msg, "Your public one time alarms in this server are:");
        sendChunksAsPublicMsg(tts_chunks, msg, "Your TTS alarms for this server are:");

        // send private alarms
        for (let chunk of private_chunks) {
            msg.author.send({
                embed: {
                    color: 0x5CFF5C,
                    title: "Your private alarms are:",
                    fields: chunk,
                    timestamp: new Date()
                }
            });
        }

        for (let chunk of private_chunks2) {
            msg.author.send({
                embed: {
                    color: 0xcc1100,
                    title: "Your private alarms are:",
                    fields: chunk,
                    timestamp: new Date()
                }
            });
        }

    }
}

function sendChunksAsPublicMsg(public_chunks, msg, title_message) {
    for (let chunk of public_chunks) {
        if (utility_functions.can_send_embeded(msg)) {
            msg.channel.send({
                embed: {
                    color: 0xff80d5,
                    title: title_message,
                    fields: chunk,
                    timestamp: new Date()
                }
            });
        } else {
            msg.channel.send('Embeded messages are disallowed for this server. Try turning them on or use `$myalarms -id`.');
        }
    }
}

function createMessageWithEntries(msgs) {
    let general_alarms = [];
    for (let alarm of msgs) {
        let alarm_id = alarm.alarm_id;
        let alarm_params = alarm.alarm_args;
        let alarm_preview = alarm.message.substring(0, 30);
        let active_alarm = alarm.isActive ? "Active" : "Silenced";
        let server = (alarm.server_name ?? alarm.guild) ?? "N/A";
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
        if (!alarm.isPrivate) {
            let server = alarm.server_name ?? alarm.guild;
            let field = {
                name: `ID: ${alarm_id}`,
                value: `\tFor date: ${alarm_params}\nMessage: ${alarm_preview}\nIn server: ${server}`
            };
            general_alarms.push(field);
        } else {
            let field = {
                name: `ID: ${alarm_id} (Private)`,
                value: `\tFor date: ${alarm_params}\nMessage: ${alarm_preview}`
            };
            general_alarms.push(field);
        }
    }
    return general_alarms;
}