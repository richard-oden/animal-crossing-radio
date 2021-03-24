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
const dateTimeDiv = document.getElementById('date-time');
const weatherDiv = document.getElementById('weather');
const header = document.querySelector('header');
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
let seconds = 0;
let trackingTimeAndWeather;
let trackingHourlyMusic;
let updateHourlyMusic = false;

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
        user.dateTime.iso = currentDate.toLocaleString(navigator.language, {timeZone: timeZoneJSON.timeZoneId, timeZoneName: "short"});
    } else {
        alert("Timezone API request failed due to: " + timeZoneJSON.status);
    }
}

async function getWeather() {
    const weatherJSON = await getJSON(`weather/${user.coords[0]},${user.coords[1]}`);
    user.weather.main = weatherJSON.weather[0].main;
    user.weather.tempC = parseInt(weatherJSON.main.temp) - 273.15;
    user.weather.tempF = (user.weather.tempC * 9/5) + 32;
    user.weather.imgURL = `http://openweathermap.org/img/w/${weatherJSON.weather[0].icon}.png`;
}

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

async function getAllKKSongNames() {
    const songNames = Object.values(await getJSON('http://acnhapi.com/v1/songs')).map(s => s.name['name-USen']);
    autocomplete(document.getElementById('kk-input'), songNames);
}

async function getMusic(type, id) {
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
            const id = calcHourlyMusicId();
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

async function trackTimeAndWeather() {
    trackingTimeAndWeather = setInterval(async () => {
        let prevHour = user.dateTime.hour;
        let prevWeather = user.weather.main;
        if (seconds % 60 === 0) {
            await getTimeAtCoords();
            printTime();
        }
        if (seconds % 600 === 0) {
            await getWeather();
            printWeather();
        }
        if (prevHour !== user.dateTime.hour || prevWeather !== user.weather.main) {
            updateHourlyMusic = true;
        }
        seconds++;
    }, 1000);
}

function trackHourlyMusic() {
    trackingHourlyMusic = setInterval(async () => {
        if (updateHourlyMusic) {
            transitionMusic();
            updateHourlyMusic = false;
        }
    }, 1000);
}

detectBtn.addEventListener('click', detectLocation);
locationInput.addEventListener('change', enterLocation);

mainMenu.addEventListener('submit', async event => {
    event.preventDefault();
    if (user.coords) {
        await getTimeAtCoords();
        await getWeather();
        printTime();
        printWeather();
        const id = calcHourlyMusicId();
        getMusic('hourly', id);

        if (!trackingTimeAndWeather) trackTimeAndWeather();
        if (!trackingHourlyMusic) trackHourlyMusic();
        musicControls.classList.remove("collapsed");
        toggleMusicBtn.classList.add("playing");
    } else {
        alert('Location not found!');
    }
});

kkMenu.addEventListener('submit', async event => {
    event.preventDefault();
    const song = Object.values(await getJSON('http://acnhapi.com/v1/songs'))
        .find(s => s.name['name-USen'] == kkInput.value);
    getMusic('music', song.id);
});

toggleMusicBtn.addEventListener('click', () => {
    toggleMusicBtn.classList.toggle("playing");
    if (toggleMusicBtn.classList.contains("playing")) {
        music.play();
        trackHourlyMusic();
    } else {
        music.pause();
        clearInterval(trackingHourlyMusic);
    }
});

toggleKKBtn.addEventListener('click', () => {
    document.body.classList.toggle('kk-mode');
    if (document.body.classList.contains('kk-mode')) {
        document.body.classList.remove('game-mode');
    }
});

slingshotIcon.addEventListener('click', () => {
    gameWrapper.innerHTML = '';
    document.body.classList.toggle('game-mode');
    if (document.body.classList.contains('game-mode')) {
        document.body.classList.remove('kk-mode');
        Game.slingshot();
    }
});

getAllKKSongNames();