"use strict";

const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');

const auth = require('./../auth.json');
const time_utils = require('../Utils/time_validation');
const utils = require('../Utils/utility_functions');
const logging = require('../Utils/logging');

const utility_functions = require('../Utils/utility_functions');
const channel_regex = /<#\d+>/;

function editCronForAlarm(cron, cron_list, newMsg, alarm_id_regex, channel_discord, msg) {
    for (let k of Object.keys(cron_list)) {
        if (k.includes(alarm_id_regex)) {
            let alarm_id = k;
            let value = cron_list[alarm_id];
            let cron_old = value.cronTime.source;
            // stop and delete the alarm...
            if (k.includes(auth.private_prefix)) {
                updateCronWithParamsAndMessage(cron, cron_list, alarm_id, cron_old, msg.author, newMsg);
            } else {
                updateCronWithParamsAndMessage(cron, cron_list, alarm_id, cron_old, channel_discord, newMsg);
            }
        }
    }
}

function updateCronWithParamsAndMessage(cron, cron_list, alarm_id, cron_old, channel_discord, newMsg) {
    cron_list[alarm_id].stop();
    delete cron_list[alarm_id];

    // create the cron event to send the message...
    let scheduledMessage = new cron(cron_old, () => {
        channel_discord.send(`${newMsg}`);
    }, {
        scheduled: true
    });
    scheduledMessage.start();
    cron_list[alarm_id] = scheduledMessage;
}

async function editAlarmMessageOnDatabase(newMsg, newChannel, alarm_id_regex, guild) {
    await Alarm_model.updateMany(
        { "$and": [{ alarm_id: { "$regex": `.*${alarm_id_regex}.*` } }, { guild: guild }] },
        { message: newMsg, channel: newChannel }
    );

    await Private_alarm_model.updateMany(
        { alarm_id: { "$regex": `.*${alarm_id_regex}.*` } },
        { message: newMsg }
    );
}

module.exports = {
    name: 'editAlarm',
    description: 'Allows the user to edit the alarm. Use the following flags:\n' +
        '`-m` - Allows the user to alter the message and, if applies, the channel to which the message is sent.\n' +
        '`-c` - Allows the user to alter the cron parameters.\n' +
        'You can combine both flags to change the parameter and message at the same time',
    usage: auth.prefix + this.name + ' -m <alarm_id_regex> <message> <channel?>\n' +
        auth.prefix + this.name + ' -c <alarm_id_regex> <timezone/city/UTC> <minute> <hour> <day_of_the_month> <month> <weekday>\n' +
        auth.prefix + this.name + ' -c -m <alarm_id_regex> <timezone/city/UTC> <minute> <hour> <day_of_the_month> <month> <weekday> <message> <channel?>\n',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        let guild = msg.guild.id;
        if (args.length >= 3 && utility_functions.compareIgnoringCase(args[0], "-m")) {
            var alarm_id_regex = args[1];
            var message_stg = args.slice(2, args.length).join(' ');
            var channel = args.pop();
            var hasSpecifiedChannel = utility_functions.isAChannel(channel);
            let channel_discord = msg.channel;
            if (hasSpecifiedChannel) {
                channel_discord = msg.guild.channels.cache.get(channel.replace(/[<>#]/g, ''));
                message_stg = args.slice(2, args.length).join(' ');
            }
            if (channel_discord !== undefined) {
                await editAlarmMessageOnDatabase(message_stg, channel_discord.id, alarm_id_regex, guild);
                editCronForAlarm(cron, cron_list, message_stg, alarm_id_regex);
            } else {
                msg.channel.send('It was not possible to utilize the channel to send the message... Please check the setting of the server and if the bot has the necessary permissions!');
            }
        } else if (args.length >= 8 && utility_functions.compareIgnoringCase(args[0], "-c")) {

        }
    }
}