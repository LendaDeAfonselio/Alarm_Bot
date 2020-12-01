const mongoose = require('mongoose');
const privateAlarmSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    alarm_id: String,
    alarm_args: String,
    message: String,
    user_id: String,
    timestamp: Date
});

module.exports = mongoose.model("Private_alarm_model", privateAlarmSchema);