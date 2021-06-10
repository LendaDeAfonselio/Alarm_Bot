const mongoose = require('mongoose');
const premiumUser = mongoose.Schema({
    discord_user_id: String,
    discord_user_tag: String,
    bmc_user: String,
    expiry_date: Date,
    timestamp: Date
});

module.exports = mongoose.model("Premium_User_Model", premiumUser);