const telegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const http = require('http');
const yandex_speech = require('yandex-speech');

const token = '5848419781:AAG7YwDyCVRFok7reVZQmjfYiOnEOIxw4VU';
const WeatherAPI_KEY = "d57e3f563d93dcdfb97d030bc387e7e9";
const bot = new telegramBot(token, {polling: true});

const yandexID_KEY = "ajemh5ler7bgpe4g6bge";
const yandexAPI_KEY = "AQVN1olq7Z1wy4kDLg4OKe0N0hiSSOKdr3GUJpLE";

const infoMessage = "Я сообщу вам о погоде в том месте, которое сообщите мне.\n" +
"Я могу ответить на:\n" +
"- Текстовое сообщение с названием населенного пункта.\n" +
"- Голосовое сообщение с названием населенного пункта.\n" +
"- Сообщение с точкой на карте.";

console.log('Starting telegram bot');

function WriteWeatherInfo(data, msg) {
	return GetWeatherInfo(
		data.current_condition[0].lang_ru[0].value,
		data.weather[0].avgtempC,
		data.current_condition[0].FeelsLikeC,
		data.current_condition[0].pressure / 1000 * 750.062,
		data.current_condition[0].humidity,
		data.current_condition[0].visibility,
		data.current_condition[0].windspeedKmph * 1000 / 3600,
		data.current_condition[0].observation_time,
		data.current_condition[0].winddir16Point,
		msg)
}
function GetWeatherInfo (desc, temp, tempfeels, pressure, humidity, visibility, windspeed, observation_time, winddir16Point, msg) {
	return `${desc} - ${msg}.
	🌡 Температура ${temp} ℃, ощущается как ${tempfeels} ℃.
	🎈 Атмосферное давление ${pressure} мм рт. ст.
	💧 Влажность ${humidity} %.
	🌫 Видимость ${visibility} метров.
	💨 Ветер ${windspeed} м/с ${winddir16Point}.
	☀️ Восход солнца ${observation_time} МСК. Закат ${observation_time} МСК.`
}
function RequestWeather(chatId, msg) {
	if (msg[0] == "/") {
		return;
	}
	try {
		axios.get(encodeURI(`https://wttr.in/${msg}?format=j1&lang=ru`), {
			headers: {
				'Content-Type': 'application/json',
			},
		})
		.then(response => {
			if (msg.trim().length == 0) {
				bot.sendMessage(chatId, `Я не нашел населенный пункт ${msg}`);
			} else {
				bot.sendMessage(chatId, WriteWeatherInfo(response.data, msg));
			}
		})
		.catch(function (error) {
			var coords = msg.split(' ').map(v => v = v.replace('.', ',').trim()).reduce((a, b) => `${a},${b}`)
			axios.get(encodeURI(`https://wttr.in/${coords}?format=j1&lang=ru`), {
				headers: {
					'Content-Type': 'application/json',
				},
			})
			.then(response => {
				bot.sendMessage(chatId, WriteWeatherInfo(response.data, msg));
			})
			.catch(function (error) {
				bot.sendMessage(chatId, `Я не нашел населенный пункт ${msg}`);
			});
		});
	} catch(e) {
		bot.sendMessage(chatId, `Я не нашел населенный пункт ${msg}`);
	}
}

var command = (msg, args) => {
	bot.sendMessage(msg.chat.id, infoMessage);
}
bot.onText(/\/start/, command);
bot.onText(/\/help/, command);

bot.on('voice', (msg) => {
	const chatId = msg.chat.id;
	var stream = bot.getFileStream(msg.voice.file_id);
	let chunks = [];

	stream.on('data', chunk => chunks.push(chunk));
	stream.on('end', _ => {
		var options = {
			method: 'POST',
			headers: {
				Authorization: `Api-Key ${yandexAPI_KEY}`
			},
			data: Buffer.concat(chunks)
		};
		axios.get('https://stt.api.cloud.yandex.net/speech/v1/stt:recognize', options)
		.then(response => {
			const chatId = msg.chat.id;
			RequestWeather(chatId, response.data.result);
		});
	});
});

bot.on('text', (msg) => {
	const chatId = msg.chat.id;
	RequestWeather(chatId, msg.text);
});