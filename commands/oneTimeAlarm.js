"use strict";
const auth = require('./../auth.json');
const utils = require('../Utils/utility_functions');
const logging = require('../Utils/logging');
const time_utils = require('../Utils/time_validation');
const channel_regex = /<#\d+>/;
const alarm_db = require('../data_access/alarm_index');

function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
}

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

async function setupCronForOTAlarm(d, msg, cron_list, now, ota, data_stg, timezone, isPrivate, message, discord_channel) {
    ota.start();
    msg.channel.send(`Alarm for ${data_stg} (${timezone}) has been setup`);
    let alarm_user = msg.author.id;
    let this_alarm_id = Math.random().toString(36).substring(4);
    let alarm_id = `${auth.one_time_prefix}_${this_alarm_id}_${alarm_user}`;

    await alarm_db.add_oneTimeAlarm(alarm_id, d, message, isPrivate, msg.guild?.id, discord_channel?.id, alarm_user);

    // save locally
    cron_list[alarm_id] = ota;

    var dif = d.getTime() - now.getTime();
    setTimeout(() => {
        try {
            ota.stop();
            delete cron_list[alarm_id];
        }
        catch (e) {
            logging.logger.info(`Error stopping or deleting the cron for OneTimeAlarm.`);
            logging.logger.error(e);
        }
    }, dif + 5000);
    logging.logger.info(`One time alarm: ${alarm_id} has been setup for ${ota.cronTime.source}`);
}

function createOneTimeCron(cron, d, message, channel_discord) {
    if (channel_discord !== undefined) {
        let ota = new cron(d, () => {
            channel_discord.send(`${message}`);
        });
        return ota;
    }
    return undefined;
}


