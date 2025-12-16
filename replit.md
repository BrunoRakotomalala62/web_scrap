# API Mega List

## Overview
This project fetches and organizes Apify Actors (APIs) from the Apify Store API into categorized markdown documentation. It generates a comprehensive README with all available APIs grouped by category.

## Project Structure
```
.
├── settings/                      # Utility scripts
│   ├── fetch_apify_actors.js     # Main script - fetches all actors from Apify API
│   ├── generate_readme_clean.js  # Generates clean README from JSON data
│   ├── filter_scraping_apis.js   # Filters specific API types
│   ├── remove_duplicate_apis.js  # Deduplication utility
│   └── ...                       # Other utility scripts
├── *-apis-*/                     # Category folders with README.md files
├── README.md                     # Main generated documentation
└── FOLLOW_CREATOR.md             # Creator information
```

## How to Run
The main workflow runs `node settings/fetch_apify_actors.js` which:
1. Fetches all actors from the Apify Store API with pagination
2. Saves raw data to `apify_actors.json`
3. Generates categorized markdown documentation
4. Creates category-specific README files in folders

## Key Scripts
- **fetch_apify_actors.js**: Fetches all actors and generates initial documentation
- **generate_readme_clean.js**: Regenerates clean README from existing JSON data
- **remove_duplicate_apis.js**: Removes duplicate entries from the collection

## Technical Details
- Language: Node.js (CommonJS)
- External Dependencies: None (uses only built-in Node.js modules)
- API: Apify Store API (https://api.apify.com/v2/store)

## Last Updated
December 2025
