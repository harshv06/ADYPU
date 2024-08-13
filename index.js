const express=require('express')
const mongoose=require('mongoose')
const cors=require('cors')
const json=require('jsonwebtoken')
const bodyParser=require('body-parser')
const path = require('path');

require('dotenv').config()
const app=express()
app.use(express.urlencoded({extended:false}))
const routes=require('./Routes')
app.use(cors())
app.use(bodyParser.json())
app.use(routes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// mongoose.connect(process.env.MONGO_URL).then(()=>{
//     console.log("Succesfully connected to database")
// }).catch((err)=>{
//     console.log("Failed to connected to database")
//     console.log(err)
// })

app.listen(process.env.PORT,()=>{
    console.log("Server Started Successfully")
})