✳ Pulse — RSS Reader

A clean, modern RSS reader that brings your favorite news sources and articles together in one place.

Pulse helps you organize RSS feeds, discover new articles, save interesting stories, and enjoy a focused reading experience.

⸻

✨ Features

* RSS Feed Management — Add and remove RSS or Atom feeds using their URLs.
* Unified Reading Feed — View articles from all your subscribed sources in one place.
* Unread Articles — Keep track of articles you haven’t read yet.
* Save Articles — Bookmark interesting articles for later.
* Search — Quickly find articles by title, excerpt, or feed name.
* Sort Articles — Sort articles by newest or oldest.
* Article Reader — Read article previews and open the original source.
* Refresh Feeds — Fetch the latest articles from your subscribed sources.
* Responsive Design — A clean interface optimized for desktop and mobile devices.
* Local Storage — Feed subscriptions and reading states are saved in your browser.

🖥️ Preview

Pulse features a minimalist interface with:

* Dark navigation sidebar
* Clean article cards
* Search and sorting controls
* Feed management dialog
* Built-in article reader

🛠️ Built With

* HTML5
* CSS3
* JavaScript (Vanilla JS)
* Google Fonts — DM Sans and Manrope
* Browser Local Storage

📂 Project Structure

pulse-rss/
├── index.html
├── style.css
├── app.js
└── README.md

🚀 Getting Started

1. Clone the repository

git clone https://github.com/jack42142/pulse-rss.git

2. Open the project

cd pulse-rss

3. Run the frontend

Open index.html in your browser or use the VS Code Live Server extension.

Note: The current frontend sends requests to /api/parse to retrieve RSS and Atom feeds. A backend implementing this endpoint is required for adding and refreshing feeds to work. Opening the HTML file alone will not provide RSS fetching functionality.

📰 Example RSS Sources

You can try these feeds:

Source	RSS URL
VnExpress	https://vnexpress.net/rss/tin-moi-nhat.rss
BBC World	https://feeds.bbci.co.uk/news/world/rss.xml
Hacker News	https://hnrss.org/frontpage

💾 Data Storage

Pulse currently uses browser localStorage to store:

* Subscribed feeds
* Article read status
* Saved articles
* Feed information

Data is stored locally in the browser and is not synchronized between devices.

🗺️ Roadmap

* [ ]	Complete backend RSS/Atom parsing API
* [ ]	Improve feed refresh and error handling
* [ ]	Add dark mode
* [ ]	Add categories and folders
* [ ]	Add import/export OPML
* [ ]	Add cross-device synchronization
* [ ]	Add PWA support

🤝 Contributing

Contributions, suggestions, and bug reports are welcome!

1. Fork this repository.
2. Create a new branch.
3. Make your changes.
4. Submit a pull request.

📄 License

This project is open source. You can add a license of your choice to define how others may use and distribute the project.

⸻

Made with ❤️ by jack42142

GitHub Repository
