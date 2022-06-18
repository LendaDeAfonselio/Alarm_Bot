'use strict';
const auth = require('./../auth.json');
const utils = require('../Utils/utility_functions');
const logging = require('../Utils/logging');
const time_utils = require('../Utils/time_validation');
const alarm_db = require('../data_access/alarm_index');
const { SlashCommandBuilder } = require('@discordjs/builders');
const PRIVATE_ALARM = 'private-one-time-alarm';
const PUBLIC_ALARM = 'one-time-alarm';
const TIMEZOME_PARAM = 'timezone';
const HOUR_MINUTE_PARAM = 'hour-minute';
const DAY_MONTH_YEAR_PARAM = 'day-month-year';
const MESSAGE_PARAM = 'message';
const CHANNEL_PARAM = 'channel';

module.exports = {
    name: 'oneTimeAlarm',
    description: 'Sets up an alarm that will play one time\n' +
        'For a private alarm use the -p flag as the second argument otherwise it will send the message to the channel you typed the command at\n' +
        'If no Date is specified then it will default to today',
    usage: '`/oneTimeAlarm <-p?> <Timezone> <HH:MM> <Day/Month/Year> <Message> <channel?>`',
    data: new SlashCommandBuilder()
        .setName('onetimealarm')
        .setDescription('Sets up an alarm that will play one time')
        .addSubcommand(option => option.setName(PUBLIC_ALARM).setDescription('Changes the cron for the alarm')
            .addStringOption(option => option.setName(TIMEZOME_PARAM).setDescription('The timezone the alarm will follow'))
            .addStringOption(option => option.setName(HOUR_MINUTE_PARAM).setDescription('The hour and minute in which the alarm will go off'))
            .addStringOption(option => option.setName(DAY_MONTH_YEAR_PARAM).setDescription('The day/month/year in which the alarm will go off'))
            .addStringOption(option => option.setName(MESSAGE_PARAM).setDescription('The message of the alarm'))
            .addChannelOption(option => option.setName(CHANNEL_PARAM).setDescription('The channel (optional)')))
        .addSubcommand(option => option.setName(PRIVATE_ALARM).setDescription('Changes the cron for the alarm')
            .addStringOption(option => option.setName(TIMEZOME_PARAM).setDescription('The timezone the alarm will follow'))
            .addStringOption(option => option.setName(HOUR_MINUTE_PARAM).setDescription('The hour:minute in which the alarm will go off (HH:MM format)'))
            .addStringOption(option => option.setName(DAY_MONTH_YEAR_PARAM).setDescription('The day/month/year in which the alarm will go off (DD/MM/YYYY format)'))
            .addStringOption(option => option.setName(MESSAGE_PARAM).setDescription('The message of the alarm'))),
    async execute(interaction, cron_list, cron) {
        if (utils.isAdministrator(interaction) || utils.hasAlarmRole(interaction, auth.alarm_role_name)) {
            const subCommand = interaction.options.getSubcommand();

            if (subCommand && subCommand !== null) {
                let isPrivate = subCommand === PRIVATE_ALARM;
                const hour_min_args = interaction.options.getString(HOUR_MINUTE_PARAM);
                let date_args = interaction.options.getString(DAY_MONTH_YEAR_PARAM);
                const channel_param = interaction.options.getString(CHANNEL_PARAM);
                const message = interaction.options.getString(MESSAGE_PARAM);
                const timezone = interaction.options.getString(TIMEZOME_PARAM);
                const channel_discord = channel_param && channel_param !== null ? channel_param : interaction.channel;
                if (message && timezone && hour_min_args &&
                    message !== null &&
                    timezone !== null &&
                    hour_min_args !== null) {
                    interaction.channel.send('Insuficient arguments were passed for this alarm!\n' +
                        'Usage: `' + this.usage + '`\n' +
                        'Try `$help` for more information!');
                }
                else {

                    if (!isPrivate) {
                        let canCreate = await utils.can_create_ota_alarm(interaction.author.id, interaction.guild?.id);
                        if (!canCreate) {
                            interaction.channel.send(auth.limit_alarm_message);
                            return;
                        }
                        let difference = time_utils.get_offset_difference(timezone);
                        if (difference === undefined) {
                            interaction.channel.send('The timezone you have entered is invalid. Please visit https://www.timeanddate.com/time/map/ for information about your timezone!');
                        } else {
                            if (date_args && date_args !== null && date_args.includes('/') && date_args.length >= 3 && date_args.length <= 10) {
                                // complete date
                                let nonTransformedDate = parseDateAndTime(date_args, hour_min_args, interaction);
                                const d = time_utils.generateDateGivenOffset(nonTransformedDate, difference);
                                if (time_utils.isValidDate(d)) {
                                    let params_stg = date_args.toString() + ' ' + hour_min_args.toString();
                                    let now = new Date();
                                    if (d > now) {
                                        if (!utils.can_send_messages_to_ch(interaction, channel_discord)) {
                                            await interaction.reply({ ephemeral: true, content: 'Cannot setup the alarm in that channel because the bot does not have permission to send messages to it.' });
                                            return;
                                        }
                                        let ota = createOneTimeCron(cron, d, message, channel_discord);
                                        if (ota !== undefined) {
                                            await setupCronForOTAlarm(d, interaction, cron_list, now, ota, params_stg, timezone, isPrivate, message, channel_discord);
                                        } else {
                                            await interaction.reply({ ephemeral: true, content: 'There was a problem trying to fetch the channel that you have specified. Please make sure that the bot has access to it!' });
                                        }
                                    } else {
                                        await interaction.reply({ ephemeral: true, content: `The date you entered:${params_stg} already happened!` });
                                    }
                                } else {
                                    await interaction.reply(`Oops something went when setting up the alarm! Usage: \`${this.usage}\``);
                                }
                            } else {
                                // no date
                                let today = new Date();
                                date_args = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

                                let nonTransformedDate = parseDateAndTime(date_args, hour_min_args, interaction);
                                let d = time_utils.generateDateGivenOffset(nonTransformedDate, difference);

                                if (time_utils.isValidDate(d)) {
                                    let params_stg = date_args.toString() + ' ' + hour_min_args.toString();
                                    let now = new Date();
                                    if (d > now) {
                                        if (!utils.can_send_messages_to_ch(interaction, channel_discord)) {
                                            await interaction.reply({ ephemeral: true, content: 'Cannot setup the alarm to specified channel because the bot does not have permission to send messages to it.' });
                                            return;
                                        }
                                        let ota = createOneTimeCron(cron, d, message, channel_discord);

                                        if (ota !== undefined) {
                                            await setupCronForOTAlarm(d, interaction, cron_list, now, ota, params_stg, timezone, isPrivate, message, channel_discord);
                                        } else {
                                            await interaction.reply({ ephemeral: true, content: 'There was a problem trying to fetch the channel that you have specified. Please make sure that the bot has access to it!' });
                                        }
                                    } else {
                                        await interaction.reply({ ephemeral: true, content: `The date you entered:${params_stg} already happened!` });
                                    }
                                } else {
                                    await interaction.reply({ ephemeral: true, content: `Oops something went when setting up the alarm! Usage: \`${this.usage}\`` });
                                }
                            }
                        }
                    } else {
                        // partial date
                        let create = await utils.can_create_ota_alarm(interaction.author.id, undefined);
                        if (!create) {
                            await interaction.reply({ content: 'You or this server have reached the maximum ammount of private one time alarms! Use `$premium` to find out how to get more alarms.' });
                            return;
                        }
                        let difference = time_utils.get_offset_difference(timezone);
                        if (difference === undefined) {
                            await interaction.reply({ ephemeral: true, content: 'The timezone you have entered is invalid. Please visit https://www.timeanddate.com/time/map/ for information about timezones or use /timezonesinfo command!' });
                        }
                        else {
                            if (date_args && date_args !== null && date_args.includes('/') && date_args.length >= 3 && date_args.length <= 10) {

                                let nonTransformedDate = parseDateAndTime(date_args, hour_min_args, interaction);
                                let d = time_utils.generateDateGivenOffset(nonTransformedDate, difference);

                                if (time_utils.isValidDate(d)) {
                                    let params_stg = date_args.toString() + ' ' + hour_min_args.toString();
                                    let now = new Date();
                                    if (d > now) {
                                        let ota = await createPrivateOneTimeCron(interaction, cron, d, message);
                                        await setupCronForOTAlarm(d, interaction, cron_list, now, ota, params_stg, timezone, isPrivate, message, interaction.channel);
                                    } else {
                                        await interaction.reply({ ephemeral: true, content: `The date you entered:${params_stg} already happened!` });
                                    }
                                } else {
                                    await interaction.reply(`Oops something went when setting up the alarm! Usage: \`${this.usage}\``);
                                    return;

                                }
                            } else {

                                let today = new Date();
                                date_args = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

                                let nonTransformedDate = parseDateAndTime(date_args, hour_min_args, interaction);
                                let d = time_utils.generateDateGivenOffset(nonTransformedDate, difference);

                                if (time_utils.isValidDate(d)) {
                                    let params_stg = date_args.toString() + ' ' + hour_min_args.toString();
                                    let now = new Date();
                                    if (d > now) {
                                        let ota = await createPrivateOneTimeCron(interaction, cron, d, message);
                                        await setupCronForOTAlarm(d, interaction, cron_list, now, ota, params_stg, timezone, isPrivate, message, interaction.channel);
                                    } else {
                                        await interaction.reply({ ephemeral: true, content: `The date you entered:${params_stg} already happened!` });
                                    }
                                } else {
                                    await interaction.reply({ ephemeral: true, content: `Oops something went when setting up the alarm! Usage: \`${this.usage}\`` });
                                }
                            }
                        }
                    }
                }
            } else {
                await interaction.reply({ ephemeral: true, content: `Oops something went when setting up the alarm! Usage: ${this.usage}` });
            }
        } else {
            await interaction.reply({ content: 'You do not have permissions to set that alarm! Ask for the admins on your server to create and (then) give you the `Alarming` role!' });
        }
    }
};

