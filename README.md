# Timestamp Converter

Unix timestamp converter with timezone support, relative time, ISO 8601 and multiple date formats. Client-side only.

## Features

- Live Unix timestamp display (seconds and milliseconds, updates every second)
- Unix timestamp input with auto-detection of seconds vs milliseconds (by digit count)
- Converts to: ISO 8601, UTC, Local time, Relative ("3 hours ago"), RFC 2822, Unix seconds, Unix milliseconds
- Date/time picker converts to Unix timestamp (seconds and milliseconds)
- Timezone selector: UTC, Local, US/Eastern, US/Pacific, Europe/London, America/Sao_Paulo, Asia/Tokyo
- "Now" button to fill current timestamp
- Copy individual fields or all formats at once
- Dark/Light mode (follows system preference)
- i18n: English and Portuguese (BR)

## Tech stack

- React 19 + TypeScript
- Tailwind CSS v4
- Vite
- Lucide React icons

## Live demo

https://gmowses.github.io/timestamp-converter

## License

MIT
