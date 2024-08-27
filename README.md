# vide-maison-bot

. Using System Cron for Testing
If you prefer using your system's cron job to test running your script every 5 minutes:

Open the cron tab:

bash
Copy code
crontab -e
Add a new cron job entry to execute your script every 5 minutes:

bash
Copy code
*/5 * * * * /usr/bin/node /path/to/your/script/google_search.js
Make sure to replace /usr/bin/node with the path to your Node.js executable and /path/to/your/script/google_search.js with the path to your script.