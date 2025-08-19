import express from "express";

const app = express();
const port = 3000;

app.use(express.urlencoded({urlencoded: true}));
app.use(express.static("public"));


const post = [{"name": "why"}];


app.get("/", (req, res) => {
    res.render("login.ejs");
});

app.get("/home", (req, res) => {
    res.render("home.ejs");
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

app.get("/posts/id", (req, res) => {

});


app.post("/search", (req, res) => {
    console.log(req.body);
    res.render("home.ejs");
});


app.post("/login", (req, res) => {
    console.log(req.body);
    res.render("home.ejs");
});

app.listen(port, () => {
    console.log(`Serevr listening on port ${port}`);
});