function parseDateAndTime(date_args, hour_min_args, msg) {
    let date_tokens = date_args.split('/');
    if (date_tokens.length === 2 || date_tokens.length === 3) {
        let day = date_tokens[0];
        let month = date_tokens[1];
        let year = new Date().getFullYear();

        if (date_tokens.length === 3) {
            year = date_tokens[2];
        }

        let hour_min_tokens = hour_min_args.split(':');
        if (hour_min_tokens.length === 2) {
            let date_stg = `${year}-${month}-${day} ${hour_min_args}`;
            let d = new Date(date_stg);
            return d;
        }
    }
    return undefined;
}

async function setupCronForOTAlarm(d, interaction, cron_list, now, ota, data_stg, timezone, isPrivate, message, discord_channel) {
    ota.start();
    let alarm_user = interaction.author.id;
    let this_alarm_id = Math.random().toString(36).substring(4);
    let alarm_id = `${auth.one_time_prefix}_${this_alarm_id}`;

    await alarm_db.add_oneTimeAlarm(alarm_id, d, message, isPrivate, interaction.guild?.id, discord_channel?.id, alarm_user, interaction.guild?.name);

    // save locally
    cron_list[alarm_id] = ota;
    await interaction.reply(`Setup a new one time alarm for ${data_stg} (${timezone})`);

    let dif = d.getTime() - now.getTime();
    setTimeout(() => {
        try {
            ota.stop();
            delete cron_list[alarm_id];
        }
        catch (e) {
            logging.logger.info('Error stopping or deleting the cron for OneTimeAlarm.');
            logging.logger.error(e);
        }
    }, dif + 5000);
    logging.logger.info(`One time alarm: ${alarm_id} has been setup for ${ota.cronTime.source}`);
}

function createOneTimeCron(cron, d, message, channel_discord) {
    try {
        if (channel_discord !== undefined) {
            let ota = new cron(d, () => {
                channel_discord.send(`${message}`);
            });
            return ota;
        }
    } catch (err) {
        logging.logger.error(`Error when private one time alarm alarm with message ${message} went off: ${err}`);
    }
    return undefined;
}

async function createPrivateOneTimeCron(msg, cron, d, message) {
    try {
        let ota = new cron(d, async () => {
            await msg.author.send(message).catch((err) => {
                logging.logger.info(`Can't send reply to one time alarm with ${d} from user ${msg.author.id}.`);
                logging.logger.error(err);
                if (msg.channel.type !== 'dm' && utils.can_send_messages_to_ch(msg, msg.channel)) {
                    msg.reply('Unable to send you the private alarms via DM. Check your permissions!');
                }
            });
        });
        return ota;
    } catch (err) {
        logging.logger.error(`Error when private one time alarm alarm with message ${message} went off: ${err}`);
    }
    return undefined;
}
