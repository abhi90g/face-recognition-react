const express = require("express");
const bcrypt = require("bcrypt-nodejs");
const cors = require("cors");

const knex = require("knex");

const db = knex({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    user: "",
    password: "",
    database: "smart-brain",
  },
});

// db.select("*")
//   .from("users")
//   .then((data) => {
//     console.log(data);
//   });

const app = express();
app.use(express.json());
app.use(cors());

// const database = {
//   users: [
//     {
//       id: "123",
//       name: "Jon",
//       email: "jon@jon.com",
//       password: "something",
//       entries: 0,
//       joined: new Date(),
//     },
//     {
//       id: "124",
//       name: "Sally",
//       email: "sally@sally.com",
//       password: "nothing",
//       entries: 0,
//       joined: new Date(),
//     },
//     {
//       id: "125",
//       name: "Mark",
//       email: "mark@mark.com",
//       password: "mark",
//       entries: 0,
//       joined: new Date(),
//     },
//   ],
// };

app.get("/", (req, res) => {
  res.send(db.users);
});

app.post("/signin", (req, res) => {
  db.select("email", "hash")
    .from("login")
    .where("email", "=", req.body.email)
    .then((data) => {
      const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
      console.log(isValid);
      if (isValid) {
        return db
          .select("*")
          .from("users")
          .where("email", "=", req.body.email)
          .then((user) => {
            res.json(user[0]);
          })
          .catch((err) => res.status(400).json("unable to get user"));
      } else {
        res.status(400).json("wrong creds");
      }
    })
    .catch((err) => res.status(400).json("wrong creds"));
  // if (
  //   req.body.email === database.users[0].email &&
  //   req.body.password === database.users[0].password
  // ) {
  //   res.json("success");
  // } else {
  //   res.status(400).json("error logging in");
  // }
});

app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  const hash = bcrypt.hashSync(password);
  // database.users.push({
  //   id: "126",
  //   name: name,
  //   email: email,
  //   password: password,
  //   entries: 0,
  //   joined: new Date(),
  // });
  // // doing more than 2 things at once in transaction. updating 2 tables at once (users, login)
  db.transaction((trx) => {
    trx
      .insert({
        hash: hash,
        email: email,
      })
      .into("login")
      .returning("email")
      .then((loginEmail) => {
        return trx("users")
          .returning("*")
          .insert({
            email: loginEmail[0],
            name: name,
            joined: new Date(),
          })
          .then((user) => {
            res.json(user[0]);
          });
      })
      .then(trx.commit)
      .catch(trx.rollback);
  }).catch((err) => res.status(400).json("unable to register"));
});

app.get("/profile/:id", (req, res) => {
  const { id } = req.params;
  let found = false;
  db.select("*")
    .from("users")
    .where({ id })
    .then((user) => {
      if (user.length) {
        res.json(user[0]);
      } else {
        res.status(400).json("not found");
      }
    })
    .catch((err) => res.status(400).json("error getting user"));
});

app.put("/image", (req, res) => {
  const { id } = req.body;
  let found = false;
  db("users")
    .where("id", "=", id)
    .increment("entries", 1)
    .returning("entries")
    .then((entries) => {
      res.json(entries[0]);
    })
    .catch((err) => res.status(400).json("cant get entries"));
  // database.users.forEach((user) => {
  //   if (user.id === id) {
  //     found = true;
  //     user.entries++;
  //     return res.json(user.entries);
  //   }
  // });
  // if (!found) {
  //   res.status(404).json("no such user");
  // }
});

// bcrypt.hash("bacon", null, null, function(err, hash) {
//     // Store hash in your password DB.
// });

// // Load hash from your password DB.
// bcrypt.compare("bacon", hash, function(err, res) {
//     // res == true
// });
// bcrypt.compare("veggies", hash, function(err, res) {
//     // res = false
// });

app.listen(9000, () => {
  console.log("app is running on 9000");
});

/*
/ --res = this is working
/signin --> POST success/fail
/register --> POST to database = user
/profile/:user --> GET = return user
/image --> PUT --> returns user count
*/
