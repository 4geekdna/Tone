# Chakra Bridge — iPhone-only Mind Monitor OSC receiver

Native SwiftUI receiver for Muse Athena data streamed by Mind Monitor on the same iPhone.

## Xcode setup
1. Xcode → File → New → Project → iOS App. Product Name: `ChakraBridge`, Interface: SwiftUI, Language: Swift.
2. Replace the generated app/content files with `ChakraBridgeApp.swift`, `ContentView.swift`, and add `MuseOSCService.swift`.
3. Deployment target: iOS 17+ (iOS 18/26 fine).
4. In Info add **Privacy - Local Network Usage Description**: `Chakra Bridge receives Muse/Mind Monitor OSC data on this iPhone.`
5. Add **Bonjour services** only if a future discovery service is added; not required for localhost UDP.
6. Build/run on the physical iPhone.

## Mind Monitor
- OSC Stream Target IP: `127.0.0.1`
- OSC Stream Port: `5000`
- OSC Stream Brainwaves: `All values`
- Enable all desired raw/absolute sensor streams.

## Recording
Tap **Record Session**. Every OSC address received is retained, including unknown/future addresses. **Stop + Save** writes a timestamped JSON file to the app Documents directory and exposes an iOS ShareLink.

## Important iOS limitation
This version proves localhost OSC reception and recording while Chakra Bridge is active. iOS may suspend a normal app after it goes to the background, so do not assume uninterrupted recording while spending a long time in Mind Monitor. The robust production architecture is to bring the journey UI/control into this native app (or use a supported background execution strategy where appropriate) so the receiver remains the active application.

## Next integration
- native Govee API client using existing chakra calibration model
- live charts/ring buffers
- configurable alpha/theta/beta visualization mappings
- journey start/stop automatically starts/stops recording
- session metadata and Starfleet-ready export
