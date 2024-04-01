const mongodb=require('mongodb')
const mongoose=require('mongoose')
const bcrypt=require('bcrypt')
const UserSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },

    email:{
        type:String,
        unique:true,
        required:true
    },

    password:{
        type:String,
        required:true,
    },

    verified:{
        type:Boolean,
        default:false
    }

})

UserSchema.pre('save',async function(next){
    const user=this
    if(!user.isModified('password')){
        return next()
    }
    user.password=await bcrypt.hash(user.password,8)
    next()
})


const User=mongoose.model("User",UserSchema)
module.exports=User
