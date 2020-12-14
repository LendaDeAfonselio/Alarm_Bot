const Private_alarm_model = require('../models/private_alarm_model');
const auth = require('./../auth.json');
const private_flag = auth.private_prefix;
const utils = require('../Utils/time_validation');

module.exports = {
    name: 'privateAlarm',
    description: 'Sets up a private alarm that will be repeated as specified in the arguments\n'
        + 'The remainders will be sent to you via Direct Message!\n'
        + '**The bot has to have a server in comun with you to send a private message!**',
    usage: auth.prefix + 'alarm <m> <h> <month> <year> <weekday> <message>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        var crono = args.slice(0, 5).join(' ');
        var message_stg = args.slice(5, args.length).join(' ');

        if (utils.validate_alarm_parameters(msg, crono, message_stg)) {
            try {
                let scheduledMessage = new cron(crono, () => {
                    msg.author.send(`${message_stg}!`);
                }, {
                    scheduled: true
                });
                scheduledMessage.start();
                let alarm_user = msg.author.id;
                let this_alarm_id = Math.random().toString(36).substring(4);
                let alarm_id = `${private_flag}_${this_alarm_id}_${alarm_user}`;
                // save locally
                cron_list[alarm_id] = scheduledMessage;

                // save to DB
                const newAlarm = new Private_alarm_model({
                    _id: mongoose.Types.ObjectId(),
                    alarm_id: alarm_id,
                    alarm_args: crono,
                    message: message_stg,
                    user_id: alarm_user,
                    guild: msg.guild.id,
                    timestamp: Date.now(),
                });
                newAlarm.save()
                    .then((result) => {
                        console.log(`${result} added to database`);
                        msg.author.send({
                            embed: {
                                title: `Alarm with message: ${message_stg} was sucessfully saved with params: ${crono} and message ${message_stg}`,
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
    }
};
