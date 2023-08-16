//-------------------packages--------------------
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passportLocalMongoose = require("passport-local-mongoose");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook");
const findOrCreate = require("mongoose-findorcreate");

// const bcrypt = require("bcrypt");
// const saltRounds = 10;

//const md5 = require("md5");
// const encrypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "I will definately be a great fullstack developer",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// mongoose.connect("mongodb://127.0.0.1:27017/userDB");
mongoose
  .connect(
    "mongodb+srv://Fifonsi:iHw9ozYCvaXmCNKy@cluster0.o5mlfps.mongodb.net/?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("DB connected!");
  })
  .catch((err) => console.log(err));

//----------------mongoose Schema-------------------

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});
userSchema.plugin(findOrCreate);
userSchema.plugin(passportLocalMongoose);

//level 2 security ----------encryption-------------

// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields:['password']});

//----------------model from Schema-----------------
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture,
    });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

//---------googleOAuth passport------------------

// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: process.env.CLIENT_ID,
//       clientSecret: process.env.CLIENT_SECRET,
//       callbackURL: "http://localhost:3000/auth/google/secrets",
//       userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
//     },
//     function (accessToken, refreshToken, profile, cb) {
//       console.log(profile);
//       User.findOrCreate({ googleId: profile.id }, function (err, user) {
//         return cb(err, user);
//       });
//     }
//   )
// );

//--------------------facebookOAuth passport ---------------------

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.APP_ID,
      clientSecret: process.env.APP_SECRET,
      callbackURL: "http://localhost:3000/auth/facebook/callback",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ facebookId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

//----------------get routes------------------

app.get("/", (req, res) => {
  res.render("home");
});

//------------googleOAuth routes--------------
// app.get(
//   "/auth/google",
//   passport.authenticate("google", { scope: ["profile"] })
// );
// app.get(
//   "/auth/google/secrets",
//   passport.authenticate("google", { failureRedirect: "/login" }),
//   function (req, res) {
//     // Successful authentication, redirect home.
//     res.redirect("/secrets");
//   }
// );

//------------facebookOAuth routes--------------
app.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: ["profile"] })
);

app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});
app.get("/secrets", function (req, res) {
 User.find ({"secret": {$ne: null}}).then((founduser) => {
    if (founduser){
        res.render("secrets",{usersWithSecrets: founduser})
    }
 }).catch((err) => {
    
 });
});
app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (!err) {
      res.redirect("/");
    } else {
      throw err;
    }
  });
});

//-----------------------post routes-------------------------

app.post("/submit", function (req, res) {
  const submittedSecret = req.body.secret;
  User.findById(req.user.id).then((founduser) => {
    if (founduser) {
      founduser.secret = submittedSecret;
      founduser.save().then(res.redirect("/secrets"));
      
    }
  });
});

//------------------Using Passport level5----------------------
app.post("/register", function (req, res) {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/resgister");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    }
  );
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

//------------------------bycrypt hashing level 4 security----------------------

// app.post("/register", (req, res) => {
//   bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
//     const newUser = new User({
//       email: req.body.username,
//       password: hash,
//     });
//     newUser
//       .save()
//       .then(res.render("secrets"))
//       .catch((error) => {
//         console.error("Error saving instance:", error);
//       });
//   });
// });

// app.post("/login", function (req, res) {
//   const username = req.body.username;
//   const password = req.body.password;

//   console.log(username + " " + password);

//   User.findOne({ email: username }).then((founduser) => {
//     if (founduser) {
//       bcrypt.compare(password, founduser.password, function (err, result) {
//         if (result === true) {
//           res.render("secrets");
//         }
//       });
//     }
//   });
// });

//-----------------------listening----------------------

app.listen(3000, () => {
  console.log("Server up and running!");
});
