# Kusumtai Thakare Bahuudhesh Sanstha Ghatanji

A responsive school website for Kusumtai Thakare Bahuudhesh Sanstha Ghatanji in Ghatanji, Yavatmal, Maharashtra. The frontend presents the school, its programs, and the institute members, and it includes an enquiry form that connects to the local backend.

## Overview

The frontend is a multi-page static site built with HTML, CSS, and JavaScript. It includes:

- A homepage with hero, about, student life, gallery, and enquiry sections
- A programs page that introduces the junior, primary, and secondary blocks
- An institute page that highlights the leadership team
- Shared styling and navigation across all pages

## Pages

- `index.html` - main landing page
- `programs.html` - overview of the learning stages
- `junior-block.html` - junior block details
- `primary-block.html` - primary block details
- `secondary-block.html` - secondary block details
- `institute.html` - institute member profiles

## Tech Stack

- HTML5 for structure and semantics
- CSS3 for layout, responsive design, and visual styling
- JavaScript for navigation behavior, smooth scrolling, and enquiry submission
- Google Fonts: Poppins and Open Sans

## Project Structure

```text
FSD/
├── backend/
│   ├── server.js
│   ├── admin-tool.js
│   └── enquiries_export.*
├── frontend/
│   ├── index.html
│   ├── institute.html
│   ├── institute.css
│   ├── programs.html
│   ├── programs.css
│   ├── junior-block.html
│   ├── primary-block.html
│   ├── secondary-block.html
│   ├── script.js
│   ├── style.css
│   └── logo.jpeg
└── Images/
    ├── about us image.jpeg
    └── institue members/
```

## Getting Started

### View the frontend

1. Open the `frontend` folder in VS Code.
2. Open `index.html` in a browser, or use a Live Server extension.
3. Use the navigation links to move between the pages.

### Run the enquiry backend

The enquiry form posts to `http://localhost:3000/api/enquiry`, so the backend must be running if you want submissions to work.

1. Open a terminal in the repository root.
2. Install backend dependencies if needed: `npm install` inside `backend`.
3. Start the server with `node server.js` from the `backend` folder.
4. Open the site through the backend at `http://localhost:3000/frontend/index.html`.

The backend also exports enquiry data to `backend/enquiries_export.txt` and `backend/enquiries_export.sql`.

## Notes

- Image paths in the pages point to the shared `Images/` folder in the repository root.
- The mobile menu and sticky header behavior are handled in `script.js`.
- If the backend is not running, the enquiry form will still display the page, but submission will fail with a connection error.

## Contact

- Location: Ghatanji, Yavatmal, Maharashtra
- Email: grishmathakare1@gmail.com
- Phone: +91 XXXXX XXXXX

## License

This project is created for educational and charitable purposes. All rights reserved to Kusumtai Thakare Bahuudhesh Sanstha Ghatanji.
