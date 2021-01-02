const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');

const auth = require('./../auth.json');
const private_flag = auth.private_prefix;
const temp_flag = auth.one_time_prefix;


module.exports = {
    name: 'deleteAllAlarms',
    description: 'Deletes all of YOUR alarms in the server you use it - **THIS ACTION CANNOT BE REVERTED**\n'
        + '-a for public alarms of that server and -p for private alarms',
    usage: auth.prefix + 'deleteAllAlarms <flag>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        var flag = args[0];
        let alarm_user = msg.author.id;
        if (flag.toLowerCase() === '-p') {
            try {
                var to_be_removed = await Private_alarm_model.find(
                    { alarm_id: { $regex: `.*${alarm_user}.*` } },
                );
                var x = await Private_alarm_model.remove(
                    { alarm_id: { $regex: `.*${alarm_user}.*` } },
                );
                console.log(to_be_removed);
                to_be_removed.find(function (i) {
                    cron_list[i.alarm_id].stop();
                    delete cron_list[i.alarm_id];
                });
                msg.channel.send(`Sucessfully deleted ${x.deletedCount} alarms.`);
            } catch (e) {
                console.log(e);
                msg.channel.send(`Error deleting your private alarms...`);
            }
        }
        else if (flag.toLowerCase() === '-a') {
            try {
                var to_be_removed = await Alarm_model.find({
                    $and: [
                        { alarm_id: { $regex: `.*${alarm_user}.*` } },
                        { guild: msg.guild.id },
                    ]
                });
                var y = await Alarm_model.remove({
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
            } catch (e) {
                console.log(e);
                msg.channel.send(`Error deleting your alarms...`);
            }
        }
    }
};