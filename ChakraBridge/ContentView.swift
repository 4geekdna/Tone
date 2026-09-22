import SwiftUI

struct ContentView: View {
 @EnvironmentObject var muse:MuseOSCService
 private let groups=["eeg","alpha","theta","beta","gamma","delta","ppg","acc","gyro","horseshoe","battery"]
 var body: some View {
  NavigationStack { ScrollView {
   VStack(spacing:14){
    GroupBox("Mind Monitor OSC") { VStack(alignment:.leading,spacing:10){
     HStack{Circle().fill(muse.listening ? .green:.red).frame(width:12,height:12);Text(muse.listening ? "Listening on iPhone UDP 5000":"Receiver stopped").bold()}
     Text("Mind Monitor target: 127.0.0.1  •  Port: 5000").font(.caption).foregroundStyle(.secondary)
     Text("Packets: \(muse.packetCount)   Last: \(muse.lastAddress)").font(.caption.monospaced())
     if !muse.errorText.isEmpty { Text(muse.errorText).foregroundStyle(.red).font(.caption) }
     HStack{Button(muse.listening ? "Restart Receiver":"Start Receiver"){muse.stop();muse.start()}.buttonStyle(.borderedProminent); Button(muse.recording ? "Stop + Save":"Record Session"){muse.recording ? muse.endRecording():muse.beginRecording()}.buttonStyle(.borderedProminent).tint(muse.recording ? .red:.green)}
    }}
    GroupBox("Live Athena / Mind Monitor") { LazyVGrid(columns:[GridItem(.flexible()),GridItem(.flexible())],spacing:10){ ForEach(groups,id:\.self){g in SignalCard(name:g.uppercased(),value:value(g)) } } }
    GroupBox("All OSC Streams") { VStack(alignment:.leading,spacing:6){ ForEach(muse.latest.keys.sorted(),id:\.self){k in HStack(alignment:.top){Text(k).font(.caption.monospaced()).foregroundStyle(.secondary);Spacer();Text(muse.latest[k]?.map(\.description).joined(separator:", ") ?? "").font(.caption.monospaced()).multilineTextAlignment(.trailing)}}}.frame(maxWidth:.infinity,alignment:.leading) }
    if let u=muse.sessionURL { ShareLink(item:u){Label("Share Saved Session",systemImage:"square.and.arrow.up")}.buttonStyle(.borderedProminent) }
   }.padding()
  }.navigationTitle("Chakra Bridge").onAppear{muse.start()} }
 }
 private func value(_ token:String)->String { let hits=muse.latest.filter{$0.key.lowercased().contains(token)}; guard !hits.isEmpty else{return "—"}; return hits.sorted{$0.key<$1.key}.suffix(2).map{$0.value.map(\.description).joined(separator:" ")}.joined(separator:" | ") }
}
struct SignalCard:View { let name:String,value:String; var body:some View {VStack(alignment:.leading,spacing:6){Text(name).font(.caption.bold());Text(value).font(.caption.monospaced()).lineLimit(3).minimumScaleFactor(.65)}.frame(maxWidth:.infinity,minHeight:70,alignment:.topLeading).padding().background(.thinMaterial,in:RoundedRectangle(cornerRadius:14))}}
