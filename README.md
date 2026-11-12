# Calorie Tracker

A simple calorie tracker that runs in your phone's browser. No account, no server, no database.

## Features

- Log foods with their calories and see what's left for the day
- Set a daily calorie goal (tap the goal number)
- Quick-add buttons for foods you've logged before
- Look back at previous days
- Undo after deleting an entry
- Export and import a backup file
- Works offline and can be added to your home screen like an app

## Where your data lives

Everything is saved in your own browser's storage on your device. Nothing is sent anywhere.
Each person who opens the app has their own separate log.

Clearing your browser's site data will erase the log, so use **Export backup** now and then.
On iPhone, add the app to your home screen. Safari can clear data for sites you haven't opened in a while, and home screen apps are protected from that.

## Add to your home screen

- **iPhone:** open the link in Safari, tap **Share**, then **Add to Home Screen**.
- **Android:** open the link in Chrome, tap **⋮**, then **Add to Home screen** or **Install app**.

## Hosting

The app is plain HTML, CSS and JavaScript, hosted free with GitHub Pages.
In the repo, go to **Settings → Pages**, set the source to **Deploy from a branch**, pick **main** and **/ (root)**, then save.

## Files

- `index.html` – the page
- `styles.css` – the look (light and dark mode)
- `app.js` – the app logic and saving
- `sw.js` – offline support
- `manifest.json` and `icons/` – the home screen name and icon
