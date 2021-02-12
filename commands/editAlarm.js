"use strict";

const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');

const auth = require('./../auth.json');
const time_utils = require('../Utils/time_validation');
const utils = require('../Utils/utility_functions');
const logging = require('../Utils/logging');

const utility_functions = require('../Utils/utility_functions');
const channel_regex = /<#\d+>/;

function editCronForAlarm()

async function editAlarmMessageOnDatabase(newMsg, newChannel, cron, alarm_id_regex, guild) {
    await Alarm_model.updateMany(
        { "$and": [{ alarm_id: { "$regex": `.*${alarm_id_regex}.*` } }, { guild: guild }] },
        { message: newMsg, alarm_args: cron, channel: newChannel }
    );

    await Private_alarm_model.updateMany(
        { alarm_id: { "$regex": `.*${alarm_id_regex}.*` } },
        { message: newMsg, alarm_args: cron }
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
                //let 
                editCronForAlarm(message_stg, alarm_id_regex);
                await editAlarmMessageOnDatabase(message_stg, channel_discord.id, alarm_cron, alarm_id_regex, guild);
            } else {
                msg.channel.send('It was not possible to utilize the channel to send the message... Please check the setting of the server and if the bot has the necessary permissions!');
            }
        } else if (args.length >= 8 && utility_functions.compareIgnoringCase(args[0], "-c")) {

        }
    }
}