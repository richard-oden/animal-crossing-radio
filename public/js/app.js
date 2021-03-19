const locationForm = document.querySelector('.menu');
const detectBtn = document.getElementById('detect-btn');
const locationInput = document.getElementById('manual-input');
const launchBtn = document.getElementById('launch-btn');
const musicControls = document.querySelector('.music-controls');
const toggleMusicBtn = document.getElementById('toggle-music-btn');
const dateTimeDiv = document.getElementById('date-time');
const weatherDiv = document.getElementById('weather');
const header = document.querySelector('header');
const menu = document.querySelector('form');
const slingshotIcon = document.getElementById('slingshot');

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
let music = new Audio();
music.loop = true;
let appRunning;

async function getJSON(url) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      throw error;
    }
}

async function detectLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            user.coords = [position.coords.latitude, position.coords.longitude];
            populateInput();
        }, () => {
            console.log('Unable to retrive location.');
        });
    } else {
        console.log('Geolocation is not supported by this browser.');
    }
}

async function enterLocation() {
    const address = locationInput.value;
    const locationJSON = await getJSON(`geocode/${address}`);
    user.coords = [locationJSON.results[0].geometry.location.lat, locationJSON.results[0].geometry.location.lng];
}

async function populateInput() {
    const locationJSON = await getJSON(`reverse-geocode/${user.coords[0]},${user.coords[1]}`);
    locationInput.value = locationJSON.results[0].formatted_address;
}

async function getTimeAtCoords()
{
    const currentDate = new Date();
    const timestamp = Math.round(currentDate.getTime() / 1000);
    const timezoneJSON = await getJSON(`timezone/${user.coords[0]},${user.coords[1]}/${timestamp}`);
    if (timezoneJSON.status === "OK") {
        const timeOptions = {hour: 'numeric', minute: 'numeric', timeZone: timezoneJSON.timeZoneId};

        user.dateTime.timeString = Intl.DateTimeFormat(navigator.language, timeOptions).format(currentDate);
        user.dateTime.date = Intl.DateTimeFormat(navigator.language, {month: 'long', day: 'numeric', timeZone: timezoneJSON.timeZoneId}).format(currentDate);
        user.dateTime.weekday = Intl.DateTimeFormat(navigator.language, {weekday: 'short', timeZone: timezoneJSON.timeZoneId}).format(currentDate);
        user.dateTime.hour = parseInt(Intl.DateTimeFormat('en-US', {hour: 'numeric', hour12: false, timeZone: timezoneJSON.timeZoneId}).format(currentDate));
        user.dateTime.iso = currentDate.toLocaleString(navigator.language, {timeZone: timezoneJSON.timeZoneId, timeZoneName: "short"});
    } else {
        alert("Timezone API request failed due to: " + timezoneJSON.status);
    }
}

async function getWeather() {
    const weatherJSON = await getJSON(`weather/${user.coords[0]},${user.coords[1]}`);
    user.weather.main = weatherJSON.weather[0].main;
    user.weather.tempC = parseInt(weatherJSON.main.temp) - 273.15;
    user.weather.tempF = (user.weather.tempC * 9/5) + 32;
    user.weather.imgURL = `http://openweathermap.org/img/w/${weatherJSON.weather[0].icon}.png`;
}

function calcMusicId()
{
    let id = (user.dateTime.hour * 3) + 1;
    if (['Thunderstorm', 'Drizzle', 'Rain'].includes(user.weather.main)) {
        return id;
    } else if (user.weather.main === 'Snow') {
        return id + 1;
    } else {
        return id + 2;
    }
}

async function getMusic(type, id)
{
    music.pause();
    music.src = `https://acnhapi.com/v1/${type}/${id}`;
    music.play();
}

function fadeInMusic () {
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

function transitionMusic() {
    const fadeOut = setInterval(() => {
        let volumeRounded = Math.round(music.volume * 100) / 100;
        if (volumeRounded > 0) {
            volumeRounded -= 0.05
            music.volume = volumeRounded;
        } else {
            clearInterval(fadeOut);
            const id = calcMusicId();
            getMusic('hourly', id);
            fadeInMusic();
        }
    }, 200);
}

function printTime() {
    dateTimeDiv.innerHTML =
    `<time datetime="${user.dateTime.iso}">${user.dateTime.timeString}</time>
    <span id="am-pm">${user.dateTime.amPM}</span>
    <div id="date-wrapper">
        <span id="date">${user.dateTime.date}</span>
        <span id="weekday">${user.dateTime.weekday}.</span>
    </div>`;
}

function printWeather() {
    weatherDiv.innerHTML =
    `<div class="temp">${Math.round(user.weather.tempC)}<span>&deg;</span><span>C</span></div>
    <div class="temp">/</div>
    <div class="temp">${Math.round(user.weather.tempF)}<span>&deg;</span><span>F</span></div>
    <img src="${user.weather.imgURL}" alt="${user.weather.main}">
    <div id="weather-desc">${user.weather.main}</div>
    `;
}

async function startApp() {
    let seconds = 0;
    await getTimeAtCoords();
    await getWeather();
    printWeather();
    const id = calcMusicId();
    getMusic('hourly', id);
    appRunning = setInterval(async () => {
        // If hour has changed, update music:
        let prevHour = user.dateTime.hour;
        if (seconds % 60 === 0 ) await getTimeAtCoords();
        if (prevHour !== user.dateTime.hour) transitionMusic();
        // Every ten minutes, if weather has changed, update music;
        if (seconds % 600 === 0) {
            let prevWeather = user.weather.main;
            await getWeather();
            printWeather();
            if (prevWeather !== user.weather.main) transitionMusic();
        }
        printTime();
        seconds++;
    }, 1000);
}

detectBtn.addEventListener('click', detectLocation);
locationInput.addEventListener('change', enterLocation);

locationForm.addEventListener('submit', e => {
    e.preventDefault();
    if (user.coords) {
        if (appRunning) {
            clearInterval(appRunning);
        }
        startApp();
        if (musicControls.classList.contains("collapsed")) {
            musicControls.classList.remove("collapsed");
        }
        if (!toggleMusicBtn.classList.contains("playing")) {
            toggleMusicBtn.classList.add("playing");
        }
    } else {
        alert('Location not found!');
    }
});

toggleMusicBtn.addEventListener('click', () => {
    toggleMusicBtn.classList.toggle("playing");
    if (toggleMusicBtn.classList.contains("playing")) {
        startApp();
    } else {
        music.pause();
        clearInterval(appRunning);
    }
});

slingshotIcon.addEventListener('click', () => {
    gameWrapper.innerHTML = '';
    document.body.classList.toggle('game-mode');
    if (document.body.classList.contains('game-mode')) Game.slingshot();
});