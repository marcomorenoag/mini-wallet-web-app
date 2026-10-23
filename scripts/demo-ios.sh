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
xcrun simctl status_bar "$UDID" override --time 9:41 --dataNetwork wifi --wifiMode active \
  --wifiBars 3 --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
xcrun simctl ui "$UDID" appearance light

# A clean first frame: no app left in front (and no "◀ Settings" back link), Safari on the login
# page. The demo is started later by switching to `#demo`, once the recording is running.
for app in com.apple.Preferences com.apple.mobilesafari; do
  xcrun simctl terminate "$UDID" "$app" 2>/dev/null || true
done
xcrun simctl openurl "$UDID" "$URL/login"
sleep 4

# The simulator window (Simulator.app, or DeviceHub in newer Xcode versions) is only for watching.
for app in Simulator DeviceHub; do open -a "$app" 2>/dev/null && break; done || true

# The player pings this one-shot listener when it ends, so the recording stops right after.
python3 - "$DONE_PORT" <<'PY' &
import http.server, sys

class Done(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(204)
        self.end_headers()

    def log_message(self, *args):
        pass

http.server.HTTPServer(("127.0.0.1", int(sys.argv[1])), Done).handle_request()
PY
LISTENER=$!

mkdir -p "$(dirname "$OUT")"
xcrun simctl io "$UDID" recordVideo --codec=h264 --force "$OUT" >/dev/null 2>&1 &
RECORDER=$!
sleep 2

echo "Recording $DEVICE_NAME → $OUT (stops when the demo ends, or after ${TIMEOUT}s)..."
xcrun simctl openurl "$UDID" "$URL/login#demo&speed=$SPEED&done=$DONE_PORT"

# Waits for the ping, up to the timeout.
STATUS=0
for ((elapsed = 0; elapsed < TIMEOUT; elapsed++)); do
  kill -0 "$LISTENER" 2>/dev/null || break
  sleep 1
done
if kill -0 "$LISTENER" 2>/dev/null; then
  kill "$LISTENER" 2>/dev/null || true
  STATUS=1
fi
sleep 1
kill -INT "$RECORDER"
wait "$RECORDER" 2>/dev/null || true

[ "$STATUS" -eq 0 ] || fail "The demo did not finish within ${TIMEOUT}s; the partial recording is in $OUT."
echo "Saved $OUT"
