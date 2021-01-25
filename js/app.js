import Papa from 'papaparse';

const openWeatherKey = config.OPEN_WEATHER_KEY;
const detectBtn = document.getElementById('detect-btn');
const launchBtn = document.getElementById('launch-btn');

let now;
let hour;
let lat;
let lon;
let weather;
let music = new Audio();
music.loop = true;

Papa.parse('../worldcities.csv', {
  header: true,
  download: true,
  dynamicTyping: true,
  complete: function(results) {
    console.log(results);
  }
});

function setCoords() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            lat = position.coords.latitude;
            lon = position.coords.longitude;
        }, () => {
            console.log('Unable to retrive location.');
        });
    } else {
        console.log('Geolocation is not supported by this browser.');
    }
}

function handleInput(inputStr) {
    let inputArr = inputStr.split(/(?:\s|\W)+/gm);
    let urlSubStr = ``;
    // If input is only numbers, try zip code or coordinates:
    if (!inputArr.every(isNaN)) {
        urlSubStr += inputArr.length === 1 ? `zip=${inputArr[0]}` : `lat=${inputArr[0]}&lon=${inputArr[1]}`;
    // If first item in input is number, try zip code and country:
    } else if (!isNaN(inputArr[0])) {
        urlSubStr += `zip=${inputArr[0]},${inputArr[1]}`;
    // Else, try query:
    } else {
        urlSubStr += `q=`
        if (inputArr.length == 3) {}
        for (let i = 0; i < inputArr.length; i++) {
            if (acronymToFullName(inputArr[i])) inputArr[i] = acronymToFullName(inputArr[i]);
            urlSubStr += i === inputArr.length-1 ? inputArr[i] : inputArr[i] + ',';
        }
    }
    return urlSubStr;
}

async function getJSON(url) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      throw error;
    }
}

async function getWeather()
{
    let weatherJSON = await getJSON(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${openWeatherKey}`);
    return weatherJSON.weather[0].main;
}

function calcMusicId(hour, weather)
{
    let id = (hour * 3) + 1;
    if (['Thunderstorm', 'Drizzle', 'Rain'].includes(weather)) {
        return id;
    } else if (weather === 'Snow') {
        return id + 1;
    } else {
        return id + 2;
    }
}

async function getMusic(id)
{
    music.pause();
    music.src = `https://acnhapi.com/v1/hourly/${id}`;
    music.play();
    fadeInMusic();
}

function fadeInMusic () {
    music.volume = 0.0;
    let fadeAudio = setInterval(() => {
        let volumeRounded = Math.round(music.volume * 100) / 100;
        // Fade in until default volume is reached:
        volumeRounded += 0.05;
        // When default volume is reached, stop:
        if (volumeRounded >= 1) {
            volumeRounded = 1;
            clearInterval(fadeAudio);
        }
        music.volume = volumeRounded;
    }, 200);
}

function startApp() {
    setCoords();
    setInterval(async () => {
        console.clear();
        now = new Date();
        if (now.getHours() !== hour ||
            await getWeather() != weather) {
            hour = now.getHours();
            weather = await getWeather();
            let id = calcMusicId(hour, weather);
            await getMusic(id);
        }
        console.log(now.toLocaleTimeString('en-US'));
        console.log(weather);
    }, 1000);
}

detectBtn.addEventListener('click', startApp);