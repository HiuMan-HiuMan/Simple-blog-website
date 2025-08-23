import express from "express";
import pg from "pg";
import env from "dotenv";
import passport from "passport";
import bcrypt from "bcrypt";
import { Strategy } from "passport-local";
import session from "express-session";
import e from "express";


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

app.get("/", async (req, res) => {
    if(req.isAuthenticated()) {
        console.log("is authenticated");
        try {
            const userPosts = await db.query("SELECT * FROM posts AS p JOIN users AS u ON p.userid = u.id WHERE userid = $1 ORDER BY date DESC",
                [req.user.id]
            );

            if(userPosts.rows.length === 0) {
                return res.render("home.ejs");
            }
            
            res.render("home.ejs", {
                posts: userPosts.rows,
            });

        } catch(err) {
            console.log(err);
            res.render("home.ejs");
        }
    } else {
        console.log("not authentiated");
        res.redirect("/login");
    }
});

app.get("/login", (req, res) => {
    res.render("login.ejs")
});


app.get("/add", (req, res) => {
    if(req.isAuthenticated()) {
        res.render("edit.ejs");
    } else {
        res.redirect("/login");
    }
});

app.get("/edit/:id", async (req, res) => {
    if(!req.isAuthenticated()) {
        return res.status(401).render("login.ejs");
    } 
    try {
        const post = await db.query("SELECT * FROM posts WHERE postid = $1 AND userid = $2",
            [req.params.id, req.user.id]
        )

        if(post.rows.length === 0) {
            throw new Error("Post not found or user not authorised");
        }

        res.render("edit.ejs", {
            post: post.rows[0],
        });
    } catch(err) {
        console.log(err);
        res.redirect("/");
    }
});

app.get("/browse", async (req, res) => {
    if(!req.isAuthenticated()) {
        return res.status(401).render("login");
    }
    try {
        const postCatalogue = await db.query("SELECT * FROM posts JOIN users ON posts.userid = users.id WHERE posts.userid <> $1 ORDER BY date DESC",
            [req.user.id]
        );

        if(postCatalogue.rows.length === 0) {
            throw new Error("No posts found");
        }

        res.render("browse.ejs", {
            posts: postCatalogue.rows,
        });

    } catch(err) {
        res.render("browse.ejs");
    }
}) 



app.get("/search", async (req, res) => {
  if(!req.isAuthenticated()) {
    return res.status(401).render("login.ejs");
  }

  try {
    const postCatalogue = await db.query("SELECT * FROM posts AS p JOIN users AS u ON p.userid = u.id WHERE u.username LIKE $1 ORDER BY date DESC",
        [req.query.searchUser + '%'] 
    )

    if(postCatalogue.rows.length === 0) {
        return res.render("browse.ejs");
    }
    res.render("browse.ejs", {
        posts: postCatalogue.rows,
    });

  } catch(err) {
    console.log("error while searching");
    console.log(err);
    res.render("browse.ejs");
  }
});


app.get("/delete", (req, res) => {
    res.redirect("/home");
});

app.get("/register", (req, res) => {
    res.render("register.ejs");
});


app.post("/login", passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
}));
  
app.post("/logout", (req, res) => {
    req.logout((err) => {
        if(err) {return next(err);}
        res.redirect("/");
    });
});

app.post("/post/add", async (req, res) => {
    try {
        if(req.isAuthenticated()) {
            const today = new Date();
            const todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0') + "-" + String(today.getDate()).padStart(2, '0');
            const newPost = await db.query("INSERT INTO posts (title, content, date, userid) VALUES ($1, $2, $3, $4)",
            [req.body.title, req.body.content, todayStr, req.user.id]
            );
            console.log(todayStr);
            console.log("New post by " + req.user.username + " added");
        }
        res.redirect("/");
    } catch(err) {
        console.log("Something went wrong when creating new post");
         console.log(err);
        res.redirect("/add");
    }
});

app.post("/post/edit", async (req, res) => {
    console.log(req.body.title, req.body.content, req.body.postid, req.user.id);
    if(!req.isAuthenticated()) {
        return res.status(401).render("login.ejs");
    }
    try {
        const today = new Date();
        const todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0') + "-" + String(today.getDate()).padStart(2, '0');
        const result = await db.query("UPDATE posts SET title = $1, content = $2, date = $3 WHERE postid = $4 AND userid = $5",
            [req.body.title, req.body.content, todayStr, req.body.postid, req.user.id]
        )
        console.log(result.rows);
        res.redirect("/");

    } catch(err) {
        console.log(err);
        res.redirect("/");
    }
});

app.post("/register", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1 OR username = $2", [req.body.email, req.body.username]);

        if(result.rows.length === 0) {
            bcrypt.hash(req.body.password, saltrounds, async (err, hash) => {
                if(err) {
                    res.render("register.ejs");
                } else {
                    const result = await db.query("INSERT INTO users (email, username, password) VALUES ($1, $2, $3) RETURNING *",
                        [req.body.email, req.body.username, hash]
                    );
                    const newUser = result.rows[0];
                    console.log("New user added: " + newUser);
                    req.login(newUser, function (err) {
                        if(err) {return next(err)}
                        return res.redirect("/");
                    });
                }
            });
        } else {
            console.log("Username or email unavailable");
            res.render("/register");
        }
    } catch(err) {
        console.log(err);
        res.redirect("/register");
    }
});

app.post("/logout", (req, res) => {
    req.logout((err) => {
        if(err) {return next(err)}
        return res.status(200);
    });
})

app.delete("/post/:id", async (req, res) => {
    if(!req.isAuthenticated()) {
        return res.status(401).render("login.ejs");
    }
    try {
        const deletePost = await db.query("DELETE FROM posts WHERE postid = $1 AND userid = $2 RETURNING *", 
            [req.params.id, req.user.id]
        );

        console.log(deletePost);

        if(deletePost.rows.length === 0) {
            console.log("Item does not exist or user is not authorised")
            return res.status(400);
        }

        console.log("post found");
        return res.status(200).json({why: "j"});

    } catch(err) {
        console.log("Error while deleting");
        console.log(err);
        return res.status(500);
    }
    
});

passport.use("local", new Strategy(async function verify(username, password, cb) {
    try {
        const result = await db.query("SELECT * FROM users WHERE username = $1",
            [username]
        );
        if(result.rows === 0) {
            return cb(err);
        } else {
            const user = result.rows[0];
            const hashPassword = user.password;

            bcrypt.compare(password, hashPassword, (err, result) => {
                if(err) {
                    return cb(err);
                } else {
                    return cb(null, user);
                }
            })
        }

    } catch(err) {
        return cb(err);
    }
}));




passport.serializeUser((user, cb) => {
    cb(null, user)
});

passport.deserializeUser((user, cb) => {
    cb(null, user);
});

app.listen(port, () => {
    console.log(`Serevr listening on port ${port}`);
});