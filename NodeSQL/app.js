import express from "express";
import cors from "cors";
import { initializeDB } from "./database.js";
import usersRouter from "./routes/users.js";
import swaggerUi from 'swagger-ui-express';
import { readFile } from "fs/promises";

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
app.use(express.json()); // A JSON kérések kezeléséhez

// SQLite adatbázis kapcsolat
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error('Nem sikerült megnyitni az adatbázist:', err.message);
  } else {
    console.log('Az SQLite adatbázis sikeresen megnyitva.');
  }
});

// Swagger konfiguráció
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User Management API',
      version: '1.0.0',
      description: 'An API to manage users with SQLite and Swagger documentation',
    },
  },
  apis: ['./index.js'], // API dokumentációs kommentek
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI beállítása
app.use('/users/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Adatbázis tábla létrehozása, ha még nem létezik
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      firstName TEXT,
      lastName TEXT,
      class TEXT
    )
  `);
});

// API végpontok
//get all users

app.get('/users', (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});
//get by email

app.get('/users/:email', (req, res) => {
  const { email } = req.params;
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ message: 'Adat nem található' });
      return;
    }
    res.json(row);
  });
});
// nem user

app.post('/users', (req, res) => {
  const { email, firstName, lastName, class: userClass } = req.body;
  if (!email || !firstName || !lastName || !userClass) {
    res.status(400).json({ message: 'A szükséges mezők hiányoznak' });
    return;
  }

  const stmt = db.prepare('INSERT INTO users (email, firstName, lastName, class) VALUES (?, ?, ?, ?)');
  stmt.run(email, firstName, lastName, userClass, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ message: 'Új adat sikeresen létrehozva', userId: this.lastID });
  });
});
//update

app.put('/users/:email', (req, res) => {
  const { email } = req.params;
  const { firstName, lastName, class: userClass } = req.body;

  if (!firstName && !lastName && !userClass) {
    res.status(400).json({ message: 'Nincs frissíthető mező' });
    return;
  }

  const query = 'UPDATE users SET firstName = ?, lastName = ?, class = ? WHERE email = ?';
  db.run(query, [firstName, lastName, userClass, email], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ message: 'Adat nem található' });
      return;
    }
    res.json({ message: 'Adat sikeresen frissítve!' });
  });
});
//delete by email

app.delete('/users/:email', (req, res) => {
  const { email } = req.params;

  db.run('DELETE FROM users WHERE email = ?', [email], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ message: 'Adat nem találva' });
      return;
    }
    res.json({ message: 'Az adat sikeresen törölve' });
  });
});

// Szerver indítása

const startServer = async () => {
    await initializeDB();
    app.listen(3000, () => console.log("Server is running on port 3000"), console.log('Swagger dokumentációja elérhető itt: http://localhost:3000/users/api-docs'));
};
startServer();

