const auth = require('./../auth.json');

function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
}

module.exports = {
    name: 'oneTimeAlarm',
    description: 'Sets up an alarm that will play one time\n'
        + 'For a private alarm use the -p flag as the second argument otherwise it will send the message to the channel you typed the command at\n'
        + 'If no Date is specified then it will default to today\n'
        + 'P.S - These alarms are not persistent - they are not saved on a DB, therefore if the bot goes down you will have to set them up again.',
    usage: auth.prefix + 'oneTimeAlarm <-p> <HH:MM> <Day/Month/Year> <Message>\n',
    async execute(msg, args, client, cron, cron_list, mongoose) {

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
                var date_tokens = date_args.split('/');
                if (date_tokens.length === 2 || date_tokens.length === 3) {
                    var day = date_tokens[0];
                    var month = date_tokens[1];
                    var year = new Date().getFullYear();
                    message = args.slice(2, args.length).join(' ');

                    if (date_tokens.length === 3) {
                        year = date_tokens[2];
                    }

                    var hour_min_tokens = hour_min_args.split(':');
                    if (hour_min_tokens.length === 2) {
                        var minutes = hour_min_tokens[1];
                        var hour = hour_min_tokens[0];
                        console.log(hour);
                        console.log(minutes);
                        var date_stg = `${year}-${month}-${day} ${hour_min_args}`;
                        var d = new Date(date_stg);
                        //var d = new Date(year, month, day, hour, minutes, 0, 0);
                        if (isValidDate(d)) {
                            var now = new Date();
                            if (d > now) {
                                let ota = new cron(d, () => {
                                    msg.channel.send(`${message}`);
                                });
                                ota.start();
                                let alarm_user = msg.author.id;
                                let this_alarm_id = Math.random().toString(36).substring(4);
                                let alarm_id = `${auth.one_time_prefix}_${this_alarm_id}_${alarm_user}`;
                                // save locally
                                cron_list[alarm_id] = ota;

                                var dif = d.getTime() - now.getTime();
                                console.log(d);
                                console.log(now);

                                setTimeout(() => {
                                    try {
                                        ota.stop();
                                        delete cron_list[alarm_id];
                                    } catch (e) {
                                        console.error(e);
                                    }
                                }, dif + 5000);
                            } else {
                                msg.channel.send(`The date you entered is ${date_args} already happened!`);
                            }
                        } else {
                            msg.channel.send(`The date _${date_args}_ that you have provided is invalid, it should be <Day/Month/Year>! Please correct any errors and try again!`);
                        }
                    } else {
                        msg.channel.send(`The format for the hours _${hour_min_args}_ is invalid, it should be <HH:MM>! Please correct any errors and try again!`);
                    }

                } else {
                    msg.channel.send(`The date _${date_args}_ that you have provided is invalid, it should be <Day/Month/Year>! Please correct any errors and try again!`);

                }
            }
        }
    }
}
