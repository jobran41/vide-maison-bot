const puppeteer = require('puppeteer');
const cron = require('node-cron');
const fs = require('fs');

// Function to get the current timestamp
function getCurrentTimestamp() {
    const now = new Date();
    return `${now.toISOString()} -`;
}

// Function to perform Google search and handle links for a single query
async function performGoogleSearch(query) {
    const browser = await puppeteer.launch({ headless: true });
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

        // Wait for the results to load
        await page.waitForSelector('h3 a');

        // Get all links on the first page, excluding those containing "sca_esv" or "ved" in the URL
        const links = await page.evaluate(() => {
            const anchorTags = Array.from(document.querySelectorAll('a'));
            return anchorTags
                .map(a => a.href)
                .filter(href => href && !href.includes('sca_esv') && !href.includes('ved') && !href.includes('videmaisonsbruxelles'));
        });

        // Log filtered links with timestamp
        const timestamp = getCurrentTimestamp();
        console.log(`${timestamp} Filtered links for query "${query}":`, links);
        fs.appendFileSync('logfile.log', `${timestamp} Filtered links for query "${query}": ${links.join(', ')}\n`);

        // Open each filtered link in a new tab
        for (const link of links) {
            const newPage = await browser.newPage();
            await newPage.goto(link, { waitUntil: 'domcontentloaded' });
            console.log(`${timestamp} Opened: ${link}`);

            // Pause for 2 seconds to simulate some interaction or waiting time
            await new Promise(resolve => setTimeout(resolve, 2000));

            await newPage.close();
        }

    } catch (error) {
        const timestamp = getCurrentTimestamp();
        console.error(`${timestamp} An error occurred for query "${query}":`, error);
        fs.appendFileSync('logfile.log', `${timestamp} Error for query "${query}": ${error.message}\n`);
    } finally {
        await browser.close();
    }
}

// Function to handle multiple queries
async function performMultipleSearches(queries) {
    for (const query of queries) {
        await performGoogleSearch(query);
    }
}

// Schedule the task to run every 5 minutes
cron.schedule('*/5 * * * *', () => {
    const searchQueries = [
        'vide maison',
        'vide grenier',
        'vide maisons bruxelles',
        'vide grenier bruxelles',
        'vide Maison Bruxelles Vide Grenier',
        'vide appartement',
        'vide appartement bruxelles',
        'vide tout bruxelles',

    ];
    performMultipleSearches(searchQueries).catch(err => {
        const timestamp = getCurrentTimestamp();
        fs.appendFileSync('logfile.log', `${timestamp} Error during scheduled task: ${err.message}\n`);
    });
});
