const Alarm_model = require('../models/alarm_model');
const auth = require('./../auth.json');

function small_time_interval(mins) {
    if (mins === '*') {
        return true;
    }
    if (mins.contains('-')) {
        return true;
    }
    if (!mins.contains('*/')) {
        return false;
    }
    let num_minutes = mins.replace('*/', '');
    let n = parseInt(num_minutes);

    return isNaN(n) || n < 15;
}

function validate_alarm_parameters(msg, cron_params, message_stg) {
    if (cron_params.length < 6) {
        msg.channel.send('Not enough parameters were passed, try `#alarmHelp` for more information!');
        return false;
    }
    let mins = cron_params[0];
    if (small_time_interval(mins)) {
        msg.channel.send("The minute parameter you sent is either invalid or too short. Only time intervals bigger than 15 minutes are allowed to avoid spam");
    }
    let hours = cron_params[1];
    let num = parseInt(hours);
    if(isNaN(num) || num < 0 || num > 23){
        msg.channel.send("The hour parameter is invalid! Try `#alarmHelp` for more information!")
    }
    let month_day = cron_params[2];
    let month_num_day = parseInt(month_day);
    if(isNaN)
    let month = cron_params[3];
    let weekday = cron_params[3];

    let message = message_stg;
    if (message.length > 350) { // message is too long
        msg.channel.send('Not enough parameters were passed, try `#alarmHelp` for more information!');
        return false;
    }
}

module.exports = {
    name: 'alarm',
    description: 'Sets up an alarm that will be repeated\n' +
        'This alarm will send a message to the _channel_ of the _server_ in which it is activated.\n'
        + 'The parameter <target> is optional.',
    usage: auth.prefix + 'alarm <m> <h> <month> <weekday> <message> <target>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        var crono = args.slice(0, 5).join(' ');
        var message_stg = args.slice(5, args.length - 1).join(' ');
        var target = args[args.length - 1];

        // Check if the message has a single word and no target
        if (target.contains('<@&')) {
            message_stg = target;
        }
        var guild = msg.guild.id;

        try {
            let scheduledMessage = new cron(crono, () => {
                msg.channel.send(`${message_stg}! ${target}`);
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
                target: target,
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
};

