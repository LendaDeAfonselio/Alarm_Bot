"use strict";

const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');

const auth = require('./../auth.json');
const time_utils = require('../Utils/time_validation');
const logging = require('../Utils/logging');

const utility_functions = require('../Utils/utility_functions');

async function getAlarmById(alarm_id) {
    if (alarm_id_to_change.includes(auth.private_prefix)) {
        return await Private_alarm_model.findOne({ "alarm_id": alarm_id });
    } else if (!alarm_id_to_change.includes(auth.one_time_prefix)) {
        return await Alarm_model.findOne({ "alarm_id": alarm_id });
    }
    return undefined;
}

function editCronForAlarm(cron, cron_list, newMsg, channel_discord, msg, alarm_list) {
    for (let alarm of alarm_list) {
        var k = alarm.alarm_id;
        if (k.includes(auth.private_prefix)) {
            updateCronWithParamsAndMessage(cron, cron_list, k, alarm.alarm_args, msg.author, newMsg);
        } else if (!k.includes(auth.one_time_prefix)) {
            updateCronWithParamsAndMessage(cron, cron_list, k, alarm.alarm_args, channel_discord, newMsg);
        }
    };
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

async function editAlarmMessageOnDatabase(newMsg, newChannel, alarm_id_regex, guild_id) {
    try {
        var publicUpdate = await Alarm_model.updateMany(
            { "$and": [{ alarm_id: { "$regex": `.*${alarm_id_regex}.*` } }, { guild: guild_id }] },
            { message: newMsg, channel: newChannel }
        );

        var privateUpdate = await Private_alarm_model.updateMany(
            { alarm_id: { "$regex": `.*${alarm_id_regex}.*` } },
            { message: newMsg }
        );
        logging.logger.info(`Updated the message for ${publicUpdate.nModified} public alarms and ${privateUpdate.nModified} private alarms with regex ${alarm_id_regex}`);
        return privateUpdate.nModified + publicUpdate.nModified;
    } catch (err) {
        logging.logger.info(`An error while trying to update the alarms with regex ${alarm_id_regex}.`);
        logging.logger.error(err);
    }
    return 0;
}

async function editAlarmCronArgsOnDatabase(new_cron, alarm_id_to_change) {
    try {
        if (alarm_id_to_change.includes(auth.private_prefix)) {
            var privateUpdate = await Private_alarm_model.updateOne(
                { alarm_id: alarm_id_to_change },
                { alarm_args: new_cron }
            );
            return checkIfUpdated(privateUpdate, alarm_id_to_change, new_cron, 'with the same message');
        } else if (!alarm_id_to_change.includes(auth.one_time_prefix)) {
            var publicUpdate = await Alarm_model.updateOne(
                { alarm_id: alarm_id_to_change },
                { alarm_args: new_cron }
            );
            return checkIfUpdated(publicUpdate, alarm_id_to_change, new_cron, 'with the same message');
        }
    } catch (err) {
        logging.logger.info(`An error while trying to update the alarms with regex ${alarm_id_regex}.`);
        logging.logger.error(err);
    }
    return 0;
}

async function editAlarmCronAndMessageOnDatabase(new_msg, new_cron, alarm_id_to_change, new_channel, guild_id) {
    try {
        if (alarm_id_to_change.includes(auth.private_prefix)) {
            var privateUpdate = await Private_alarm_model.updateOne(
                { alarm_id: alarm_id_to_change },
                { message: new_msg, alarm_args: new_cron }
            );
            return checkIfUpdated(privateUpdate, alarm_id_to_change, new_cron, new_msg);
        } else if (!alarm_id_to_change.includes(auth.one_time_prefix)) {
            var publicUpdate = await Alarm_model.updateOne(
                { "$and": [{ alarm_id: alarm_id_to_change }, { guild: guild_id }] },
                { message: new_msg, alarm_args: new_cron, channel: new_channel }
            );
            return checkIfUpdated(publicUpdate, alarm_id_to_change, new_cron, new_msg);
        }
    } catch (err) {
        logging.logger.info(`An error while trying to update the alarms with regex ${alarm_id_regex}.`);
        logging.logger.error(err);
    }
    return 0;
}

function checkIfUpdated(updateObject, alarm_id_to_change, new_cron, new_message) {
    if (updateObject.modifiedCount > 0) {
        logging.logger.info(`Updated the cron for ${alarm_id_to_change} to ${new_cron} and ${new_message}`);
        return 1;
    } else {
        logging.logger.info(`No alarms were updated... Maybe id ${alarm_id_to_change} was incorrect?`);
    }
    return 0;
}

function extractChannelAndMessage(channel, msg, message_stg, args, startIndex) {
    var hasSpecifiedChannel = utility_functions.isAChannel(channel);
    let channel_discord = msg.channel;
    if (hasSpecifiedChannel) {
        channel_discord = msg.guild.channels.cache.get(channel.replace(/[<>#]/g, ''));
        message_stg = args.slice(startIndex, args.length).join(' ');
    }
    return { channel_discord, message_stg };
}

module.exports = {
    name: 'editAlarm',
    description: 'Allows the user to edit the alarm. Use the following flags:\n' +
        '`-m` - Allows the user to alter the message and, if applies, the channel to which the message is sent.\n' +
        '`-c` - Allows the user to alter the cron parameters.\n' +
        'You can combine both flags to change the parameter and message at the same time',
    usage: auth.prefix + this.name + ' -m <alarm_id_regex> <message> <channel?>\n' +
        auth.prefix + this.name + ' -c <alarm_id> <timezone/city/UTC> <minute> <hour> <day_of_the_month> <month> <weekday>\n' +
        auth.prefix + this.name + ' -c -m <alarm_id> <timezone/city/UTC> <minute> <hour> <day_of_the_month> <month> <weekday> <message> <channel?>\n',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        let is_dm = msg.channel.type === 'dm';
        if (args.length >= 3 && utility_functions.compareIgnoringCase(args[0], "-m")) {
            let guildId = undefined;
            if (!is_dm) {
                guildId = msg.guild.id;
            }
            var alarm_id = args[1];
            var message_stg = args.slice(2, args.length).join(' ');
            var channel = args.pop();
            let channel_discord;
            ({ channel_discord, message_stg } = extractChannelAndMessage(channel, msg, message_stg, args, 2));

            if (channel_discord !== undefined) {
                var public_alarms = new Array();
                if (!is_dm) {
                    public_alarms = await Alarm_model.find(
                        { "$and": [{ alarm_id: { "$regex": `.*${alarm_id}.*` } }, { guild: guildId }] }
                    );
                }
                var private_alarms = await Private_alarm_model.find(
                    { alarm_id: { "$regex": `.*${alarm_id}.*` } }
                );

                let combination = public_alarms.concat(private_alarms);

                await editAlarmMessageOnDatabase(message_stg, channel_discord.id, alarm_id, guildId);
                editCronForAlarm(cron, cron_list, message_stg, channel_discord, msg, combination);
                msg.channel.send(`Updated the message for ${combination.length} alarms that contain \`${alarm_id}\` in the id`);
            } else {
                msg.channel.send('It was not possible to utilize the channel to send the message... Please check the setting of the server and if the bot has the necessary permissions!');
            }
        } else if (args.length >= 8 && utility_functions.compareIgnoringCase(args[0], "-c")) {
            var alarm_id = args[1];
            var timezone = args[2];
            var crono = args.slice(3, 8).join(' ');
            var alarm = await getAlarmById(alarm_id);
            if (alarm === undefined) {
                msg.channel.send('No alarm found with that id');
                return;
            }
            var difference = time_utils.get_offset_difference(timezone);
            console.log(crono);
            if (difference === undefined) {
                msg.channel.send('The timezone you have entered is invalid. Please do `' + auth.prefix + 'timezonesinfo` for more information');
                return;
            }
            else if (time_utils.validate_alarm_parameters(msg, crono, alarm.message)) {
                crono = time_utils.updateParams(difference, crono);
                let guild = msg.guild;
                let channel_id = alarm.channel;
                let channel = await guild.channels.cache.get(channel_id);
                if (channel !== undefined) {
                    await editAlarmCronArgsOnDatabase(crono, alarm_id);
                    updateCronWithParamsAndMessage(cron, cron_list, alarm_id, crono, channel, message_stg);
                } else {
                    msg.channel.send('Error setting up the alarm, please check the settings on this channel.');
                    return;
                }
            }
        } else if (args.length >= 10 &&
            utility_functions.compareIgnoringCase(args[0], "-c") &&
            utility_functions.compareIgnoringCase(args[1], "-m")) {
            var alarm_id = args[2];
            var timezone = args[3];
            var crono = args.slice(4, 9).join(' ');
            var message_stg = args.slice(9, args.length).join(' ');
            var channel = args.pop();
            ({ channel_discord, message_stg } = extractChannelAndMessage(channel, msg, message_stg, args, 9));
            if (channel_discord === undefined) {
                msg.channel.send('It was not possible to utilize the channel to send the message... Please check the setting of the server and if the bot has the necessary permissions!');
                return;
            }
            var difference = time_utils.get_offset_difference(timezone);
            console.log(crono);
            if (difference === undefined) {
                msg.channel.send('The timezone you have entered is invalid. Please do `' + auth.prefix + 'timezonesinfo` for more information');
                return;
            }
            else if (time_utils.validate_alarm_parameters(msg, crono, message_stg)) {
                crono = time_utils.updateParams(difference, crono);
                var alarm = await getAlarmById(alarm_id);
                if (alarm === undefined) {
                    msg.channel.send('No alarm found with that id');
                    return;
                }
                let guild = msg.guild;
                await editAlarmCronAndMessageOnDatabase(message_stg, crono, alarm_id, channel_discord, guild.id);
                updateCronWithParamsAndMessage(cron, cron_list, alarm_id, crono, channel, message_stg);
            }
        } else {
            msg.channel.send('Incorrect usage of the command\n' + 'Usage: ' + this.usage)
        }
    }
}
