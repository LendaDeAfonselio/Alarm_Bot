const mongoose = require('mongoose');
const privateAlarmSchema = mongoose.Schema({
    alarm_id: String,
    alarm_args: String,
    message: String,
    user_id: String,
    isActive: Boolean,
    timestamp: Date
});

module.exports = mongoose.model("Private_alarm_model", privateAlarmSchema);