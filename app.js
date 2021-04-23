require('dotenv').config();
const express = require('express');
const unirest = require('unirest');
const fetch = require('node-fetch');
const mongoose = require('mongoose');
const MongoClient = require('mongodb').MongoClient;
const { Context, Scenes, session, Telegraf, Markup } = require('telegraf');
const Word = require('./model/words.model');
const client = new MongoClient(process.env.DB_ATLAS_PATH, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

const PORT = process.env.PORT || 5000;
const { enter, leave } = Scenes.Stage;

const createScene = new Scenes.BaseScene('create');

createScene.enter((ctx, next) => {
  ctx.reply('Введите слово на английском');
  next();
});

let array = null;
let length = 0;
let name = null;
let url = null;
createScene.hears('Да', async (ctx) => {
  length += 1;
  const stringFromUD = Object.values(array[length]);
  const str = stringFromUD.join('.Example: ');

  try {
    const responseFromMM = await fetch(
      `https://translated-mymemory---translation-memory.p.rapidapi.com/api/get?q=${str}&langpair=en|ru&de=a@b.c&onlyprivate=0&mt=1`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          'x-rapidapi-key': process.env.RAPID_API_KEY,
          'x-rapidapi-host': process.env.MY_MEMORY_HOST,
          useQueryString: true,
        },
      }
    );
    const resFromAPIMM = await responseFromMM.json();
    const finalText = resFromAPIMM.responseData.translatedText.split('Пример:');
    let interpretation = finalText[0]
      .replaceAll('&#10', '')
      .replaceAll('&quot', '')
      .replaceAll(';', '');
    let exampleOfword = finalText[1]
      .replaceAll('&#10', '')
      .replaceAll('&quot', '')
      .replaceAll(';', '');
    await ctx.replyWithMarkdown(
      `*Толкование:* ${interpretation}
*Пример:* ${exampleOfword}`
    );

    const requstsFromDB = await Word.findOne({ name, number: length });
    if (requstsFromDB === null) {
      await Word.create({
        name,
        about: interpretation,
        example: exampleOfword,
        url,
        requests: 1,
        number: length,
        users: [ctx.update.message.from.username],
      });
    } else {
      requstsFromDB.requests += 1;
      if (
        requstsFromDB.users.some(
          (el) => el === ctx.update.message.from.username
        )
      ) {
        await requstsFromDB.save();
      } else {
        requstsFromDB.users.push(ctx.update.message.from.username);
        await requstsFromDB.save();
      }
    }

    if (length < array.length - 1) {
      return await ctx.reply(
        'Есть еще варианты значения этого слова. Показать?',
        Markup.keyboard([['Да', 'Нет'], ['🏘 На главную']])
          .oneTime()
          .resize()
      );
    } else {
      await ctx.reply(
        'На этом все. Хочешь посмотреть другие варианты - переходи в меню.',
        Markup.keyboard([
          ['😇 Перейти к просвещению'],
          ['🏘 На главную', '📞 Помощь'],
        ])
          .oneTime()
          .resize()
      );
      return ctx.scene.leave();
    }
  } catch (e) {
    await ctx.reply(
      'К сожалению, не удалось перевести. Попробуй отправить другой запрос',
      Markup.keyboard([
        ['😇 Перейти к просвещению'],
        ['🏘 На главную', '📞 Помощь'],
      ])
        .oneTime()
        .resize()
    );
    return ctx.scene.leave();
  }
});

createScene.hears('Нет', async (ctx) => {
  await ctx.reply(
    'Хочешь посмотреть другие варианты - переходи в меню.',
    Markup.keyboard([
      ['😇 Перейти к просвещению'],
      ['🏘 На главную', '📞 Помощь'],
    ])
      .oneTime()
      .resize()
  );
  return ctx.scene.leave();
});

createScene.on('message', async (ctx, next) => {
  name = ctx.update.message.text;
  url =
    'https://www.urbandictionary.com/define.php?term=' +
    name.replaceAll(`'`, '').split(' ').join('%20');

  array = null;
  length = 0;
  try {
    const responseFromUD = await fetch(
      `https://mashape-community-urban-dictionary.p.rapidapi.com/define?term=${ctx.update.message.text}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': process.env.RAPID_API_KEY,
          'x-rapidapi-host': process.env.UD_HOST,
          useQueryString: true,
        },
      }
    );
    const resFromAPIUD = await responseFromUD.json();
    const arrayOfUD = resFromAPIUD.list.map((el) => {
      let { definition, example } = el;
      return (el = { definition, example });
    });
    array = arrayOfUD;
    const stringFromUD = Object.values(arrayOfUD[0]);
    const str = stringFromUD.join('.Example: ');

    const responseFromMM = await fetch(
      `https://translated-mymemory---translation-memory.p.rapidapi.com/api/get?q=${str}&langpair=en|ru&de=a@b.c&onlyprivate=0&mt=1`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          'x-rapidapi-key': process.env.RAPID_API_KEY,
          'x-rapidapi-host': process.env.MY_MEMORY_HOST,
          useQueryString: true,
        },
      }
    );
    const resFromAPIMM = await responseFromMM.json();
    const finalText = resFromAPIMM.responseData.translatedText.split('Пример:');
    let interpretation = finalText[0]
      .replaceAll('&#10', '')
      .replaceAll('&quot', '')
      .replaceAll(';', '');
    let exampleOfword = finalText[1]
      .replaceAll('&#10', '')
      .replaceAll('&quot', '')
      .replaceAll(';', '');
    await ctx.replyWithMarkdown(
      `*Толкование:* ${interpretation}
*Пример:* ${exampleOfword}`
    );
    const requstsFromDB = await Word.findOne({ name, number: 0 });
    if (requstsFromDB === null) {
      await Word.create({
        name,
        about: interpretation,
        example: exampleOfword,
        url,
        requests: 1,
        number: 0,
        users: [ctx.update.message.from.username],
      });
    } else {
      requstsFromDB.requests += 1;
      if (
        requstsFromDB.users.some(
          (el) => el === ctx.update.message.from.username
        )
      ) {
        await requstsFromDB.save();
      } else {
        requstsFromDB.users.push(ctx.update.message.from.username);
        await requstsFromDB.save();
      }
    }

    if (arrayOfUD.length === 1) {
      ctx.reply('Если хочешь посмотреть другие слова - открывай скорей меню');
      ctx.scene.leave();
    }
    await ctx.reply(
      'Есть еще варианты значения этого слова. Показать?',
      Markup.keyboard([['Да', 'Нет'], ['🏘 На главную']])
        .oneTime()
        .resize()
    );
    return await next();
  } catch (e) {
    ctx.reply(
      'К сожалению, нет такого слова в Urban Dictionary или не удается полностью перевести толкование'
    );
  }
});

