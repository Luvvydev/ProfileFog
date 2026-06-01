# NoiseProfile

NoiseProfile is a private Chrome Manifest V3 extension that creates controlled search and browsing activity from selected topic packs, applies browser privacy preferences, and uses local tracker rules.

## What it does

- Opens random search or article tabs from selected topic packs.
- Uses Chrome alarms for scheduled activity.
- Lets you cap activity per hour.
- Rotates recent targets to keep generated visits varied.
- Can close generated tabs after a dwell time.
- Applies Chrome privacy preferences for prediction, link auditing, and ad topics when Chrome exposes those controls.
- Uses Chrome declarative network rules to block common third-party tracker requests.
- Cleans common tracking parameters from page navigations.
- Shows local tracker activity totals in the popup.
- Observes third-party requests and learns repeated trackers across unrelated sites.
- Reviews mature learned trackers before full blocking when learning review mode is on.
- Adds cookie block mode for learned trackers by stripping cookies, referer, and set-cookie headers.
- Provides current page controls for allow on this site, block everywhere, allow everywhere, cookie block, reset, and site pause.
- Includes an options page for advanced controls and learned tracker review.
- Uses seeded tracker domains so protection has useful defaults before local learning matures.
- Scores learned domains with header heuristics such as third-party cookie, referer, and set-cookie behavior.
- Applies a breakage protection allowlist for common auth, captcha, payment, media, and CDN services.
- Uses an expanded bundled public suffix map for common country-code and hosted platform domains.
- Provides learned tracker controls for allow, cookie block, block, reset, and clear.
- Exports and imports settings, learned trackers, site rules, and pause rules.
- Keeps a local activity log in Chrome extension storage.
- Pauses when the active tab looks sensitive, such as banking, checkout, login, mail, or payment pages.

## Install in Chrome

1. Unzip `NoiseProfile.zip`.
2. Open Chrome and go to `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select the unzipped `NoiseProfile` folder.
6. Click the NoiseProfile icon and turn it on.

## Suggested settings

Start conservative:

- Mode: Mixed
- Search engine: DuckDuckGo or Brave
- Max per hour: 4
- Min delay minutes: 8
- Max delay minutes: 22
- Dwell seconds: 35
- Auto close tabs: on
- Chrome privacy controls: on
- Tracker blocker: on
- Link cleanup: on
- Learning observer: on
- Learned blocking: on
- Cookie block mode: on
- Learning review mode: on
- Recent target rotation: on
- Pause on sensitive tab: on

## Tracker controls

The tracker blocker uses Chrome Manifest V3 declarative network request rules. The first ruleset blocks common third-party tracker domains. The second ruleset removes common tracking parameters such as `utm_source`, `fbclid`, `gclid`, `msclkid`, and similar campaign IDs from page navigations using small per-parameter rules.

The learning observer watches third-party requests and records when a domain appears across unrelated first-party sites. A domain enters cookie block mode after appearing across 3 first-party sites. A domain becomes ready after appearing across 5 first-party sites with at least 8 observed requests when learning review mode is on. If review mode is off, mature learned trackers can become dynamic block rules. Learned rules are limited to third-party requests.

The popup shows blocked, cleaned, observed, suspicious, and learned blocked totals when Chrome exposes the needed extension feedback. Learned domains can be allowed, cookie blocked, blocked, reset, or cleared from the popup. Current page domains can also be allowed on the current site only.

## Privacy controls

The browser privacy controls use Chrome's privacy API when available. NoiseProfile applies preferences for network prediction, alternate error pages, link auditing, ad topics, ad measurement, and Protected Audience.

## Development

Run local validation before packaging:

```bash
python3 scripts/validate_extension.py
```

Package a release ZIP:

```bash
./scripts/package_extension.sh
```

## Files

- `manifest.json`: Chrome MV3 manifest.
- `service_worker.js`: background scheduling, privacy controls, tracker controls, and tab generation.
- `rules/tracker_rules.json`: local tracker blocking rules.
- `rules/cleanup_rules.json`: local link cleanup rules.
- `popup.html`: extension popup.
- `popup.css`: popup styling.
- `popup.js`: popup controls.
- `options.html`: full options page.
- `options.css`: options page styling.
- `options.js`: options page controls.
- `scripts/validate_extension.py`: local syntax and rule validation.
- `scripts/package_extension.sh`: release ZIP packaging.
- `icons/`: local icons.


## Version 1.5.0

Added options page, seed tracker data, header-based tracker heuristics, breakage protection allow rules, expanded suffix handling, and validation/package scripts.

## Version 1.4.0

Added current page tracker view, site pause, per site allow, cookie block mode, learning review, public suffix aware domain grouping, and export/import.

Recommended first run:

1. Keep learning review mode on.
2. Browse normally for a day.
3. Use the Current page panel when a site acts weird.
4. Use Pause site for breakage.
5. Export your settings after the learned list looks stable.

## Version 1.4.1

Refined the popup around a cleaner daily workflow:

- Moved site pause and run controls to the top of the popup.
- Added a compact current site strip with tracker count and pause state.
- Added top level blocked, cleaned, observed, and ready counters.
- Moved detailed settings into expandable panels.
- Kept page controls visible near the top for faster breakage handling.
- Kept advanced noise, protection, topics, learned trackers, activity, and backup controls available behind focused sections.
