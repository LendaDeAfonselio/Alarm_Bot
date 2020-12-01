const Alarm_model = require('../models/alarm_model');
module.exports = {
    name: 'alarm',
    description: 'Sets up an alarm that will be repeated\n' +
        'This alarm will send a message to the _channel_ of the _server_ in which it is activated',
    usage: '<prefix>alarm <m> <h> <weekday> <month> <year> <message> <target>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        var crono = args.slice(0, 5).join(' ');
        var message_stg = args.slice(5, args.length - 1).join(' ');
        var target = args[args.length - 1];
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
                timestamp: Date.now(),
            });
            newAlarm.save()
                .then((result) => {
                    console.log(`${result} added to database`);
                    msg.channel.send({
                        embed: {
                            title: 'Alarm added successfully!',
                            fields: { name: `Alarm with params: ${crono}, for target ${target} was added with success!` },
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

