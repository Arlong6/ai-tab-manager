# Privacy Policy for AI Tab Manager

**Last updated:** April 4, 2026

## Overview

AI Tab Manager is a Chrome extension that helps you organize browser tabs using AI. We are committed to protecting your privacy.

## Data Collection

**We do not collect, store, or transmit any personal data to our servers.** AI Tab Manager has no backend server.

### What data is processed

- **Tab URLs and titles**: Sent to Google's Gemini API when you use AI features (auto-group, summarize, search). This data is sent directly from your browser to Google's API using your own API key.
- **Page content**: When you use the "Summarize" or "Search" features, the text content of web pages is extracted locally and sent to Google's Gemini API for processing.
- **API key**: Your Gemini API key is stored locally in Chrome's extension storage (`chrome.storage.local`). It is never sent to any server other than Google's API.
- **Saved sessions**: Tab sessions you save are stored locally in your browser using `chrome.storage.local`. They are never uploaded anywhere.

### What we do NOT collect

- No analytics or tracking
- No cookies
- No personal information
- No browsing history beyond what you explicitly process with AI features
- No data is sent to any server we operate

## Third-Party Services

AI Tab Manager uses **Google Gemini API** for AI features. When you use AI features, your tab data is processed according to [Google's API Terms of Service](https://ai.google.dev/gemini-api/terms) and [Privacy Policy](https://policies.google.com/privacy).

## Data Storage

All data (settings, sessions, cached summaries) is stored locally on your device using Chrome's built-in storage API. Uninstalling the extension removes all stored data.

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be reflected in the "Last updated" date above.

## Contact

If you have questions about this privacy policy, please open an issue on our GitHub repository.
