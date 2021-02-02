const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');

const auth = require('./../auth.json');
const logging = require('../Utils/logging');


module.exports = {
    name: 'deleteAllAlarms',
    description: 'Deletes all of YOUR alarms in the server you use it - **THIS ACTION CANNOT BE REVERTED**\n'
        + '-a for public alarms of that server and -p for private alarms',
    usage: auth.prefix + 'deleteAllAlarms <flag>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        var flag = args[0];
        let alarm_user = msg.author.id;
        if (args.length > 0) {
            if (flag.toLowerCase() === '-p') {
                try {
                    var to_be_removed = await Private_alarm_model.find(
                        { alarm_id: { $regex: `.*${alarm_user}.*` } },
                    );
                    if (to_be_removed.length > 0) {
                        var x = await Private_alarm_model.deleteMany(
                            { alarm_id: { $regex: `.*${alarm_user}.*` } },
                        );
                        to_be_removed.find(function (i) {
                            cron_list[i.alarm_id].stop();
                            delete cron_list[i.alarm_id];
                        });
                        msg.channel.send(`Sucessfully deleted ${x.deletedCount} alarms.`);
                    } else {
                        msg.channel.send('No private alarm found for your user. Try `myAlarms` to check your alarms');
                    }
                } catch (e) {
                    logging.logger.error(e);
                    msg.channel.send(`Error deleting your private alarms...`);
                }
            }
            else if (flag.toLowerCase() === '-a') {
                if (msg.channel.type === 'dm') {
                    msg.channel.send('Can only delete public alarms in a server, otherwise the bot does not know which alarms to delete.');
                    return;
                }
                try {
                    var to_be_removed = await Alarm_model.find({
                        $and: [
                            { alarm_id: { $regex: `.*${alarm_user}.*` } },
                            { guild: msg.guild.id },
                        ]
                    });
                    if (to_be_removed.length > 0) {

                        var y = await Alarm_model.deleteMany({
                            $and: [
                                { alarm_id: { $regex: `.*${alarm_user}.*` } },
                                { guild: msg.guild.id },
                            ]
                        });
                        to_be_removed.find(function (i) {
                            cron_list[i.alarm_id].stop();
                            delete cron_list[i.alarm_id];
                        });
                        msg.channel.send(`Sucessfully deleted ${y.deletedCount} alarms.`);
                    } else {
                        msg.channel.send('No alarm found for you in this server. Try `myAlarms` to check your alarms');
                    }
                } catch (e) {
                    logging.logger.info(`Error deleting alarms for user:${alarm_user} with params ${flag}`);
                    logging.logger.error(e);
                    msg.channel.send(`Error deleting your alarms...`);
                }
            }
        } else {
            var stg = "You did not specify what alarms you wish to delete.\n"
                + "`" + auth.prefix + "`:deleteAllAlarms -p` deletes all of your private alarms.\n"
                + "`" + auth.prefix + ":deleteAllAlarms -a` deletes YOUR alarms for this server.";
            msg.channel.send(stg.replace(/:/g, auth.prefix));
        }
    }
};