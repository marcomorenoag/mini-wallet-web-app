#!/usr/bin/env bash
# iOS Simulator launcher of the scripted demo (public/demo-player.js): records it in Safari on a
# simulated iPhone at native resolution, with the 9:41 status bar of Apple's product shots.
#
#   make demo-server       # production build with the demo player enabled
#   make demo-ios          # records demo-video/iphone.mov
#
# Environment: DEMO_URL (default http://localhost:3000), DEMO_DEVICE (simulator name, default
# "Mini Wallet Demo"), DEMO_DEVICE_TYPE (default "iPhone 18 Pro"), DEMO_SPEED (pause multiplier),
# DEMO_OUT (default demo-video/iphone.mov) and DEMO_TIMEOUT (seconds, default 240).
set -euo pipefail

URL="${DEMO_URL:-http://localhost:3000}"
DEVICE_NAME="${DEMO_DEVICE:-Mini Wallet Demo}"
DEVICE_TYPE="${DEMO_DEVICE_TYPE:-iPhone 18 Pro}"
SPEED="${DEMO_SPEED:-1}"
OUT="${DEMO_OUT:-demo-video/iphone.mov}"
TIMEOUT="${DEMO_TIMEOUT:-240}"
DONE_PORT="${DEMO_DONE_PORT:-3999}"

fail() { echo "demo-ios: $*" >&2; exit 1; }

command -v xcrun >/dev/null || fail "Xcode is required (xcrun was not found)."
curl -sf "$URL/api/health" >/dev/null || fail "No server at $URL: start it with 'make demo-server'."

# A take starts from the seeded data (Ana: $12,500.00); every take leaves two transfers behind.
JAR="$(mktemp)"
curl -sf -c "$JAR" -H 'content-type: application/json' -d '{"identifier":"ana@example.com"}' \
  "$URL/api/v1/auth/login" >/dev/null || fail "Signing in as Ana failed at $URL."
BALANCE="$(curl -sf -b "$JAR" "$URL/api/v1/account" | python3 -c 'import json, sys; print(json.load(sys.stdin)["balance"]["amount"])')"
rm -f "$JAR"
[ "$BALANCE" = "1250000" ] ||
  fail "The server still has the transfers of a previous take: restart 'make demo-server' first."

device_udid() {
  xcrun simctl list devices | grep -F "    $DEVICE_NAME (" | head -1 | sed -E 's/.*\(([0-9A-F-]{36})\).*/\1/'
}

# A dedicated simulator is created once, on the newest runtime that supports the device type.
UDID="$(device_udid)"
if [ -z "$UDID" ]; then
  TYPE_ID="$(xcrun simctl list devicetypes | grep -F "$DEVICE_TYPE (" | head -1 | sed -E 's/.*\((com\.apple[^)]+)\).*/\1/')"
  [ -n "$TYPE_ID" ] || fail "Unknown device type '$DEVICE_TYPE' (see 'xcrun simctl list devicetypes')."
  for RUNTIME in $(xcrun simctl list runtimes | grep -E '^iOS' | sed -E 's/.* - (com\.apple[^ ]+).*/\1/' | sort -r); do
    UDID="$(xcrun simctl create "$DEVICE_NAME" "$TYPE_ID" "$RUNTIME" 2>/dev/null)" && break
  done
  [ -n "$UDID" ] || fail "No installed iOS runtime supports '$DEVICE_TYPE' (try 'xcodebuild -downloadPlatform iOS')."
  echo "Created the '$DEVICE_NAME' simulator ($DEVICE_TYPE)."
fi

xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b >/dev/null

# Safari starts without the session or theme of a previous take. Its cookies and website data
# are removed while the simulator is shut down, so no process keeps them in memory.
SAFARI_DATA="$(xcrun simctl get_app_container "$UDID" com.apple.mobilesafari data 2>/dev/null || true)"
if [ -n "$SAFARI_DATA" ]; then
  xcrun simctl shutdown "$UDID"
  rm -rf "$SAFARI_DATA/Library/Cookies" "$SAFARI_DATA/Library/WebKit/com.apple.mobilesafari/WebsiteData"
  xcrun simctl boot "$UDID"
  xcrun simctl bootstatus "$UDID" -b >/dev/null
fi

# Status bar overrides do not survive a reboot, so they are applied last.
xcrun simctl status_bar "$UDID" override --time 9:41 --dataNetwork wifi --wifiMode active \
  --wifiBars 3 --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
xcrun simctl ui "$UDID" appearance light

# The player pings a one-shot local listener: when the page is ready, and when the demo ends.
listen_once() {
  python3 - "$DONE_PORT" <<'PY' &
import http.server, sys

class Ping(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(204)
        self.end_headers()

    def log_message(self, *args):
        pass

http.server.HTTPServer(("127.0.0.1", int(sys.argv[1])), Ping).handle_request()
PY
  LISTENER=$!
}

# Waits for the ping, up to a number of seconds; fails (status 1) if it never arrives.
wait_for_ping() {
  for ((elapsed = 0; elapsed < $1; elapsed++)); do
    kill -0 "$LISTENER" 2>/dev/null || return 0
    sleep 1
  done
  kill "$LISTENER" 2>/dev/null || true
  return 1
}

# A clean first frame: no app left in front (and no "◀ Settings" back link), and Safari showing
# the loaded login page before the recording starts.
for app in com.apple.Preferences com.apple.mobilesafari; do
  xcrun simctl terminate "$UDID" "$app" 2>/dev/null || true
done
# The simulator window (Simulator.app, or DeviceHub in newer Xcode versions) is only for watching.
for app in Simulator DeviceHub; do open -a "$app" 2>/dev/null && break; done || true

listen_once
xcrun simctl openurl "$UDID" "$URL/login#ready=$DONE_PORT"
wait_for_ping 90 || fail "Safari did not load $URL/login on the simulator."
sleep 1

mkdir -p "$(dirname "$OUT")"
listen_once
xcrun simctl io "$UDID" recordVideo --codec=h264 --force "$OUT" >/dev/null 2>&1 &
RECORDER=$!
sleep 2

# Only the hash changes, so the page is not reloaded: the player starts on `hashchange`.
echo "Recording $DEVICE_NAME → $OUT (stops when the demo ends, or after ${TIMEOUT}s)..."
xcrun simctl openurl "$UDID" "$URL/login#demo&speed=$SPEED&done=$DONE_PORT"

STATUS=0
wait_for_ping "$TIMEOUT" || STATUS=1
sleep 1
kill -INT "$RECORDER"
wait "$RECORDER" 2>/dev/null || true

[ "$STATUS" -eq 0 ] || fail "The demo did not finish within ${TIMEOUT}s; the partial recording is in $OUT."
echo "Saved $OUT"
