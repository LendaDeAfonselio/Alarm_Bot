'use strict';

const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { Client, Intents } = require('discord.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const auth = require('./../auth.json');
const time_utils = require('../Utils/time_validation');
const logging = require('../Utils/logging');

const utility_functions = require('../Utils/utility_functions');
const name_command = 'editalarm';

async function getAlarmById(alarm_id, guild_id) {
    if (utility_functions.isPrivateAlarm(alarm_id)) {
        return await Private_alarm_model.findOne({ alarm_id: alarm_id });
    } else if (utility_functions.isPublicAlarm(alarm_id)) {
        return await Alarm_model.findOne({ alarm_id: alarm_id, guild: guild_id });
    }
    return undefined;
}

function editCronForAlarm(cron, cron_list, newMsg, channel_discord, msg, alarm_list) {
    for (let alarm of alarm_list) {
        let k = alarm.alarm_id;
        if (utility_functions.isPrivateAlarm(k)) {
            updateCronWithParamsAndMessage(cron, cron_list, k, alarm.alarm_args, msg.author, newMsg);
        } else if (utility_functions.isPublicAlarm(k)) {
            updateCronWithParamsAndMessage(cron, cron_list, k, alarm.alarm_args, channel_discord, newMsg);
        }
    }
}

function updateCronWithParamsAndMessage(cron, cron_list, alarm_id, cron_old, channel_discord, newMsg) {
    cron_list[alarm_id].stop();
    delete cron_list[alarm_id];

    // create the cron event to send the message...
    let scheduledMessage = new cron(cron_old, () => {
        try {
            channel_discord.send(`${newMsg}`);
        } catch (err) {
            logging.logger.error(`Failed to send message for alarm with id ${alarm_id} after editing! Cause: ${err}`);
        }
    }, {
        scheduled: true
    });
    scheduledMessage.start();
    cron_list[alarm_id] = scheduledMessage;
}

async function editAlarmMessageOnDatabase(newMsg, newChannel, alarm_id_regex, guild_id, author_id) {
    try {
        let publicUpdate = await Alarm_model.updateOne(
            { $and: [{ alarm_id: alarm_id_regex }, { guild: guild_id }] },
            { message: newMsg, channel: newChannel }
        );

        let privateUpdate = await Private_alarm_model.updateOne(
            { $and: [{ alarm_id: alarm_id_regex }, { user_id: author_id }] },
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
        if (utility_functions.isPrivateAlarm(alarm_id_to_change)) {
            let privateUpdate = await Private_alarm_model.updateOne(
                { alarm_id: alarm_id_to_change },
                { alarm_args: new_cron }
            );
            return checkIfUpdated(privateUpdate, alarm_id_to_change, new_cron, 'with the same message');
        } else if (utility_functions.isPublicAlarm(alarm_id_to_change)) {
            let publicUpdate = await Alarm_model.updateOne(
                { alarm_id: alarm_id_to_change },
                { alarm_args: new_cron }
            );
            return checkIfUpdated(publicUpdate, alarm_id_to_change, new_cron, 'with the same message');
        }
    } catch (err) {
        logging.logger.info(`An error while trying to update the alarms with regex ${alarm_id_to_change}.`);
        logging.logger.error(err);
    }
    return 0;
}

async function editAlarmCronAndMessageOnDatabase(new_msg, new_cron, alarm_id_to_change, new_channel, guild_id) {
    try {
        if (utility_functions.isPrivateAlarm(alarm_id_to_change)) {
            let privateUpdate = await Private_alarm_model.updateOne(
                { alarm_id: alarm_id_to_change },
                { message: new_msg, alarm_args: new_cron }
            );
            return checkIfUpdated(privateUpdate, alarm_id_to_change, new_cron, new_msg);
        } else if (utility_functions.isPublicAlarm(alarm_id_to_change)) {
            let publicUpdate = await Alarm_model.updateOne(
                { $and: [{ alarm_id: alarm_id_to_change }, { guild: guild_id }] },
                { message: new_msg, alarm_args: new_cron, channel: new_channel }
            );
            return checkIfUpdated(publicUpdate, alarm_id_to_change, new_cron, new_msg);
        }
    } catch (err) {
        logging.logger.info(`An error while trying to update the alarms with regex ${alarm_id_to_change}.`);
        logging.logger.error(err);
    }
    return 0;
}

function checkIfUpdated(updateObject, alarm_id_to_change, new_cron, new_message) {
    if (updateObject.nModified > 0) {
        logging.logger.info(`Updated the cron for ${alarm_id_to_change} to ${new_cron} and ${new_message}`);
        return 1;
    } else {
        logging.logger.info(`No alarms were updated... Maybe id ${alarm_id_to_change} was incorrect?`);
    }
    return 0;
}

const MESSAGE_COMMAND = 'edit-message';
const CRON_COMMAND = 'edit-cron';
const MESSAGE_CRON_COMMAND = 'edit-message-cron';
const ALARM_ID_ARG = 'alarm-id';
const TIMEZOME_PARAM = 'timezone';
const MINUTE_PARAM = 'minute';
const HOUR_PARAM = 'hour';
const DAY_OF_MONTH_PARAM = 'day_of_the_month';
const MONTH_PARAM = 'month';
const WEEKDAY_PARAM = 'weekday';
const MESSAGE_PARAM = 'message';
const CHANNEL_PARAM = 'channel';

module.exports = {
    name: name_command,
    description: 'Allows the user to edit the alarm. Use the following options:\n' +
        '`-m` - Allows the user to alter the message and the channel to which the message is sent in the alarm (if applicable).\n' +
        '`-c` - Allows the user to alter the cron parameters.\n',
    usage: `/${name_command} -m <alarm_id_regex> <message> <channel?>\nOr:\t` +
        `/${name_command} -c <alarm_id> <timezone/city/UTC> <minute> <hour> <day_of_the_month> <month> <weekday>\nOr:\t` +
        `/${name_command} -c -m <alarm_id> <timezone/city/UTC> <minute> <hour> <day_of_the_month> <month> <weekday> <message> <channel?>\n`,
    data: new SlashCommandBuilder()
        .setName(name_command)
        .setDescription('Allows the user to edit the alarm.')
        .addSubcommand(option => option.setName(MESSAGE_COMMAND).setDescription('Changes the message for the alarm')
            .addStringOption(option => option.setName(ALARM_ID_ARG).setDescription('The alarm id'))
            .addStringOption(option => option.setName(MESSAGE_PARAM).setDescription('The message to be sent'))
            .addChannelOption(option => option.setName(CHANNEL_PARAM).setDescription('The channel for which the alarm will be sent (optional)')))
        .addSubcommand(option => option.setName(CRON_COMMAND).setDescription('Changes the cron for the alarm')
            .addStringOption(option => option.setName(ALARM_ID_ARG).setDescription('The alarm id'))
            .addStringOption(option => option.setName(TIMEZOME_PARAM).setDescription('The timezone the alarm will follow'))
            .addStringOption(option => option.setName(MINUTE_PARAM).setDescription('The minute in which the alarm goes off'))
            .addStringOption(option => option.setName(HOUR_PARAM).setDescription('The hour in which the alarm goes off, * for every hour'))
            .addStringOption(option => option.setName(DAY_OF_MONTH_PARAM).setDescription('The day of the month in which the alarm goes off, * for every day'))
            .addStringOption(option => option.setName(MONTH_PARAM).setDescription('The month in which the alarm goes off, * for every month'))
            .addStringOption(option => option.setName(WEEKDAY_PARAM).setDescription('The weekday in which the alarm goes off, * for every weekday')))
        .addSubcommand(option => option.setName(MESSAGE_CRON_COMMAND).setDescription('Changes the cron and message for the alarm')
            .addStringOption(option => option.setName(ALARM_ID_ARG).setDescription('The alarm id'))
            .addStringOption(option => option.setName(TIMEZOME_PARAM).setDescription('The timezone the alarm will follow'))
            .addStringOption(option => option.setName(MINUTE_PARAM).setDescription('The minute in which the alarm goes off'))
            .addStringOption(option => option.setName(HOUR_PARAM).setDescription('The hour in which the alarm goes off, * for every hour'))
            .addStringOption(option => option.setName(DAY_OF_MONTH_PARAM).setDescription('The day of the month in which the alarm goes off, * for every day'))
            .addStringOption(option => option.setName(MONTH_PARAM).setDescription('The month in which the alarm goes off, * for every month'))
            .addStringOption(option => option.setName(WEEKDAY_PARAM).setDescription('The weekday in which the alarm goes off, * for every weekday'))
            .addStringOption(option => option.setName(MESSAGE_PARAM).setDescription('The message to be sent'))
            .addChannelOption(option => option.setName(CHANNEL_PARAM).setDescription('The channel for which the alarm will be sent (optional)'))),
    async execute(interaction, cron, cron_list) {
        const subCommand = interaction.options.getSubcommand();
        if (subCommand === MESSAGE_COMMAND) {
            const message_stg = interaction.options.getString(MESSAGE_PARAM);
            const alarm_id = interaction.options.getString(ALARM_ID_ARG);
            const channelParam = interaction.options.getChannel(CHANNEL_PARAM);
            const hasSpecifiedChannel = channelParam !== null;
            let channel_discord = interaction.channel;
            const guildId = interaction.guild ? interaction.guild.id : undefined;

            if (hasSpecifiedChannel) {
                channel_discord = channelParam;
            }
            if (alarm_id.length <= 8) {
                await interaction.reply('The id you entered is to short. Please try a larger regex...');
                return;
            }
            if (!(await utility_functions.can_change_alarm(interaction, alarm_id))) {
                await interaction.reply('The alarm you selected is not yours or you aren\'t administrator on this server therefore you cannot delete it!\nIf you are the admin try checking the permissions of the bot.');
                return;
            }

            if (!utility_functions.can_send_messages_to_ch(interaction, channel_discord)) {
                await interaction.reply(`Cannot setup the alarm in channel ${channelParam} because the bot does not have permission to send messages to it.`);
                return;
            }
            if (channel_discord !== undefined) {
                let public_alarms = new Array();

                let private_alarms = await Private_alarm_model.find(
                    { $and: [{ alarm_id: alarm_id }, { user_id: interaction.author.id }] }
                );

                let combination = public_alarms.concat(private_alarms);
                await editAlarmMessageOnDatabase(message_stg, channel_discord.id, alarm_id, guildId, interaction.author.id);
                editCronForAlarm(cron, cron_list, message_stg, channel_discord, interaction, combination);
                await interaction.reply(`Updated the message for ${combination.length} alarms that contain \`${alarm_id}\` in the id`);
            } else {
                await interaction.reply('It was not possible to use the channel to send the message... Please check the setting of the server and if the bot has the necessary permissions!');
            }
        } else if (subCommand === CRON_COMMAND) {
            const timezone = interaction.options.getString(TIMEZOME_PARAM);
            const minute = interaction.options.getString(MINUTE_PARAM);
            const hour = interaction.options.getString(HOUR_PARAM);
            const day_of_the_month = interaction.options.getString(DAY_OF_MONTH_PARAM);
            const month = interaction.options.getString(MONTH_PARAM);
            const weekday = interaction.options.getString(WEEKDAY_PARAM);
            const alarm_id = interaction.options.getString(ALARM_ID_ARG);
            if (!(await utility_functions.can_change_alarm(interaction, alarm_id))) {
                await interaction.reply({ ephemeral: true, content: 'The alarm you selected is not yours or you aren\'t administrator on this server therefore you cannot delete it!\nIf you are the admin try checking the permissions of the bot.' });
                return;
            }
            let crono = `${minute} ${hour} ${day_of_the_month} ${month} ${weekday}`;
            let guild_id = interaction.guild?.id;
            let alarm = await getAlarmById(alarm_id, guild_id);
            if (alarm === null) {
                await interaction.reply({ ephemeral: true, content: `No alarm found with for id ${alarm_id}. For techinical reasons you can only edit private alarms or alarms set in this server. Check if that is a possible cause for failure.` });
                return;
            }
            let difference = time_utils.get_offset_difference(timezone);
            if (difference === undefined) {
                await interaction.reply({ ephemeral: true, content: 'The timezone you have entered is invalid. Please do `' + auth.prefix + 'timezonesinfo` for more information' });
                return;
            }
            else if (time_utils.validate_alarm_parameters(interaction, crono, alarm.message)) {
                crono = time_utils.updateParams(difference, crono);
                let channel;

                if (utility_functions.isPrivateAlarm(alarm.alarm_id)) {
                    channel = await client.users.fetch(interaction.author.id);
                    if (channel === undefined) {
                        let allchannels = await utility_functions.fetchValuesAndConcatValues(client, 'users.cache');
                        channel = (allchannels.filter(z => z.id === interaction.author.id))[0];
                    }
                } else {
                    let guild = interaction.guild;
                    let channel_id = alarm.channel;
                    channel = await guild.channels.cache.get(channel_id);
                }
                if (channel !== undefined) {
                    await editAlarmCronArgsOnDatabase(crono, alarm_id);
                    updateCronWithParamsAndMessage(cron, cron_list, alarm_id, crono, channel, alarm.message);
                    await interaction.reply(`Sucessfully update the alarm with id \`${alarm_id}\` with the following parameters: \`${crono}\` `);
                } else {
                    await interaction.reply({ ephemeral: true, content: 'Error setting up the alarm, please check if you are in the correct server to perform this operation' });
                    return;
                }
            }
        } else if (subCommand === MESSAGE_CRON_COMMAND) {
            const timezone = interaction.options.getString(TIMEZOME_PARAM);
            const minute = interaction.options.getString(MINUTE_PARAM);
            const hour = interaction.options.getString(HOUR_PARAM);
            const day_of_the_month = interaction.options.getString(DAY_OF_MONTH_PARAM);
            const month = interaction.options.getString(MONTH_PARAM);
            const weekday = interaction.options.getString(WEEKDAY_PARAM);
            const message_stg = interaction.options.getString(MESSAGE_PARAM);
            const alarm_id = interaction.options.getString(ALARM_ID_ARG);
            const channelParam = interaction.options.getChannel(CHANNEL_PARAM);
            const hasSpecifiedChannel = channelParam !== null;
            let channel_discord = interaction.channel;
            if (hasSpecifiedChannel) {
                channel_discord = channelParam;
            }
            let crono = `${minute} ${hour} ${day_of_the_month} ${month} ${weekday}`;

            if (!(await utility_functions.can_change_alarm(interaction, alarm_id))) {
                await interaction.reply({ ephemeral: true, content: 'The alarm you selected is not yours or you aren\'t administrator on this server therefore you cannot delete it!\nIf you are the admin try checking the permissions of the bot.' });
                return;
            }
            let guild_id = interaction.guild ? interaction.guild.id : undefined;
            let alarm = await getAlarmById(alarm_id, guild_id);

            if (alarm === null) {
                await interaction.reply({ ephemeral: true, content: `No alarm found with for id ${alarm_id}. For techinical reasons you can only edit private alarms or alarms set in this server. Check if that is a possible cause for failure.` });
                return;
            }

            let difference = time_utils.get_offset_difference(timezone);
            if (difference === undefined) {
                await interaction.reply({ ephemeral: true, content: 'The timezone you have entered is invalid. Please do `' + auth.prefix + 'timezonesinfo` for more information' });
                return;
            }
            else if (time_utils.validate_alarm_parameters(interaction, crono, message_stg)) {

                if (channel_discord === undefined) {
                    await interaction.reply({ ephemeral: true, content: 'It was not possible to use the channel to send the message... Please check the setting of the server and if the bot has the necessary permissions!' });
                    return;
                }
                crono = time_utils.updateParams(difference, crono);
                await editAlarmCronAndMessageOnDatabase(message_stg, crono, alarm_id, channel_discord, guild_id);
                updateCronWithParamsAndMessage(cron, cron_list, alarm_id, crono, channel_discord, message_stg);
                await interaction.reply(`Sucessfully update the alarm with id \`${alarm_id}\` with parameters: \`${crono}\` and message: \`${message_stg}\` `);
            }
        } else {
            await interaction.reply({ ephemeral: true, content: 'Incorrect usage of the command\nUsage: ' + this.usage });
        }
    }
};
