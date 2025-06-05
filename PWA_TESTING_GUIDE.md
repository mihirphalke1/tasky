# PWA Testing Guide for Tasky

## 🚀 Quick Start Testing

Your PWA is now ready! Here's how to test it:

### ✅ **Issues Fixed:**

1. **React ref warning** - Badge component now properly forwards refs
2. **PWA installation on localhost** - Enhanced with localhost-specific testing features

## 🧪 Testing on Localhost (Mac)

### Chrome/Edge Testing

1. **Open your app**: http://localhost:8081 (or your port)
2. **Check PWA status**:
   - Open Chrome DevTools (F12)
   - Go to **Application** tab → **Manifest**
   - Verify manifest loads correctly
3. **Look for install button**: Check address bar for download/install icon (⬇️)
4. **Test install options**:
   - Click profile avatar → "Install App"
   - Or tap hamburger menu → "Install App" (mobile view)
5. **Check notifications**: Install notification should appear after 3 seconds

### Debugging Features Added

- **TEST badges** show when running on localhost
- **Debug info** available in install instructions
- **Console logs** for all PWA events
- **Enhanced error handling** for installation process

## 📱 Testing Installation Flow

### Desktop (Mac) - Chrome/Edge

```
1. Visit http://localhost:8081
2. Wait 3 seconds → Install notification appears
3. Click "Install" button
4. Chrome shows native install dialog
5. App installs to Applications folder
6. Launch from Dock/Launchpad
```

### Mobile Testing

```
1. Connect phone to same network
2. Visit http://192.168.1.30:8081 (your network IP)
3. Android Chrome: Native install prompt
4. iPhone Safari: Manual installation instructions
```

## 🔧 PWA Requirements Checklist

### ✅ **Currently Configured:**

- ✅ Valid manifest.json with all required fields
- ✅ Service worker (sw.js) registered
- ✅ Icons (SVG placeholders created)
- ✅ HTTPS ready (works on localhost)
- ✅ Display mode: standalone
- ✅ Start URL configured
- ✅ Theme colors set
- ✅ App shortcuts defined

### 📋 **For Production:**

- 🔄 Replace SVG icons with PNG versions
- 📸 Add real screenshots to `/public/screenshots/`
- 🌐 Deploy with HTTPS
- 🔍 Test on real devices

## 🎯 Testing Each Install Method

### 1. **Notification Install** (Auto-appears)

- **When**: 3 seconds after page load
- **Where**: Top-right corner
- **Dismissible**: Yes, won't show again
- **Test**: Clear localStorage and refresh

### 2. **Profile Dropdown Install**

- **Where**: Click profile avatar → Install option
- **Shows**: When app is installable
- **Hidden**: When already installed (shows "App Installed")

### 3. **Hamburger Menu Install**

- **Where**: Mobile menu → Install option in bordered container
- **Visual**: Prominent with PWA badge
- **Hierarchy**: Positioned for easy access

## 🐛 Troubleshooting

### "Cannot install PWA on localhost"

#### Chrome/Edge Solutions:

```bash
# 1. Check manifest in DevTools
Open DevTools → Application → Manifest
Look for errors or warnings

# 2. Verify service worker
Application → Service Workers
Should show "activated and running"

# 3. Clear browser data
Settings → Privacy → Clear browsing data
Or use Incognito mode

# 4. Force reload
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

#### Console Debugging:

```javascript
// Check in browser console:
console.log("PWA Status:", {
  standalone: window.matchMedia("(display-mode: standalone)").matches,
  installable: !!window.deferredPrompt,
  serviceWorker: "serviceWorker" in navigator,
});
```

### Common Issues & Solutions:

| Issue                      | Solution                                        |
| -------------------------- | ----------------------------------------------- |
| Install button not showing | Clear localStorage, reload page                 |
| Notification not appearing | Check if `pwa-install-prompted` in localStorage |
| Manifest errors            | Verify all icon files exist                     |
| Service worker issues      | Check Network tab for 404s                      |

## 📊 Testing Checklist

### Before Testing:

- [ ] App running on localhost
- [ ] Icons generated in `/public/icons/`
- [ ] Console open for debugging
- [ ] localStorage cleared

### During Testing:

- [ ] Install notification appears (3s delay)
- [ ] Profile dropdown shows install option
- [ ] Hamburger menu shows install option
- [ ] Install instructions work
- [ ] No console errors

### After Installation:

- [ ] App opens in standalone mode
- [ ] App icon appears in Applications/Start Menu
- [ ] Offline functionality works
- [ ] Install options show "App Installed"

## 🌐 Production Deployment

### Required Changes:

1. **Icons**: Convert SVG to PNG using tools like:

   - https://www.pwabuilder.com/
   - https://realfavicongenerator.net/

2. **Screenshots**: Add real app screenshots:

   ```
   public/screenshots/
   ├── desktop-dashboard.png (1280x720)
   └── mobile-focus.png (750x1334)
   ```

3. **HTTPS**: Deploy to HTTPS domain for full PWA support

4. **Testing**: Test on real devices across platforms

## 🎉 Success Indicators

Your PWA is working correctly if:

- ✅ No console errors related to PWA
- ✅ Install notifications appear appropriately
- ✅ All install entry points are visible
- ✅ Manual installation instructions work
- ✅ App installs and launches properly
- ✅ Offline functionality works

## 📝 Debug Commands

```bash
# Clear PWA state for testing
localStorage.removeItem('pwa-install-prompted');
localStorage.removeItem('pwa-installed');
location.reload();

# Check PWA installability
console.log(window.matchMedia('(display-mode: standalone)').matches);
```

Your Tasky PWA is now fully functional with robust testing capabilities! 🚀
