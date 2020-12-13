const auth = require('./../auth.json');
const utils = require('../Utils/utility_functions');

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
        } else {
            msg.channel.send(`The format for the hours _${hour_min_args}_ is invalid, it should be <HH:MM>! Please correct any errors and try again!`);
        }
    }
    return undefined;
}

function setupCronForOTAlarm(d, msg, cron_list, now, ota, data_stg) {

    ota.start();
    msg.channel.send(`Alarm for ${data_stg} has been setup`);
    let alarm_user = msg.author.id;
    let this_alarm_id = Math.random().toString(36).substring(4);
    let alarm_id = `${auth.one_time_prefix}_${this_alarm_id}_${alarm_user}`;

    // save locally
    cron_list[alarm_id] = ota;
    var dif = d.getTime() - now.getTime();
    setTimeout(() => {
        try {
            ota.stop();
            delete cron_list[alarm_id];
        }
        catch (e) {
            console.error(e);
        }
    }, dif + 5000);
}

module.exports = {
    name: 'oneTimeAlarm',
    description: 'Sets up an alarm that will play one time\n'
        + 'For a private alarm use the -p flag as the second argument otherwise it will send the message to the channel you typed the command at\n'
        + 'If no Date is specified then it will default to today\n'
        + 'P.S - These alarms are not persistent - they are not saved on a DB, therefore if the bot goes down you will have to set them up again.',
    usage: auth.prefix + 'oneTimeAlarm <-p> <HH:MM> <Day/Month/Year> <Message>\n',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        if (utils.hasAlarmRole(msg, auth.alarm_role_name) || utils.isAdministrator(msg)) {
            if (args.length < 2) {
                msg.channel.send('Insuficient arguments were passed for this alarm!\n'
                    + 'Try $help for more information!');
            }
            var isPrivate = args[0].toLowerCase() === '-p';
            var hour_min_args = args[1];
            var date_args = '';
            var message = '';
            if (!isPrivate) {
                hour_min_args = args[0];
                if (args[1].includes('/') && args[1].length >= 8 && args[1].length <= 10) {
                    date_args = args[1];
                    message = args.slice(2, args.length).join(' ');

                    var d = parseDateAndTime(date_args, hour_min_args, msg);

                    if (isValidDate(d)) {
                        var params_stg = date_args.toString() + ' ' + hour_min_args.toString();
                        var now = new Date();
                        if (d > now) {
                            let ota = new cron(d, () => {
                                msg.channel.send(`${message}`);
                            });
                            setupCronForOTAlarm(d, msg, cron_list, now, ota, params_stg);
                        } else {
                            msg.channel.send(`The date you entered: **${params_stg}** already happened, please verify the parameters and try again!`);
                        }
                    } else {
                        msg.channel.send(`The date _${date_args}_ that you have provided is invalid, it should be <Day/Month/Year>! Please correct any errors and try again!`);
                    }
                } else {
                    msg.channel.send(`The date _${date_args}_ that you have provided is invalid, it should be <Day/Month/Year>! Please correct any errors and try again!`);
                }
            } else {
                if (args[2].includes('/') && args[2].length >= 8 && args[2].length <= 10) {
                    date_args = args[2];
                    message = args.slice(3, args.length).join(' ');

                    var d = parseDateAndTime(date_args, hour_min_args, msg); // TODO: Will bug

                    if (isValidDate(d)) {
                        var params_stg = date_args.toString() + ' ' + hour_min_args.toString();
                        var now = new Date();
                        if (d > now) {
                            let ota = new cron(d, () => {
                                msg.author.send(`${message}`);
                            });
                            setupCronForOTAlarm(d, msg, cron_list, now, ota, params_stg);
                        } else {
                            msg.channel.send(`The date you entered:${params_stg} already happened!`);
                        }
                    } else {
                        msg.channel.send(`The date _${date_args}_ that you have provided is invalid, it should be <Day/Month/Year>! Please correct any errors and try again!`);
                    }
                } else {
                    msg.channel.send(`The date _${date_args}_ that you have provided is invalid, it should be <Day/Month/Year>! Please correct any errors and try again!`);
                }
            }
        } else {
            msg.channel.send('You do not have permissions to set that alarm! Ask for the admins on your server to give you the `Alarming` role!');
        }
    }
}


