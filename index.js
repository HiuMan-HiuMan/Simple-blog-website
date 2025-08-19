import express from "express";
import pg from "pg";
import env from "dotenv";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";


const app = express();
const port = process.env.PORT || 3000;
const saltrounds = process.env.SALT_ROUNDS || 10;

env.config();

app.use(express.urlencoded({urlencoded: true}));
app.use(express.static("public"));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
})
);

app.use(passport.initialize());
app.use(passport.session());


const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

db.connect();

app.get("/", (req, res) => {
    res.render("login.ejs");
});

app.get("/home", async (req, res) => {
    res.render("home.ejs", {

    });
});

app.get("/edit", (req, res) => {
    res.render("edit.ejs");
});

app.get("/search", (req, res) => {
    res.render("browse.ejs");
});

app.get("/delete", (req, res) => {
    res.redirect("/home");
});

app.get("/logout", (req, res) => {
    res.redirect("/")
});

app.get("/register", (req, res) => {
    res.render("register.ejs");
});

app.post("/search", (req, res) => {
    console.log(req.body);
    res.render("home.ejs");
});


app.post("/login", (req, res) => {
    console.log(req.body);
    res.render("home.ejs");
});

app.post("/register", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1 OR username = $2", [req.body.email, req.body.name]);

        if(result.rows.length === 0) {
            
            const newUser = await db.query("INSERT INTO users (email, username, password) VALUES ($1 $2 $3)")
        } else {

        }
    } catch(err) {
        console.log(err);
        res.redirect("register.ejs");
    }
});


passport.serializeUser((user, cb) => {
    cb(null, user)
});

passport.deserializeUser((user, cb) => {
    cb(null, user);
});

app.listen(port, () => {
    console.log(`Serevr listening on port ${port}`);
});