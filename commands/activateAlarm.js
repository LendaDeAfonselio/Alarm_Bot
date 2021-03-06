const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');
const utility_functions = require('../Utils/utility_functions');

const auth = require('./../auth.json');
const private_flag = auth.private_prefix;
const temp_flag = auth.one_time_prefix;
const logging = require('../Utils/logging');


module.exports = {
    name: 'activateAlarm',
    description: 'Silences the alarm with a given id. To turn it back on use activateAlarm <id>',
    usage: auth.prefix + 'silenceAlarm <id>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        if (args.length >= 1) {
            var alarm_to_activate = args[0];

            if (alarm_to_activate.includes(auth.one_time_prefix)) {
                msg.channel.send('You cannot activate a oneTimeAlarm because they cannot be silenced...');
                return;
            }

            if (!utility_functions.can_change_alarm(msg, alarm_to_activate)) {
                msg.channel.send(`The alarm you selected isn't yours or you aren't administrator on this server therefore you cannot silence it!`)
            }
            else {
                if (cron_list[alarm_to_activate] !== undefined) {
                    if (!cron_list[alarm_to_activate].running) {
                        // add verification for DMs and guild id
                        try {
                            if (alarm_to_activate.includes(private_flag)) {
                                await Private_alarm_model.updateOne(
                                    { alarm_id: alarm_to_activate },
                                    {
                                        isActive: true
                                    }
                                )
                            } else if (!alarm_to_activate.includes(temp_flag)) {
                                await Alarm_model.updateOne(
                                    { alarm_id: alarm_to_activate },
                                    {
                                        isActive: true
                                    }
                                )
                            }
                            cron_list[alarm_to_activate].start();
                            msg.channel.send(`${alarm_to_activate} is now active again.`);
                        } catch (e) {
                            logging.logger.info(`Error re-activating alarm with id:${alarm_to_activate}... Please try again later!`);
                            logging.logger.error(e);
                            msg.channel.send(`Error re-activating alarm with id:${alarm_to_activate}... Please try again later!`);
                        }
                    } else {
                        msg.channel.send(`Alarm with id ${alarm_to_activate} has already been silenced.\nTo see your alarms, type: ${auth.prefix}${myalarms_command_stg}`);

                    }
                }
                else {
                    var myalarms_command_stg = "`myAlarms`";
                    msg.channel.send(`Impossible to silence alarm with id ${alarm_to_activate}.\nPlease check if you entered the id of the alarm correctly!\nTo see your alarms, type: ${auth.prefix}${myalarms_command_stg}`);
                }
            }
        } else {
            msg.channel.send(`No arguments were passed to execute this command.\n`
                + 'Usage: ' + this.usage);
        }

    }
};