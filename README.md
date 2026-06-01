# ProfileFog

**Blur the profile they think they have on you.**

ProfileFog helps blur low confidence ad and tracking profiles by combining controlled browsing noise, tracker blocking, link cleanup, learned tracker controls, and local Chrome privacy settings.

Ad networks and trackers build profiles by watching patterns. ProfileFog changes the pattern. It adds controlled browsing noise, reduces tracker reach, cleans tracking tags from links, and gives you simple controls when a site needs a lighter touch.

## Screenshot

Add a screenshot here later once the popup design is final.

Suggested file path:

```text
docs/screenshot.png
```

Suggested Markdown once the image is added:

```md
![ProfileFog popup](docs/screenshot.png)
```

## Why ProfileFog exists

Most privacy tools focus on blocking. That helps, but blocking alone still leaves a simple story about you: what you searched, what you clicked, what you bought, and what trackers saw across sites.

ProfileFog is built around a different idea: make the profile harder to trust.

Classic tools like AdNauseam and TrackMeNot showed that privacy can also come from obfuscation. AdNauseam popularized ad profile obfuscation by adding noise to advertising surveillance. TrackMeNot hid real searches inside a stream of decoy searches. ProfileFog brings that same privacy intuition into a Chrome Manifest V3 extension focused on everyday browsing noise, tracker control, and clean local settings.

## What ProfileFog does

* Adds controlled search and browsing noise from topic packs you choose.
* Blocks common tracker requests with Chrome Manifest V3 rules.
* Cleans tracking tags like campaign IDs from links.
* Learns which tracker domains repeatedly follow you across unrelated sites.
* Gives you current page controls when a site acts weird.
* Lets you pause protection on a site without digging through settings.
* Supports cookie block mode for learned trackers.
* Adds local Chrome privacy controls where Chrome exposes them.
* Lets you export and import your settings and learned tracker data.

## Why people might want it

ProfileFog is for people who want more than a normal ad blocker but do not want a complicated research tool.

Use it if you want to:

* Make weak ad interest profiles less reliable.
* Reduce third party tracking while browsing.
* Clean ugly tracking links automatically.
* See which domains keep showing up across sites.
* Keep quick breakage controls close instead of buried.
* Run a Chrome Manifest V3 privacy tool that is small enough to inspect.

## Quick install

1. Download or clone this repository.
2. Open Chrome.
3. Go to `chrome://extensions`.
4. Turn on `Developer mode`.
5. Click `Load unpacked`.
6. Select the `ProfileFog` folder.
7. Click the ProfileFog icon and turn it on.

## Suggested first run

Start conservative:

* Mode: Mixed
* Search engine: DuckDuckGo or Brave
* Max per hour: 4
* Auto close tabs: on
* Tracker blocker: on
* Link cleanup: on
* Learning observer: on
* Learned blocking: on
* Cookie block mode: on
* Learning review mode: on
* Pause on sensitive tab: on

Then browse normally for a day. Review learned trackers after the list has real data.

## Everyday controls

The popup is built around quick action first.

* Pause site: use this when a site breaks.
* Run once: generate one controlled noise visit now.
* Current page panel: see tracker domains seen on the active tab.
* Allow site: lighten protection for one site.
* Block: block a tracker everywhere.
* Allow all: trust a tracker globally.
* Cookie: put a tracker into cookie block mode.
* Reset: clear a learned decision.

## Advanced controls

The options page contains the deeper controls:

* Topic packs
* Activity limits
* Tracker learning
* Learned tracker review
* Import and export
* Browser privacy settings
* Local rule controls

## Privacy model

ProfileFog is a local browser extension. It stores settings, activity logs, learned tracker data, site rules, and pause rules in Chrome extension storage.

The goal is practical privacy friction:

* Add noise to weak profile signals.
* Reduce third party tracker reach.
* Clean link based tracking.
* Give the user fast local control.

It is not magic invisibility. Strong account based signals like logins, purchases, location, payment history, and long term platform activity can still outweigh browsing noise.

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

* `manifest.json`: Chrome Manifest V3 manifest.
* `service_worker.js`: scheduling, privacy controls, tracker learning, rules, and tab generation.
* `rules/tracker_rules.json`: local tracker blocking rules.
* `rules/cleanup_rules.json`: local link cleanup rules.
* `popup.html`: extension popup.
* `popup.css`: popup styling.
* `popup.js`: popup controls.
* `options.html`: full options page.
* `options.css`: options page styling.
* `options.js`: options page controls.
* `scripts/validate_extension.py`: local syntax and rule validation.
* `scripts/package_extension.sh`: release ZIP packaging.
* `icons/`: local icons.

## Related ideas

ProfileFog is influenced by the privacy idea of obfuscation: making surveillance data less useful by adding controlled noise.

Related projects worth reading about:

* [AdNauseam](https://adnauseam.io/)
* [TrackMeNot](https://www.trackmenot.io/)

ProfileFog is a separate project focused on Chrome Manifest V3, tracker controls, browsing noise, and local user control.

## Version 1.5.0

Added options page, seeded tracker data, header based tracker heuristics, breakage protection allow rules, expanded suffix handling, and validation and packaging scripts.

## Version 1.4.1

Refined the popup around a cleaner daily workflow.

* Moved site pause and run controls to the top of the popup.
* Added a compact current site strip with tracker count and pause state.
* Added top level blocked, cleaned, observed, and ready counters.
* Moved detailed settings into expandable panels.
* Kept page controls visible near the top for faster breakage handling.
* Kept advanced noise, protection, topics, learned trackers, activity, and backup controls available behind focused sections.

## Version 1.4.0

Added current page tracker view, site pause, per site allow, cookie block mode, learning review, public suffix aware domain grouping, and export and import.