const stage = new Scenes.Stage();
stage.register(createScene);

bot.use(session());
bot.use(stage.middleware());

bot.start(async (ctx) => {
  ctx.replyWithMarkdown(
    `Привет, ${ctx.update.message.from.first_name}.
Я рад, что ты хочешь узнать больше о сленге на английском языке.

Не забудь поделиться мною с другом - [@UDicBot](t.me/UdicBot).
Ну, что ж, выбирай нужный раздел в меню и погнали!
`
  );
  return await ctx.reply(
    'Меню',
    Markup.keyboard([
      ['😇 Перейти к просвещению'],
      ['🏘 На главную', '📞 Помощь'],
    ])
      .oneTime()
      .resize()
  );
});

bot.hears('🏘 На главную', async (ctx) => {
  return await ctx.reply(
    'Меню',
    Markup.keyboard([
      ['😇 Перейти к просвещению'],
      ['🏘 На главную', '📞 Помощь'],
    ])
      .oneTime()
      .resize()
  );
});

bot.hears('📞 Помощь', (ctx) => {
  return ctx.replyWithMarkdown(
    `Этот бот создан для изучения сленга с помощью сайта Urban Dictionary (далее UD)
К сожалению, у UD нет версии на русском языке.
Поэтому вы можете сразу искать интересующие вас слова здесь, вместо того, чтобы сначала искать определение на UD, а потом вбивать его в переводчик.
За перевод отвечает MyMemory API.

Выбирайте в меню раздел "😇 Перейти к просвещению" и отправляйте слова на английском.
В ответ вы получите определение слова на русском и кучу позитивных эмоций`
  );
});

bot.hears('😇 Перейти к просвещению', (ctx) => {
  ctx.scene.enter('create');
});

bot.on('inline_query', async (ctx) => {
  const allWords = await Word.find();
  const check = allWords.some((word) => {
    return word.users.includes(ctx.update.inline_query.from.username);
  });
  let data = null;
  if (check) {
    const usersAllWords = allWords
      .filter((word) => {
        return word.users.includes(ctx.update.inline_query.from.username);
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 6);
    console.log;
    data = usersAllWords.map((el) => {
      return {
        type: 'article',
        id: el._id,
        title: el.name,
        url: el.url,
        hide_url: true,
        description: el.about,
        input_message_content: {
          message_text: `Толкование: ${el.about}\nПример: ${el.example}`,
        },
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: `${el.requests} ❤️`,
                url: el.url,
              },
            ],
            [
              {
                text: 'Share bot with friends',
                switch_inline_query: 'Зацени, какого бота сделал @andrkrol',
              },
            ],
          ],
        },
      };
    });
  } else {
    const allWordsFormDB = await Word.find().sort({ requests: -1 }).limit(5);
    data = allWordsFormDB.map((el) => {
      return {
        type: 'article',
        id: el._id,
        title: el.name,
        url: el.url,
        hide_url: true,
        description: el.about,
        input_message_content: {
          message_text: `Толкование: ${el.about}\nПример: ${el.example}`,
        },
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: `${el.requests} ❤️`,
                url: el.url,
              },
            ],
            [
              {
                text: 'Share bot with friends',
                switch_inline_query:
                  'Зацени, какого бота сделал [@andrkrol](t.me/andrkrol)',
              },
            ],
          ],
        },
      };
    });
  }
  try {
    ctx.answerInlineQuery(data);
  } catch (e) {
    return;
  }
});

// bot.telegram.setWebhook(`${process.env.URL}/bot${process.env.BOT_TOKEN}`)
// bot.startWebhook(`/bot${process.env.BOT_TOKEN}`, null, PORT)
// console.log('Started with webhook')

app.listen(PORT, () => {
  console.log('server is ready'),
    mongoose.connect(
      process.env.DB_ATLAS_PATH,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,
      },
      () => {
        console.log('DB is ready');
      }
    );
  bot.launch().then(() => {
    console.log('bot is ready');
  });
});
// bot.launch().then(() => {
//   console.log('bot is ready');
// });
// // bot.startPolling();
// process.once('SIGINT', () => bot.stop('SIGINT'));
// process.once('SIGTERM', () => bot.stop('SIGTERM'));
