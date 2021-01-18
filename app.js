const key = config.OPEN_WEATHER_KEY;
let now;
let hour;
let lat;
let lon;
let weather;
let music = new Audio();
music.loop = true;

function refreshTime() {
    console.clear();
    now = new Date();
    if (now.getHours() !== hour) {
        hour = now.getHours();
    }
    // get reference of next hour 
    // if nextHour === prevHour+1 change music
    // every 10 mins, if weather has changed, update music
    console.log(now.toLocaleTimeString('en-US'));
}

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

async function getWeather()
{
    let weatherJSON = await getJSON(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}`);
    return weatherJSON.weather[0].main;
}

// Handle all fetch requests
async function getJSON(url) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      throw error;
    }
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
        // Fade in until default volume is reached:
        if (music.volume < 1.0) {
            music.volume += 0.05;
        }
        // When default volume is reached, stop:
        if (music.volume >= 1.0) {
            clearInterval(fadeAudio);
        }
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

window.addEventListener('click', startApp);