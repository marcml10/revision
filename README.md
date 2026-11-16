# Revision

Revision is a personal study planner for keeping track of what you are learning and when to revisit it. Organize material into books and topics, schedule review sessions, record progress, and keep notes or a visual board alongside each topic.

The app is a browser-based React application. It starts with example study material so you can explore the interface, and stores your changes in the current browser using `localStorage`.

## Features

- **Home:** See upcoming and pending topics at a glance.
- **Library:** Organize books and topics, search your material, and track topic progress.
- **Topic spaces:** Keep written notes, work through a checklist, or sketch ideas on a board with text, shapes, and drawing tools.
- **Review calendar:** Schedule topics for a date and time, browse review dates, and see logged coverage.
- **Insights:** Review daily and weekly coverage, checklist activity, and your study goal.
- **Settings:** Set a reminder time and weekly goal, and adjust compact mode and reduced motion.
- **Local persistence:** Books, schedules, checklists, notes, board content, coverage, and settings are saved in browser storage.

## Requirements

- Node.js (an active LTS release is recommended)
- npm

## Getting started

```bash
npm install
npm run dev
```

Vite prints the local development URL in the terminal. Open it in a browser to use the app. The development server supports hot module replacement.

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Create a production build in `dist/`. |
| `npm run preview` | Serve the production build locally for review. Run `npm run build` first. |
| `npm run lint` | Check the project with ESLint. |
| `npm test` | Run the Vitest component and behavior tests once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:e2e` | Run Playwright end-to-end tests in desktop Chromium and mobile Chromium. |
| `npm run test:all` | Run Vitest, then Playwright end-to-end tests. |

The Playwright configuration starts its own Vite server on `127.0.0.1:5183`. Browser binaries may need to be installed for Playwright in a fresh environment; see the [Playwright browser installation guide](https://playwright.dev/docs/browsers).

## Data and privacy

This project has no backend service or account sync configured. Study data is stored in the browser profile on the device where you use the app. Clearing that site's browser storage removes the saved data, and data does not automatically transfer between browsers or devices. The initial sample books and topics appear when there is no saved library.

## Tech stack

- React 19 and React DOM
- Vite 8
- Tailwind CSS 4 via the Vite plugin, with project styles in `src/index.css` and `src/App.css`
- Lucide React icons and Rough.js drawing support
- Vitest and Testing Library for component tests
- Playwright for end-to-end tests

## Project structure

```text
src/
  App.jsx                 Application screens and study-planning behavior
  App.css                 Application styles
  index.css               Global styles
  components/
    Dock.jsx              Primary navigation
    settings/             Settings screen
  lib/                    Shared utilities
tests/
  accessibility/          Accessibility behavior tests
  calendar/               Calendar and scheduling tests
  e2e/                    Playwright browser tests
  library/                Library and search tests
  persistence/            Local persistence and daily progress tests
  topic/                  Topic, notes, checklist, and board tests
```

## Production build

```bash
npm run build
npm run preview
```

The generated static site is in `dist/` and can be hosted by a static web server. Configure the host to serve `index.html` for application routes if client-side routes are added.
