// DOM ELEMENTS ======================================================= //

const mainMenu = document.getElementById('main-menu');
const kkMenu = document.getElementById('kk-menu');
const detectBtn = document.getElementById('detect-btn');
const locationInput = document.getElementById('manual-input');
const launchBtn = document.getElementById('launch-btn');
const kkInput = document.getElementById('kk-input');
const kkLaunchBtn = document.getElementById('kk-launch-btn');
const musicControls = document.querySelector('.music-controls');
const toggleMusicBtn = document.getElementById('toggle-music-btn');
const toggleKKBtn = document.getElementById('toggle-kk-btn');
const volumeBtn = document.getElementById('volume-btn');
const volumeSlider = document.getElementById('volume-slider');
const dateTimeDiv = document.getElementById('date-time');
const weatherDiv = document.getElementById('weather');
const header = document.querySelector('header');
const slingshotIcon = document.getElementById('slingshot');

// USER OBJECT ======================================================= //

const user = {
    coords: null,
    weather: {
        main: null,
        tempF: null,
        tempC: null,
        imgURL: null
    },
    dateTime: {
        _hour: null,
        _timeString: null,
        amPM: null,
        date: null,
        weekday: null,
        iso: null,

        get hour() {
            return this._hour
        },

        // Hours are base-24:
        set hour(value) {
            if (value === 24) {
                this._hour = 0;
            } else {
                this._hour = value;
            }
        },

        get timeString() {
            return this._timeString;
        },

        // If time is formatted with am/pm, this separates time
        // and am/pm into different variables for styling purposes:
        set timeString(value) {
            const valueArr = value.split(" ");
            if (valueArr.length === 2) {
                this._timeString = valueArr[0];
                this.amPM = valueArr[1];
            } else {
                this._timeString = value;
            }
        }
    }
}

// GLOBAL VARIABLES ================================================= //

let music = new Audio();
music.loop = true;
let seconds = 0;
let trackingTimeAndWeather;
let trackingHourlyMusic;
let updateHourlyMusic = false;

// FUNCTIONS ======================================================= //

// Handles all JSON ajax requests:
async function getJSON(url) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      throw error;
    }
}

// Detects location using browser's native geolocation API:
async function detectLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async position => {
            user.coords = [position.coords.latitude, position.coords.longitude];
            await populateInput();
        }, () => {
            console.log('Unable to retrive location.');
        });
    } else {
        console.log('Geolocation is not supported by this browser.');
    }
}

// Makes call to backend to geocode user-provided address:
async function enterLocation() {
    const address = locationInput.value;
    const locationJSON = await getJSON(`geocode/${address}`);
    user.coords = [locationJSON.results[0].geometry.location.lat, locationJSON.results[0].geometry.location.lng];
}

// Makes call to backend to reverse geocode user coordinates and populate input field:
async function populateInput() {
    const locationJSON = await getJSON(`reverse-geocode/${user.coords[0]},${user.coords[1]}`);
    locationInput.value = locationJSON.results[0].formatted_address;
}

// Makes call to backend to get local time and formats using local conventions:
async function getTimeAtCoords() {
    const currentDate = new Date();
    const timestamp = Math.round(currentDate.getTime() / 1000);
    const timeZoneJSON = await getJSON(`timezone/${user.coords[0]},${user.coords[1]}/${timestamp}`);
    if (timeZoneJSON.status === "OK") {
        const timeOptions = {hour: 'numeric', minute: 'numeric', timeZone: timeZoneJSON.timeZoneId};

        user.dateTime.timeString = Intl.DateTimeFormat(navigator.language, timeOptions).format(currentDate);
        user.dateTime.date = Intl.DateTimeFormat(navigator.language, {month: 'long', day: 'numeric', timeZone: timeZoneJSON.timeZoneId}).format(currentDate);
        user.dateTime.weekday = Intl.DateTimeFormat(navigator.language, {weekday: 'short', timeZone: timeZoneJSON.timeZoneId}).format(currentDate);
        user.dateTime.hour = parseInt(Intl.DateTimeFormat('en-US', {hour: 'numeric', hour12: false, timeZone: timeZoneJSON.timeZoneId}).format(currentDate));
        // iso is used for datetime html attribute:
        user.dateTime.iso = currentDate.toLocaleString(navigator.language, {timeZone: timeZoneJSON.timeZoneId, timeZoneName: "short"});
    } else {
        alert("Timezone API request failed due to: " + timeZoneJSON.status);
    }
}

