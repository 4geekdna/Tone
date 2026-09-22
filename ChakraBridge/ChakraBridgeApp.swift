import SwiftUI

@main
struct ChakraBridgeApp: App {
    @StateObject private var muse = MuseOSCService()
    var body: some Scene {
        WindowGroup { ContentView().environmentObject(muse) }
    }
}
