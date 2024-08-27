const puppeteer = require('puppeteer');

async function performGoogleSearch(query) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // Go to Google and wait until the page is fully loaded
        await page.goto('https://www.google.be', { waitUntil: 'networkidle2' });

        // Handle the cookies consent modal
        try {
            await page.evaluate(() => {
                const consentButton = document.evaluate(
                    "//button[@id='L2AGLb' and contains(@class, 'tHlp8d')]//div[contains(text(), 'Accept all')]",
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                ).singleNodeValue;

                if (consentButton) {
                    consentButton.click();
                    console.log("Accepted cookies consent");
                } else {
                    console.log("Consent button not found");
                }
            });

        } catch (error) {
            console.log("Cookies consent modal did not appear or could not be clicked", error);
            await page.screenshot({ path: 'modal_issue.png' });  // Take a screenshot for debugging
        }

        // Add a screenshot before searching to debug the issue
        await page.screenshot({ path: 'before_search.png' });

     // Wait for the search input field using its ID
     await page.waitForSelector('#APjFqb', { visible: true, timeout: 30000 });

     // Proceed with the search
     await page.type('#APjFqb', query);
     await page.keyboard.press('Enter');

        // Wait for the results to load and get the first result
        await page.waitForSelector('h3');
        const firstResult = await page.$('h3');

        if (firstResult) {
            const resultTitle = await page.evaluate(el => el.textContent, firstResult);
            await firstResult.click();
            await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

            const pageUrl = page.url();
            console.log('Clicked URL:', pageUrl);
            console.log('First result title:', resultTitle);
        } else {
            console.log("No results found");
        }

    } catch (error) {
        console.error("An error occurred:", error);
    } finally {
        await browser.close();
    }
}

(async () => {
    const searchQuery = 'vide maison';
    await performGoogleSearch(searchQuery);
})();
