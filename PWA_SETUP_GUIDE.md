# PWA Setup Guide for Tasky

## Overview

Your Tasky app is now configured as a Progressive Web App (PWA) that can be installed on various devices including Mac, Windows, iPhone, and Android. This guide explains the setup and where to place your PWA assets.

## PWA Icon Requirements

### Icon Directory Structure

Place all PWA icons in the `public/icons/` directory:

```
public/
├── icons/
│   ├── icon-57x57.png      # iOS Home Screen (iPhone 3G/3GS)
│   ├── icon-60x60.png      # iOS Home Screen (iPhone 4/4S)
│   ├── icon-72x72.png      # iPad Home Screen (iPad 1/2)
│   ├── icon-76x76.png      # iPad Home Screen (iPad Air/Mini)
│   ├── icon-96x96.png      # Android Chrome
│   ├── icon-114x114.png    # iOS Home Screen (iPhone 4/4S Retina)
│   ├── icon-120x120.png    # iOS Home Screen (iPhone 5/6)
│   ├── icon-128x128.png    # Chrome Web Store
│   ├── icon-144x144.png    # Windows Metro Tile
│   ├── icon-152x152.png    # iPad Home Screen (iPad Air/Mini Retina)
│   ├── icon-180x180.png    # iOS Home Screen (iPhone 6 Plus)
│   ├── icon-192x192.png    # Android Chrome (Recommended)
│   ├── icon-384x384.png    # Android Chrome Splash
│   ├── icon-512x512.png    # PWA Splash Screen
│   ├── focus-icon-96x96.png    # Shortcut icon for Focus Mode
│   └── add-icon-96x96.png      # Shortcut icon for Add Task
├── screenshots/
│   ├── desktop-dashboard.png   # Desktop screenshot (1280x720)
│   └── mobile-focus.png        # Mobile screenshot (750x1334)
├── favicon.ico
├── manifest.json
└── sw.js
```

### Icon Design Guidelines

1. **Format**: Use PNG format for all icons
2. **Design**: Ensure icons are square and look good at small sizes
3. **Background**: Use transparent or solid background (avoid gradients)
4. **Branding**: Maintain consistent branding with your app logo
5. **Maskable**: Consider making icons "maskable" for Android adaptive icons

### Icon Size Requirements

| Size    | Purpose                 | Platform          |
| ------- | ----------------------- | ----------------- |
| 57x57   | iOS Home Screen         | iPhone 3G/3GS     |
| 60x60   | iOS Home Screen         | iPhone 4/4S       |
| 72x72   | iPad Home Screen        | iPad 1/2          |
| 76x76   | iPad Home Screen        | iPad Air/Mini     |
| 96x96   | Android Chrome          | Android           |
| 114x114 | iOS Home Screen Retina  | iPhone 4/4S       |
| 120x120 | iOS Home Screen         | iPhone 5/6        |
| 128x128 | Chrome Web Store        | Desktop           |
| 144x144 | Windows Metro Tile      | Windows           |
| 152x152 | iPad Home Screen Retina | iPad Air/Mini     |
| 180x180 | iOS Home Screen         | iPhone 6 Plus     |
| 192x192 | Android Chrome          | Android (Primary) |
| 384x384 | Android Chrome Splash   | Android           |
| 512x512 | PWA Splash Screen       | All Platforms     |

## PWA Installation Features

### 1. Automatic Install Notifications

- Shows notification after 5 seconds for first-time visitors
- Can be dismissed and won't show again
- Automatically detects device type (mobile/desktop)

### 2. Profile Dropdown Install Option

- Available in desktop navigation bar
- Accessible via user profile avatar
- Shows install status when already installed

### 3. Hamburger Menu Install Option

- Available in mobile navigation menu
- Prominently placed with visual hierarchy
- Bordered container for emphasis

### 4. Cross-Platform Support

#### Desktop (Mac/Windows)

- Chrome, Edge, Firefox support
- Installs as standalone application
- Appears in Applications folder (Mac) or Start Menu (Windows)

#### Mobile (iPhone/Android)

#### iPhone/iPad (Safari)

- Manual installation via Share > Add to Home Screen
- Shows step-by-step instructions
- Works with iOS 11.3+

#### Android (Chrome)

- Automatic install prompt
- Appears in app drawer
- Full native app experience

## Current PWA Configuration

### Manifest.json Features

✅ App name and description
✅ Theme colors (#f59e0b - amber)
✅ Display mode (standalone)
✅ All required icon sizes
✅ App shortcuts (Focus Mode, Add Task)
✅ Categories (productivity, utilities, business)
✅ Screenshots for app stores

### Service Worker Features

✅ Offline functionality
✅ Background sync
✅ Cache management
✅ Update notifications

## Installation Instructions by Platform

### Chrome Desktop (Mac/Windows)

1. Look for install button (⬇️) in address bar
2. Click to install as desktop app
3. App appears in Applications/Start Menu

### Safari iPhone/iPad

1. Tap Share button (□↗) in Safari
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add" to install

### Chrome Android

1. Automatic prompt appears for installable apps
2. Tap "Install" when prompted
3. App appears in app drawer

## Development Notes

### Testing PWA Installation

1. Serve app over HTTPS (required for PWA)
2. Open in supported browser
3. Check DevTools > Application > Manifest
4. Verify service worker registration

### Customization

- Update `manifest.json` for branding changes
- Modify PWA component for different install flows
- Add custom installation analytics

## File Locations

- PWA Install Component: `src/components/PWAInstall.tsx`
- Manifest: `public/manifest.json`
- Service Worker: `public/sw.js`
- Icons: `public/icons/`
- Integration: `src/components/NavBar.tsx` and `src/App.tsx`

## Browser Support

| Feature        | Chrome | Firefox | Safari | Edge |
| -------------- | ------ | ------- | ------ | ---- |
| Install Prompt | ✅     | ✅      | Manual | ✅   |
| Service Worker | ✅     | ✅      | ✅     | ✅   |
| Manifest       | ✅     | ✅      | ✅     | ✅   |
| Offline        | ✅     | ✅      | ✅     | ✅   |

## Next Steps

1. **Create Icons**: Generate all required icon sizes using your app logo
2. **Test Installation**: Test on different devices and browsers
3. **Analytics**: Add tracking for installation events
4. **App Store**: Consider publishing to Microsoft Store or Google Play Store
5. **Updates**: Implement update notifications for new app versions

Your PWA is now ready for installation across all major platforms! 🚀
