const Private_alarm_model = require('../models/private_alarm_model');
const auth = require('./../auth.json');
const private_flag = auth.private_prefix;
const utils = require('../Utils/time_validation');
const time_utils = require('../Utils/time_validation');
const logging = require('../Utils/logging');


module.exports = {
    name: 'privateAlarm',
    description: 'Sets up a private alarm that will be repeated as specified in the arguments\n'
        + 'The remainders will be sent to you via Direct Message!\n'
        + '**The bot has to have a server in common with you to send a private message!**',
    usage: auth.prefix + 'alarm <timezone> <m> <h> <month> <year> <weekday> <message>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        var timezone = args[0];
        var crono = args.slice(1, 6).join(' ');
        var message_stg = args.slice(6, args.length).join(' ');
        var difference = time_utils.get_offset_difference(timezone);
        if (difference === undefined) {
            msg.channel.send('The timezone you have entered is invalid. Please visit https://www.timeanddate.com/time/map/ for information about your timezone!')
        }
        if (utils.validate_alarm_parameters(msg, crono, message_stg)) {
            crono = time_utils.updateParams(difference, crono);
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
                        logging.logger.info(`${result} added to database`);
                        msg.author.send({
                            embed: {
                                title: `Alarm with message: ${message_stg} was sucessfully saved with params: ${crono} and message ${message_stg}`,
                                color: 2447003,
                                timestamp: new Date()
                            }
                        })
                    })
                    .catch(err => logging.logger.error(err));
            } catch (err) {
                logging.logger.error(err);
                msg.channel.send(`Error adding the alarm with params: ${crono}, for target ${target}`);
            }
        }
    }
};

