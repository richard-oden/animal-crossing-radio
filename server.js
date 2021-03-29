// Load Node modules:
const express = require('express');
const fetch = require('node-fetch');
// Get API keys:
require('dotenv').config();
const openWeatherKey = process.env.OPEN_WEATHER_KEY;
const googleKey = process.env.GOOGLE_KEY;
// Initialize Express:
const app = express();
// Render static files:
app.use(express.static('public'));
// Port website will run on:
const PORT = process.env.PORT || 3000;
app.listen(PORT);

async function getJSON(url) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      throw error;
    }
}

app.get('/reverse-geocode/:coords', async (req, res) => {
    const locationJSON = await getJSON(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${req.params.coords}&key=${googleKey}`);
    res.json(locationJSON);
});

app.get('/geocode/:address', async (req, res) => {
    const locationJSON = await getJSON(`https://maps.googleapis.com/maps/api/geocode/json?address=${req.params.address}&key=${googleKey}`);
    res.json(locationJSON);
});

app.get('/timezone/:coords/:timestamp', async (req, res) => {
    const timezoneJSON = await getJSON(`https://maps.googleapis.com/maps/api/timezone/json?location=${req.params.coords}&timestamp=${req.params.timestamp}&key=${googleKey}`);
    res.json(timezoneJSON);
});

app.get('/weather/:coords', async (req, res) => {
    const coords = req.params.coords.split(',');
    const weatherJSON = await getJSON(`https://api.openweathermap.org/data/2.5/weather?lat=${coords[0]}&lon=${coords[1]}&appid=${openWeatherKey}`);
    res.json(weatherJSON);
});