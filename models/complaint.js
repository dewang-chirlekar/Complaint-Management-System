const mongoose = require('mongoose')
const dbconnect = require('../db');
const { assign } = require('express-handlebars/lib/utils');

//Call the db to connect the mongo db
dbconnect()

// Complaint Schema
const ComplaintSchema = mongoose.Schema({
    complaintNo: {
        type: Number,
        unique: true
    },

    title: {
        type: String
    },
    description: {
        type: String
    },
    status: {
    type: String,
    default: "Pending"
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
});

const Complaint = module.exports = mongoose.model('Complaint', ComplaintSchema);

module.exports.registerComplaint = function (newComplaint, callback) {
    newComplaint.save(callback);
}

module.exports.getAllComplaints = function(callback){
    Complaint.find(callback);
  }