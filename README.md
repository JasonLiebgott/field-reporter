# ODR Timer PWA

A Progressive Web App for managing rental timers for various water sports equipment.

## Features

- Create and manage inventory of rental objects (canoes, kayaks, bikes, etc.)
- Start multiple timers simultaneously with customizable durations
- Color-coded progress bars (green -> yellow at 15min -> red for overtime)
- Swipe to delete timers
- Filter timers by rental type
- Adjust start times
- Offline-capable once installed
- Persistent data storage

## Installation

1. Start the local server: `python -m http.server 8000`
2. Open http://localhost:8000 in your browser
3. For iPad: Tap the share button and "Add to Home Screen"

## Usage

### Setup Inventory
- Go to the Setup section
- Add rental object types with names and icons
- Default types include Canoe, Kayak, Bike, Paddle Board, Paddle Boat, Cadillac Bike

### Managing Timers
- Switch to Timers section
- Click "Add Timer" (floating button)
- Select rental type, enter specific name (e.g., "Canoe 1")
- Choose duration (1, 2, 3 hours or custom)
- Set start time (now, in 5 minutes, or custom)
- Timers will display with countdown and progress bar
- Swipe left on a timer to delete
- Use filter buttons to show only specific types
- Adjust start time if needed

## Color Coding
- **Green**: Normal rental time remaining
- **Yellow**: 15 minutes or less remaining
- **Red**: Overtime (beyond rental duration)

## Data Persistence
All inventory and timer data is stored locally in your browser/device.