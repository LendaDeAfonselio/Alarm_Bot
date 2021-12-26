"use strict";

const Private_alarm_model = require('../models/private_alarm_model');
const auth = require('./../auth.json');
const private_flag = auth.private_prefix;
const utils = require('../Utils/time_validation');
const time_utils = require('../Utils/time_validation');
const logging = require('../Utils/logging');
const gen_utils = require('../Utils/utility_functions');


module.exports = {
    name: 'privateAlarm',
    description: 'Sets up a private alarm that will be repeated as specified in the arguments\n'
        + 'The remainders will be sent to you via Direct Message!\n'
        + '**The bot has to have a server in common with you to send a private message!**',
    usage: auth.prefix + 'privateAlarm <timezone> <m> <h> <day_of_month> <month> <year> <weekday> <message>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        let canCreate = await gen_utils.can_create_private_alarm(msg.author.id);
        if (!canCreate) {
            msg.channel.send('You have reached the maximum ammount of private alarms! Use `$premium` to discover how to get more alarms');
            return;
        }
        if (args.length > 6) {

            let timezone = args[0];
            let crono = args.slice(1, 6).join(' ');
            let message_stg = args.slice(6, args.length).join(' ');
            let difference = time_utils.get_offset_difference(timezone);
            if (difference === undefined) {
                msg.channel.send('The timezone you have entered is invalid. Please do `' + auth.prefix + 'timezonesinfo` for more information');
            }
            if (utils.validate_alarm_parameters(msg, crono, message_stg)) {
                crono = time_utils.updateParams(difference, crono);
                try {
                    let alarm_user = msg.author.id;
                    let this_alarm_id = Math.random().toString(36).substring(4);
                    let alarm_id = `${private_flag}_${this_alarm_id}`;

                    let scheduledMessage = new cron(crono, () => {
                        try {
                            msg.author.send(message_stg).catch((err) => {
                                logging.logger.info(`Can't send private message to user ${msg.author.id}. ${alarm_id}.`);
                                logging.logger.error(err);
                                if (msg.channel.type !== 'dm' && gen_utils.can_send_messages_to_ch(msg, msg.channel)) {
                                    msg.reply(`Cannot send you the DM for alarm with id ${alarm_id}. Check your permissions for DMs!`)
                                }

                            });
                        } catch (err) {
                            logging.logger.error(`Error when private alarm with id ${alarm_id} went off: ${err}`);
                        }
                    }, {
                        scheduled: true
                    });
                    scheduledMessage.start();

                    // save locally
                    cron_list[alarm_id] = scheduledMessage;

                    // save to DB
                    const newAlarm = new Private_alarm_model({
                        alarm_id: alarm_id,
                        alarm_args: crono,
                        message: message_stg,
                        user_id: alarm_user,
                        isActive: true,
                        timestamp: Date.now(),
                    });
                    newAlarm.save()
                        .then((result) => {
                            msg.author.send({
                                embed: {
                                    title: `Alarm ${alarm_id} with message: ${message_stg} was sucessfully saved with params: ${crono} and message ${message_stg}`,
                                    color: 2447003,
                                    timestamp: new Date()
                                }
                            }).catch((err) => {
                                logging.logger.info(`Can't send private message to user ${msg.author.id}. Confirming the alarm ${alarm_id}.`);
                                logging.logger.error(err);
                                if (msg.channel.type !== 'dm' && gen_utils.can_send_messages_to_ch(msg, msg.channel)) {
                                    msg.reply(`Cannot send you the DM for alarm with id ${alarm_id}. Check your permissions for DMs!\nThe alarm was stored, but with your current preferences the bot will not be able to send the message to you!`)
                                }
                            });
                        })
                        .catch((err) => {
                            logging.logger.info(`Error adding private alarm to the database ${newAlarm}`);
                            logging.logger.error(err);
                        });
                } catch (err) {
                    logging.logger.info(`Error adding a private alarm with params:${msg}`);
                    logging.logger.error(err);
                    msg.channel.send(`Error adding the alarm with params: ${crono}, with message ${msg}. Try verifying if there are enough arguments and if they are correct.`);
                }
            }
        } else {
            msg.channel.send('Insuficient parameters were passed.\n'
                + 'Usage ' + this.usage);
        }
    }
};