// Makes call to backend to get weather data:
async function getWeather() {
    const weatherJSON = await getJSON(`weather/${user.coords[0]},${user.coords[1]}`);
    user.weather.main = weatherJSON.weather[0].main;
    // Temperature is returned in Kelvin, so must be converted to C and F:
    user.weather.tempC = parseInt(weatherJSON.main.temp) - 273.15;
    user.weather.tempF = (user.weather.tempC * 9/5) + 32;
    user.weather.imgURL = `https://openweathermap.org/img/w/${weatherJSON.weather[0].icon}.png`;
}

// Calculates ACNH API hourly music id using time and weather:
function calcHourlyMusicId() {
    let id = (user.dateTime.hour * 3) + 1;
    if (['Thunderstorm', 'Drizzle', 'Rain'].includes(user.weather.main)) {
        return id;
    } else if (user.weather.main === 'Snow') {
        return id + 1;
    } else {
        return id + 2;
    }
}

// Gets all K.K. Slider songs and sets up autocomplete (see autocomplete.js):
async function getAllKKSongNames() {
    const songNames = Object.values(await getJSON('https://acnhapi.com/v1/songs')).map(s => s.name['name-USen']);
    autocomplete(document.getElementById('kk-input'), songNames);
}

async function getMusic(type, id) {
    music.pause();
    music.src = `https://acnhapi.com/v1/${type}/${id}`;
    await music.play(); // Audio.play method is asynchronous
}

function fadeInMusic() {
    music.volume = 0;
    const fadeIn = setInterval(() => {
        let volumeRounded = Math.round(music.volume * 100) / 100;
        // Fade in until default volume is reached:
        volumeRounded += 0.05;
        // When default volume is reached, stop:
        if (volumeRounded >= 1) {
            volumeRounded = 1;
            clearInterval(fadeIn);
        }
        music.volume = volumeRounded;
    }, 200);
}

function fadeOutMusic() {
    const fadeOut = setInterval(() => {
        let volumeRounded = Math.round(music.volume * 100) / 100;
        volumeRounded -= 0.05;
        if (volumeRounded <= 0) {
            volumeRounded = 0;
            // Dispatches custom event when music is faded out:
            document.dispatchEvent(new CustomEvent('fadedout'));
            clearInterval(fadeOut);
        }
        music.volume = volumeRounded;
    }, 200);
}

async function transitionMusic(getNewMusic) {
    if (!music.paused) {
        // Creates a one-time event listener that fires when music is faded out:
        const transitionHandler = async () => {
            await getNewMusic();
            fadeInMusic();
            document.removeEventListener('fadedout', transitionHandler);
        };
        document.addEventListener('fadedout', transitionHandler);
        fadeOutMusic();
    } else {
        await getNewMusic();
        fadeInMusic();
    }
}

function printTime() {
    dateTimeDiv.innerHTML =
    `
        <time datetime="${user.dateTime.iso}">${user.dateTime.timeString}</time>
        <span id="am-pm">${user.dateTime.amPM}</span>
        <div id="date-wrapper">
            <span id="date">${user.dateTime.date}</span>
            <span id="weekday">${user.dateTime.weekday}.</span>
        </div>
    `;
}

function printWeather() {
    weatherDiv.innerHTML =
    `
        <div class="temp">${Math.round(user.weather.tempC)}<span>&deg;</span><span>C</span></div>
        <div class="temp">/</div>
        <div class="temp">${Math.round(user.weather.tempF)}<span>&deg;</span><span>F</span></div>
        <img src="${user.weather.imgURL}" alt="${user.weather.main}">
        <div id="weather-desc">${user.weather.main}</div>
    `;
}

