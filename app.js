require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
// const bcrypt = require('bcrypt')
// const saltRounds = 10;
const passport = require('passport')
const session = require('express-session')
const passportLocalMongoose = require('passport-local-mongoose')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const FacebookStrategy = require('passport-facebook')
const findOrCreate = require('mongoose-findorcreate')
const e = require('express')

const app = express()
app.use(session({
    secret: "Our little secret",
    resave: false,
    saveUninitialized: false

}))

app.use(passport.initialize())
app.use(passport.session())
app.use(express.static("public"))
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ extended: true }))


mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true }, (err) => {
    if (err) {
        console.log(err)
    } else {
        console.log('Connnected to DataBase')
    }
})




const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String
})

userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate)


const User = new mongoose.model("User", userSchema)

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({ username: profile.emails[0].value, googleId: profile.id, }, function (err, user) {
            return cb(err, user);
        });
    }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile._json.name)
        User.findOrCreate({ facebookId: profile.id, facebookName: profile._json.name }, function (err, user) {
            return cb(err, user);
        });
    }
));



app.get('/', (req, res) => {
    res.render('home');
})

app.get("/submit", (req, res) => {
    if (req.isAuthenticated()) {
        res.render('submit')
    } else {
        res.redirect('login')
    }
})
app.post('/submit', (req, res) => {

    User.findById(req.user.id, (err, found) => {
        if (err) {
            console.log(err)
        } else {
            if (found) {
                found.secret = req.body.secret
                found.save(() => {
                    res.redirect('/secrets')
                })
            }
        }
    })


})

app.get('/auth/google',
    passport.authenticate("google", { scope: ['profile', "email"] })
)


app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });

app.get('/auth/facebook',
    passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });
app.get('/auth/error', (req, res) => res.redirect('/login'))


app.get('/login', (req, res) => {
    res.render('login');
})
app.get('/register', (req, res) => {
    res.render('register');
})
app.get("/secrets", (req, res) => {
    User.find({ "secret": { $ne: null } }, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            if (result) {
                res.render('secrets', { userWithSecrets: result })
            }
        }
    })
})
app.get('/logout', (req, res) => {
    req.logOut()
    res.redirect('/')
})



app.post('/register', (req, res) => {

    User.register({ username: req.body.username }, req.body.password, (err, user) => {
        if (err) {
            console.log(err)
            res.redirect('/register')
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect('/secrets')
            })
        }
    })



    // bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
    //     if (!err) {
    //         const newUser = new User({
    //             email: req.body.username,
    //             password: hash
    //         })
    //         newUser.save((err) => {
    //             if (!err) {
    //                 res.render('login')
    //                 console.log('save in database')
    //             } else {
    //                 console.log('NOt save in database')
    //             }
    //         });
    //     } else {
    //         console.log("hash err " + err)
    //     }
    // })




    // User.insertOne({ email: req.body.username, password: req.body.password }, (err) => {
    //     if (!err) {
    //         console.log('successfull inserted')
    //     } else {
    //         console.log(err)
    //     }
    // })
})

app.post('/login', (req, res) => {

    const user = new User({
        username: req.body.username,
        password: req.body.password
    })

    req.logIn(user, (err) => {
        if (err) {
            console.log(err)
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect('/secrets')
            })
        }
    })

    // User.findOne({ email: req.body.username }, (err, result) => {

    //     if (!err) {

    //         bcrypt.compare(req.body.password, result.password, (err, result) => {

    //             if (!err) {
    //                 if (result == true) {
    //                     console.log('right password')

    //                     res.render('secrets')
    //                 } else {
    //                     console.log('wrong password')
    //                     res.redirect('login')
    //                 }
    //             } else {
    //                 console.log('findOne err ' + err)

    //             }

    //         })

    //     } else {
    //         console.log(err)
    //         res.redirect('login')
    //     }
    // })
})


app.listen(3000, () => {
    console.log('server is running')
})