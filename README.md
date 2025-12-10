# Oiia Cat

**Oiia Cat** is an interactive, web-based 3D virtual pet simulation where users can interact with, feed, and play with a digital cat.

## Features

- **3D Interaction:** Fully interactive 3D cat model built with Three.js (rotate, zoom, pan).
- **Needs System:** Dynamic Hunger and Happiness bars that decay over time.
- **Customization:** Name your pet! Custom names are saved via Local Storage.
- **Animation & Sound:** Special dance animations and sound effects triggered by feeding or playing.
- **Persistence:** Game state and settings are saved automatically, so your pet waits for you even after you close the browser.
- **Responsive Design:** Modern Glassmorphism UI that works on both mobile and desktop.

## Installation

1. Clone or download this repository to your local machine.
2. Start a local server inside the project folder (e.g., using the "Live Server" extension in VS Code).
3. Open `index.html` in your browser.

> **Note:** Due to browser security policies regarding ES modules and CORS, Three.js may not work correctly if you open the `index.html` file directly (via `file://` protocol). Please use a local server (`localhost`).

## Technologies Used

- HTML5 & CSS3
- JavaScript (ES6+)
- Three.js (3D Render Engine)

## Developer

Designed and developed by **Mehmet Baysal**.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.