const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');
const utility_functions = require('../Utils/utility_functions');

const auth = require('./../auth.json');
const logging = require('../Utils/logging');


module.exports = {
    name: 'activateAlarm',
    description: 'Activates an alarm with a given id that was silenced previously',
    usage: auth.prefix + 'silenceAlarm <id>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        if (args.length >= 1) {
            let alarm_to_activate = args[0];

            if (utility_functions.isOtaAlarm(alarm_to_activate)) {
               await msg.channel.send('You cannot activate a oneTimeAlarm because they cannot be silenced...');
                return;
            }

            if (!(await utility_functions.can_change_alarm(msg, alarm_to_activate))) {
               await msg.channel.send(`The alarm you selected isn't yours or you aren't administrator on this server therefore you cannot silence it!`)
            }
            else {
                if (cron_list[alarm_to_activate] !== undefined) {
                    if (!cron_list[alarm_to_activate].running) {
                        // add verification for DMs and guild id
                        try {
                            if (utility_functions.isPrivateAlarm(alarm_to_activate)) {
                                await Private_alarm_model.updateOne(
                                    { alarm_id: alarm_to_activate },
                                    {
                                        isActive: true
                                    }
                                )
                            } else if (utility_functions.isPublicAlarm(alarm_to_activate)) {
                                await Alarm_model.updateOne(
                                    { alarm_id: alarm_to_activate },
                                    {
                                        isActive: true
                                    }
                                )
                            }
                            cron_list[alarm_to_activate].start();
                           await msg.channel.send(`${alarm_to_activate} is now active again.`);
                        } catch (e) {
                            logging.logger.info(`Error re-activating alarm with id:${alarm_to_activate}... Please try again later!`);
                            logging.logger.error(e);
                           await msg.channel.send(`Error re-activating alarm with id:${alarm_to_activate}... Please try again later!`);
                        }
                    } else {
                       await msg.channel.send(`Alarm with id ${alarm_to_activate} has already been silenced.\nTo see the status of your alarms type: ${auth.prefix}myalarms`);

                    }
                }
                else {
                   await msg.channel.send(`Impossible to silence alarm with id ${alarm_to_activate}.\nPlease try again later.`);
                }
            }
        } else {
           await msg.channel.send(`No arguments were passed to execute this command.\n`
                + 'Usage: ' + this.usage);
        }

    }
};