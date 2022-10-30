const puppeteer = require('puppeteer');

const websites = process.argv.slice(2);

if (websites.length === 0) {
    console.log('No websites provided! (add website as argument to command!)');
    process.exitCode = 1;
} else {
    (async () => {
        const browser = await puppeteer.launch();
        for (const url of websites) {
            const page = await browser.newPage();
            await page.tracing.start({categories: ['devtools.timeline']});
            try { await page.goto(url, { waitUntil: 'networkidle0', timeout: 5000 }); } catch (_) { }
            const requests = JSON.parse(await page.tracing.stop() || '{}')?.traceEvents?.filter(te => te.name === 'ResourceSendRequest');
            await page.close();

            const foundRequests = requests.map(r => ({
                method: r?.args?.data.requestMethod,
                url: r?.args?.data.url,
                font: r?.args?.data.url?.match(/family=([^&]+)/)?.[1].split('|').map(f => f.replace(/@.+$/g, '')).join(', ').replace(/\+/g, ' ').replace(/%20/g, ' '),
            }));

            const googleFontsRequests = foundRequests.filter(r => r.url.match(/^https:\/\/fonts\.googleapis\.com/) || r.url.match(/^https:\/\/fonts\.gstatic\.com/));
            if (googleFontsRequests.length > 0) {
                console.log(`Website ${url} uses Google Fonts!`);
                process.exitCode = 1;
            } else {
                console.log(`Website ${url} uses *NO* Google Fonts!`);
            }
        }
        await browser.close();
    })();
}