// Time and weather are tracked to update display and change hourly music:
async function trackTimeAndWeather() {
    trackingTimeAndWeather = setInterval(async () => {
        let prevHour = user.dateTime.hour;
        let prevWeather = user.weather.main;
        // Update time every minute:
        if (seconds % 60 === 0) {
            await getTimeAtCoords();
            printTime();
        }
        // Check weather every 10 minutes (Open Weather API is updated every 10 minutes):
        if (seconds % 600 === 0) {
            await getWeather();
            printWeather();
        }
        // Update hourly music if time or weather have changed:
        if (prevHour !== user.dateTime.hour || prevWeather !== user.weather.main) {
            updateHourlyMusic = true;
        }
        seconds++;
    }, 1000);
}

// Check every second if hourly music needs to be updated: 
function trackHourlyMusic() {
    trackingHourlyMusic = setInterval(async () => {
        if (updateHourlyMusic) {
            const id = calcHourlyMusicId();
            transitionMusic(() => {getMusic('hourly', id)});
            updateHourlyMusic = false;
        }
    }, 1000);
}

// EVENT LISTENERS =================================================== //

detectBtn.addEventListener('click', detectLocation);
locationInput.addEventListener('change', enterLocation);

// This initilizes most of the app:
mainMenu.addEventListener('submit', async event => {
    event.preventDefault();
    if (user.coords) {
        await getTimeAtCoords();
        await getWeather();
        printTime();
        printWeather();
        const id = calcHourlyMusicId();
        transitionMusic(() => {getMusic('hourly', id)});

        if (!trackingTimeAndWeather) trackTimeAndWeather();
        if (!trackingHourlyMusic) trackHourlyMusic();
        musicControls.classList.remove("collapsed");
        toggleMusicBtn.classList.add("playing");
    } else {
        alert('Location not found!');
    }
});

// Plays K.K. Slider tunes:
kkMenu.addEventListener('submit', async event => {
    event.preventDefault();
    const song = Object.values(await getJSON('https://acnhapi.com/v1/songs'))
        .find(s => s.name['name-USen'] == kkInput.value);
    transitionMusic(() => {getMusic('music', song.id)});
    toggleMusicBtn.classList.add("playing");
});

// Plays/pauses music:
toggleMusicBtn.addEventListener('click', () => {
    toggleMusicBtn.classList.toggle("playing");
    if (toggleMusicBtn.classList.contains("playing")) {
        music.play();
        if (!document.body.classList.contains('kk-mode')) trackHourlyMusic();
    } else {
        music.pause();
        clearInterval(trackingHourlyMusic);
    }
});

// Toggles K.K. Slider menu:
toggleKKBtn.addEventListener('click', () => {
    document.body.classList.toggle('kk-mode');
    if (document.body.classList.contains('kk-mode')) {
        clearInterval(trackingHourlyMusic);
        document.body.classList.remove('game-mode');
    }
});

// Toggles volume slider when button is clicked:
volumeBtn.addEventListener('click', () => {
    volumeSlider.classList.toggle('collapsed');
});

// Hides volume slider if user clicks away:
document.addEventListener('click', event => {
    if (event.target != volumeSlider && event.target != volumeBtn) {
        volumeSlider.classList.add('collapsed');
    }
});

// Changes audio volume and updates button icon when slider is moved:
volumeSlider.addEventListener('input', () => {
    music.volume = volumeSlider.value;
    if (music.volume === 0) volumeBtn.className = 'fas fa-volume-off';
    else if (music.volume < 0.5) volumeBtn.className = 'fas fa-volume-down';
    else volumeBtn.className = 'fas fa-volume-up';
});

// Toggles mini-game and shows 'equipped' icon when icon is clicked:
slingshotIcon.addEventListener('click', () => {
    gameWrapper.innerHTML = '';
    document.body.classList.toggle('game-mode');
    if (document.body.classList.contains('game-mode')) {
        document.body.classList.remove('kk-mode');
        Game.slingshot();
    }
});

// Sets up autocomplete on page load:
document.addEventListener('DOMContentLoaded', getAllKKSongNames);