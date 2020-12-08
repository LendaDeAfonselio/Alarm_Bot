const mongoose = require('mongoose');
const oneTimeAlarm = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    alarm_id: String,
    alarm_date: Date,
    message: String,
    private: Boolean,
    guild: String,
    channel: String,
    timestamp: Date
});

module.exports = mongoose.model("One_Time_Alarm", oneTimeAlarm);