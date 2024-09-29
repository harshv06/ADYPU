const mongodb = require("mongodb");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const UserSchema = new mongoose.Schema({
  userID: {
    type: String,
    unique: true, // Ensure each user ID is unique
  },

  authors: {
    type: String,
    required: true,
  },

  number: {
    type: String,
    unique: true,
    required: true,
    minlength: 10,
    maxlength: 10,
  },

  email: {
    type: String,
    unique: true,
    required: true,
  },
});

// UserSchema.pre('save',async function(next){
//     const user=this
//     if(!user.isModified('password')){
//         return next()
//     }
//     user.password=await bcrypt.hash(user.password,8)
//     next()
// })

const User = mongoose.model("User", UserSchema);
module.exports = User;
