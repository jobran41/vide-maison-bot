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

        // Wait for the search input field using its ID
        await page.waitForSelector('#APjFqb', { visible: true, timeout: 30000 });

        // Proceed with the search
        await page.type('#APjFqb', query);
        await page.keyboard.press('Enter');

        // Wait for the results to load
        await page.waitForSelector('h3 a');

        // Get all links on the first page, excluding those containing "sca_esv" or "ved" in the URL
        const links = await page.evaluate(() => {
            const anchorTags = Array.from(document.querySelectorAll('a'));
            return anchorTags
                .map(a => a.href)
                .filter(href => href && !href.includes('sca_esv') && !href.includes('ved'));
        });

        console.log('Filtered links:', links);

        // Open each filtered link in a new tab
        for (const link of links) {
            const newPage = await browser.newPage();
            await newPage.goto(link, { waitUntil: 'domcontentloaded' });
            console.log(`Opened: ${link}`);

            // Pause for 2 seconds to simulate some interaction or waiting time
            await new Promise(resolve => setTimeout(resolve, 2000));

            await newPage.close();
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
