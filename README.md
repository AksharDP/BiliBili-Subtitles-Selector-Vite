
# BiliBili Subtitles Selector

A browser userscript that lets you search, select, and apply custom subtitles to videos on BiliBili. This project is a TypeScript rewrite of the original [BiliBili-Subtitles-Selector](https://github.com/AksharDP/BiliBili-Subtitles-Selector) with improved maintainability and features.

## Features

- Search for subtitles from OpenSubtitles database
- Apply custom SRT/VTT subtitle files to BiliBili videos
- Customize subtitle appearance (font, size, color, background, outline)
- Synchronize subtitles with video playback
- Drag and position subtitles anywhere on the video
- Animation effects for subtitle transitions

## Installation

Requires:
- Tampermonkey

1.  Install the userscript by clicking below:

&emsp;&emsp; [![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Install%20Userscript-brightgreen?logo=tampermonkey&style=flat-square)](https://github.com/AksharDP/BiliBili-Subtitles-Selector-Vite/releases/download/v0.2/bilibili-subtitles.user.js)

## Build Instructions

This project uses Vite and TypeScript. To build:

```bash
pnpm install
pnpm run build
```

## Browser Compatibility

Tested primarily in a Chromium-based browser with Tampermonkey extension.
