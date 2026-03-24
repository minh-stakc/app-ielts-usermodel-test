const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User.js");
const Test = require('./models/Test.js');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
const bcryptSalt =  bcrypt.genSaltSync(10);
require("dotenv").config();
const jwtSecret = process.env.JWT_SECRET || 'change-me';
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: "http://127.0.0.1:5173",
}));
console.log(process.env.MONGOOSE_URL);

mongoose.connect(process.env.MONGOOSE_URL);
const connection = mongoose.connection;
connection.once('open', () => {
  console.log("MongoDB database connection established successfully");
});

app.get('/api/test', (req, res) => {res.json('something');});
app.post('/api/register', async (req, res) => {
    const {name, email, password} = req.body
    try{
      const userDoc = await User.create({
        name,
        email,
        password:bcrypt.hashSync(password, bcryptSalt),
      })

      console.log(req.body)
      res.json(userDoc)
    } catch (e) {
      res.status(422).json(e);
    }
})

app.post('/api/login', async (req, res) => {
  const {email, password} = req.body;
  const userDoc = await User.findOne({email});
  console.log(userDoc)
  if (userDoc){
    const pass0k = bcrypt.compareSync(password, userDoc.password);
    // console.log(pass0k)
    if (pass0k){
      jwt.sign({
        email:userDoc.email, 
        id:userDoc._id, 
        name:userDoc.name}, 
        jwtSecret, {}, (err, token) => {
        if (err) throw err;
        res.cookie('token', token).json(userDoc)
      })
    } else{
      res.status(422).json('pass not ok')
    }
  } else{
    res.status(404).json('Not found!')
  }
})

app.get('/api/profile', (req, res) => {
  const {token} = req.cookies
  if(token){
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      const {name, email, _id} = await User.findById(userData.id);
      res.json({name, email, _id});
    })
  } else{
    res.json(null)
  }
})

app.post('/api/logout', (req, res) => {
  res.cookie('token', '').json(true);
})

app.post('/api/tests', (req,res) => {
  const {token} = req.cookies;
  const {
    title,text,addedPhotos, info, answer
  } = req.body;
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    if (err) throw err;
    const testDoc = await Test.create({
      title,text,photos:addedPhotos,info,answer,author:userData.id,
    });
    res.json(testDoc);
  });
});

app.get('/api/user-tests-uploaded', (req,res) => {
  const {token} = req.cookies;
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    const {id} = userData;
    res.json( await Test.find({author:id}) );
  });
});

app.put('/api/tests', async (req,res) => {
  const {token} = req.cookies;
  const {
    id, title,test,addedPhotos,info, answer
  } = req.body;
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    if (err) throw err;
    const testDoc = await Test.findById(id);
    if (userData.id === testDoc.author.toString()) {
      testDoc.set({
        title,text,photos:addedPhotos,info,answer
      });
      await testDoc.save();
      res.json('ok');
    }
  });
});

app.get('/api/places', async (req,res) => {
  res.json( await Test.find() );
});

app.get('/api/places/:id', async (req,res) => {
  const {id} = req.params;
  res.json(await Test.findById(id));
});

app.get('/api/places/search', async (req,res) => {
  const {title} = req.body.trim();
  const response = await Test.find({title:{$regex: new RegExp('^'+title+'.*','i')}}).exec();
  res.json(response);
})

app.listen(4000);
