// const puppeteer = require('puppeteer');
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha')
puppeteer.use(StealthPlugin())
puppeteer.use(RecaptchaPlugin())

const {executablePath} = require('puppeteer')


const cheerio = require('cheerio');

// Discord credentials
const email = 'zsadouski@gmail.com';
const password = 'Kastus!863';

async function loginToDiscord(page) {
  // Navigate to Discord login page
  await page.goto('https://discord.com/login');

  // Log in to Discord
  await page.solveRecaptchas();
  await page.type('input[name="email"]', email);
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for login to complete
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
}

async function navigateToChannel(channelUrl, page) {
  // Navigate to the specified channel
  await page.goto(channelUrl);
}

async function wait(timeMs) {
  await new Promise(resolve => setTimeout(resolve, timeMs));
}

async function scrapeChatMessages(page) {
  // Log entire page content to console
  const pageContent = await page.content();

  // load HTML code into Cheerio
  const $ = cheerio.load(pageContent);

  // find all DOM elements with specified class name
  const elements = $('[id^="chat-messages"]');

  // print the text content of each element

  const postObjects = [];

  elements.each((index, element) => {
    const domElement = $(element);
    const author = domElement.find('[class^="username"]').text();
    const createdTime = domElement.find('time').attr('datetime');
    const content = domElement.find('[id^="message-content"]').text();

    let title = '';
    let selftext = '';

    if (content) {
      const postLines = content.split('\n\n');
      title = postLines.shift();
      selftext = postLines.join('\n\n')
    }

    postObjects.push({author, createdTime, title, selftext})
  });

  return postObjects;
}

function filterPosts(posts) {
  let currentDate = new Date();
  let oneHourAgo = new Date(currentDate.getTime() - 3600000); // subtract 1 hour in milliseconds
  let unixTimestamp = Math.floor(oneHourAgo.getTime() / 1000).toString();

  return posts.filter(post => {
    const createdTimestamp = Math.floor(new Date(post.createdTime).getTime() / 1000);

    // if (createdTimestamp < unixTimestamp) {
    //   return false;
    // }

    if (/hiring/i.test(post.title)) {
      if (/\b(javascript|typescript|js|ts|web|front|react|vue|angular|node)\b/i.test(post.title.toLowerCase())
        || /\b(javascript|typescript|js|ts|web|front|react|vue|angular|node)\b/i.test(post.selftext.toLowerCase())) {
        return true;
      }
    }

    return false;

  })
}

const run = async () => {
  // Launch a headless browser
  const browser = await puppeteer.launch({ executablePath: executablePath() });
  const page = await browser.newPage();

  await loginToDiscord(page);

  let posts = [];

  const channelUrl = 'https://discord.com/channels/102860784329052160/103882387330457600';
  await navigateToChannel(channelUrl, page);
  await wait(3000);
  posts.push(... await scrapeChatMessages(page))

  await navigateToChannel('https://discord.com/channels/880546729349488741/927703276487606302', page);
  await wait(3000);
  posts.push(... await scrapeChatMessages(page))

  const filteredPosts = filterPosts(posts);

  // Close the browser
  await browser.close();

  return filteredPosts;
}

setInterval(async () => {
  try {
    const posts = await run();
    if (posts.length > 0) {
      console.log("parsed")
      // console.log(posts)
    }
  } catch (err) {
    console.log("error")
  }

}, 60000)

