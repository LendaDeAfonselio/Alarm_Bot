const Private_alarm_model = require('../models/private_alarm_model');
module.exports = {
    name: 'privateAlarm',
    description: 'Sets up a private alarm that will be repeated as specified in the arguments\n'
        + 'The remainders will be sent to you via Direct Message!\n'
        + '**The bot has to have a server in comun with you to send a private message!**',
    usage: '<prefix>alarm <m> <h> <weekday> <month> <year> <message>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        var crono = args.slice(0, 5).join(' ');
        var message_stg = args.slice(5, args.length).join(' ');

        try {
            let scheduledMessage = new cron(crono, () => {
                msg.author.send({
                    embed: {
                        color: 3447003,
                        title: `${message_stg}!`,
                        timestamp: new Date()
                    }
                });
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
            const newAlarm = new Private_alarm_model({
                _id: mongoose.Types.ObjectId(),
                alarm_id: alarm_id,
                alarm_args: crono,
                message: message_stg,
                user_id: alarm_user,
                timestamp: Date.now(),
            });
            newAlarm.save()
                .then((result) => {
                    console.log(`${result} added to database`);
                    msg.author.send({
                        embed: {
                            title: `Alarm with message: ${message} was sucessfully saved!`,
                            color: 2447003,
                            timestamp: new Date()
                        }
                    })
                })
                .catch(err => console.log(err));
        } catch (err) {
            console.error(err);
            msg.channel.send(`Error adding the alarm with params: ${crono}, for target ${target}`);
        }
    }
};

