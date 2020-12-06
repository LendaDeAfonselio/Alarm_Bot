const Alarm_model = require('../models/alarm_model');
const auth = require('./../auth.json');

function small_time_interval(mins) {
    if (mins === '*') {
        return true;
    }
    if (mins.includes('-')) {
        return true;
    }
    if (!mins.includes('*/')) {
        return false;
    }
    let num_minutes = mins.replace('*/', '');
    let n = parseInt(num_minutes);

    return isNaN(n) || n < 15;
}

function isAValidRangeGroupOrNumber(stg, min, max) {
    if (stg == '*') {
        return true;
    } else if (stg.includes('-')) {
        let tokens = stg.split('-');
        let a = parseInt(tokens[0]);
        let b = parseInt(tokens[1]);
        return a >= min && b <= max;
    } else if (stg.includes('/*')) {
        let num = mins.replace('*/', '');
        let n = parseInt(num);
        return n >= min && n <= max;
    } else if (stg.includes(',')) {
        let tokens = stg.split(',');
        for (let t of tokens) {
            if (t < min || t > max) {
                return false;
            }
        }
        return true;
    }
    let num = parseInt(stg);
    return num >= min && num <= max;
}

function validate_alarm_parameters(msg, cron_stg, message_stg) {
    let cron_params = cron_stg.split(" ");
    if (message_stg.length === 0) {
        msg.channel.send('The message is empty! Please insert a message before proceding!');
        return false;
    }

    if (message_stg.length > 350) { // message is too long
        msg.channel.send('The message is too long, please trim it down!');
        return false;
    }

    if (cron_params.length < 5) {
        msg.channel.send('Not enough parameters were passed, try `#alarmHelp` for more information!');
        return false;
    }
    let mins = cron_params[0];
    if (small_time_interval(mins)) {
        msg.channel.send("The minute parameter you sent is either invalid or too short. Only time intervals bigger than 15 minutes are allowed to avoid spam");
        return false;
    }

    let hours = cron_params[1];
    if (!isAValidRangeGroupOrNumber(hours, 0, 23)) {
        msg.channel.send("The hour parameter is invalid! Try `#alarmHelp` for more information!");
        return false;
    }

    let month_day = cron_params[2];
    if (!isAValidRangeGroupOrNumber(month_day, 1, 31)) {
        msg.channel.send("The day of the month parameter is invalid! Try `#alarmHelp` for more information!");
        return false;
    }

    let month = cron_params[3];
    if(!isAValidRangeGroupOrNumber(month, 1, 12)){
        msg.channel.send("The month parameter is invalid! Try `#alarmHelp` for more information!");
        return false;
    }

    let weekday = cron_params[4];
    if(!isAValidRangeGroupOrNumber(weekday, 0, 7)){
        msg.channel.send("The weekday parameter is invalid! Try `#alarmHelp` for more information!");
        return false;
    }

    return true;
}

module.exports = {
    name: 'alarm',
    description: 'Sets up an alarm that will be repeated\n' +
        'This alarm will send a message to the _channel_ of the _server_ in which it is activated.\n'
        + 'The parameter <target> is optional.',
    usage: auth.prefix + 'alarm <m> <h> <month> <weekday> <message> <target>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        var crono = args.slice(0, 5).join(' ');
        var message_stg = args.slice(5, args.length).join(' ');

        if (validate_alarm_parameters(msg, crono, message_stg)) {
            var guild = msg.guild.id;

            try {
                let scheduledMessage = new cron(crono, () => {
                    msg.channel.send(`${message_stg}`);
                }, {
                    scheduled: true
                });
                scheduledMessage.start();
                let alarm_user = msg.author.id;
                let this_alarm_id = Math.random().toString(36).substring(4);
                let alarm_id = `${this_alarm_id}_${alarm_user}`;
                // save locally
                cron_list[alarm_id] = scheduledMessage;

                // save to DB
                const newAlarm = new Alarm_model({
                    _id: mongoose.Types.ObjectId(),
                    alarm_id: alarm_id,
                    alarm_args: crono,
                    message: message_stg,
                    guild: guild,
                    channel: msg.channel.id,
                    timestamp: Date.now(),
                });
                newAlarm.save()
                    .then((result) => {
                        console.log(`${result} added to database`);
                        msg.channel.send({
                            embed: {
                                fields: { name: 'Alarm added successfully!', value: `Alarm with params: ${crono}, for channel ${msg.channel.name} was added with success!` },
                                timestamp: new Date()
                            }
                        });
                    })
                    .catch(err => console.log(err));
            } catch (err) {
                console.error(err);
                msg.channel.send(`Error adding the alarm with params: ${crono}, for target ${target}`);
            }
        }
    }
};

