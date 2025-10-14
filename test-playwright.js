const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: false }); // Mở trình duyệt có giao diện
  const page = await browser.newPage();
  await page.goto("https://bot.sannysoft.com/");
  console.log("Opened bot.sannysoft.com with Chromium!");
  // Để trình duyệt mở trong vài giây để bạn xem
  // Đợi 5 giây
})();
