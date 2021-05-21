const mongoose = require('mongoose');
const oneTimeAlarm = mongoose.Schema({
    alarm_id: String,
    alarm_date: Date,
    message: String,
    isPrivate: Boolean,
    guild: String,
    channel: String,
    user_id: String,
    timestamp: Date
});

module.exports = mongoose.model("One_Time_Alarm", oneTimeAlarm);