function extract_discord_channel(args, msg, message) {
    var channel = args.pop();
    var hasSpecifiedChannel = utils.isAChannel(channel);
    // need to put this outside to keep it in memory then use it when saving to the database
    let channel_discord = msg.channel;
    if (hasSpecifiedChannel) {
        channel_discord = msg.guild.channels.cache.get(channel.replace(/[<>#]/g, ''));
        let lastIndex = message.lastIndexOf(" ");
        message = message.substring(0, lastIndex);
    }
    return { channel_discord, message };
}

function createPrivateOneTimeCron(msg, cron, d, message) {
    let ota = new cron(d, () => {
        msg.author.send(`${message}`);
    });
    return ota;
}




module.exports = {
    name: 'oneTimeAlarm',
    description: 'Sets up an alarm that will play one time\n'
        + 'For a private alarm use the -p flag as the second argument otherwise it will send the message to the channel you typed the command at\n'
        + 'If no Date is specified then it will default to today\n'
        + 'P.S - These alarms are not persistent - they are not saved on a DB, therefore if the bot goes down you will have to set them up again.',
    usage: auth.prefix + 'oneTimeAlarm <-p?> <Timezone> <HH:MM> <Day/Month/Year> <Message>\n',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        if (msg.channel.type === 'dm' || utils.isAdministrator(msg) || utils.hasAlarmRole(msg, auth.alarm_role_name)) {
            if (args.length > 1) {
                let isPrivate = args[0].toLowerCase() === '-p';
                if (isPrivate && args.length < 4 || !isPrivate && args.length < 3) {
                    msg.channel.send('Insuficient arguments were passed for this alarm!\n'
                        + 'Usage: `' + this.usage + '`\n'
                        + 'Try `$help` for more information!');
                }
                else {
                    let hour_min_args = args[2];
                    let date_args = '';
                    let message = '';
                    if (!isPrivate) {
                        if (!utils.can_create_ota_alarm(msg.author.id, msg.guild.id)) {
                            msg.channel.send('You or this server have reached the maximum ammount of one time alarms!');
                            return;
                        }
                        let timezone = args[0];
                        let difference = time_utils.get_offset_difference(timezone);
                        if (difference === undefined) {
                            msg.channel.send('The timezone you have entered is invalid. Please visit https://www.timeanddate.com/time/map/ for information about your timezone!')
                        } else {
                            hour_min_args = args[1];
                            if (args[2].includes('/') && args[2].length >= 3 && args[2].length <= 10) {
                                date_args = args[2];
                                message = args.slice(3, args.length).join(' ');

                                var nonTransformedDate = parseDateAndTime(date_args, hour_min_args, msg);
                                let d = time_utils.generateDateGivenOffset(nonTransformedDate, difference);
                                if (isValidDate(d)) {
                                    var params_stg = date_args.toString() + ' ' + hour_min_args.toString();
                                    var now = new Date();
                                    if (d > now) {
                                        let channel_discord;
                                        ({ channel_discord, message } = extract_discord_channel(args, msg, message));
                                        let ota = createOneTimeCron(cron, d, message, channel_discord);
                                        if (ota !== undefined) {
                                            setupCronForOTAlarm(d, msg, cron_list, now, ota, params_stg, timezone, isPrivate, message, channel_discord);
                                        } else {
                                            msg.channel.send(`There was a problem trying to fetch the channel that you have specified. Please make sure that the bot has access to it!`);
                                        }
                                    } else {
                                        msg.channel.send(`The date you entered:${params_stg} already happened!`);
                                    }
                                } else {
                                    msg.channel.send('Oops something went when setting up the alarm!\nUsage: `' + this.usage + '`\n'
                                        + 'Try `$help` for more information!');
                                }
                            } else {
                                if (!utils.can_create_ota_alarm(msg.author.id, undefined)) {
                                    msg.channel.send('You or this server have reached the maximum ammount of private one time alarms!');
                                    return;
                                }
                                message = args.slice(2, args.length).join(' ');

                                let today = new Date();
                                date_args = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

                                var nonTransformedDate = parseDateAndTime(date_args, hour_min_args, msg);
                                let d = time_utils.generateDateGivenOffset(nonTransformedDate, difference);

                                if (isValidDate(d)) {
                                    var params_stg = date_args.toString() + ' ' + hour_min_args.toString();
                                    var now = new Date();
                                    if (d > now) {
                                        let channel_discord;
                                        ({ channel_discord, message } = extract_discord_channel(args, msg, message));
                                        let ota = createOneTimeCron(cron, d, message, channel_discord);

                                        if (ota !== undefined) {
                                            setupCronForOTAlarm(d, msg, cron_list, now, ota, params_stg, timezone, isPrivate, message, channel_discord);
                                        } else {
                                            msg.channel.send(`There was a problem trying to fetch the channel that you have specified. Please make sure that the bot has access to it!`);
                                        }
                                    } else {
                                        msg.channel.send(`The date you entered:${params_stg} already happened!`);
                                    }
                                } else {
                                    msg.channel.send('Oops something went when setting up the alarm!\nUsage: `' + this.usage + '`\n'
                                        + 'Try `$help` for more information!');
                                }
                            }
                        }
                    } else {
                        let timezone = args[1];
                        let difference = time_utils.get_offset_difference(timezone);
                        if (difference === undefined) {
                            msg.channel.send('The timezone you have entered is invalid. Please visit https://www.timeanddate.com/time/map/ for information about your timezone!')
                        }
                        else {
                            if (args[3].includes('/') && args[3].length >= 3 && args[3].length <= 10) {
                                date_args = args[3];
                                message = args.slice(4, args.length).join(' ');

                                var nonTransformedDate = parseDateAndTime(date_args, hour_min_args, msg);
                                let d = time_utils.generateDateGivenOffset(nonTransformedDate, difference);

                                if (isValidDate(d)) {
                                    var params_stg = date_args.toString() + ' ' + hour_min_args.toString();
                                    var now = new Date();
                                    if (d > now) {
                                        var ota = createPrivateOneTimeCron(msg, cron, d, message);
                                        setupCronForOTAlarm(d, msg, cron_list, now, ota, params_stg, timezone, isPrivate, message, msg.channel);
                                    } else {
                                        msg.channel.send(`The date you entered:${params_stg} already happened!`);
                                    }
                                } else {
                                    msg.channel.send('Oops something went when setting up the alarm!\nUsage: `' + this.usage + '`\n'
                                        + 'Try `$help` for more information!');
                                }
                            } else {
                                message = args.slice(3, args.length).join(' ');

                                let today = new Date();
                                date_args = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

                                var nonTransformedDate = parseDateAndTime(date_args, hour_min_args, msg);
                                let d = time_utils.generateDateGivenOffset(nonTransformedDate, difference);

                                if (isValidDate(d)) {
                                    var params_stg = date_args.toString() + ' ' + hour_min_args.toString();
                                    var now = new Date();
                                    if (d > now) {
                                        var ota = createPrivateOneTimeCron(msg, cron, d, message);
                                        setupCronForOTAlarm(d, msg, cron_list, now, ota, params_stg, timezone, isPrivate, message, msg.channel);
                                    } else {
                                        msg.channel.send(`The date you entered:${params_stg} already happened!`);
                                    }
                                } else {
                                    msg.channel.send('Oops something went when setting up the alarm!\nUsage: `' + this.usage + '`\n'
                                        + 'Try `$help` for more information!');
                                }
                            }
                        }
                    }
                }
            } else {
                msg.channel.send('No arguments were passed for this alarm!\n'
                    + 'Usage: `' + this.usage + '`\n'
                    + 'Try `$help` for more information!');
            }
        } else {
            msg.channel.send('You do not have permissions to set that alarm! Ask for the admins on your server to give you the `Alarming` role!');
        }
    }
}

