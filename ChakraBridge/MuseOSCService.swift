import Foundation
import Network
import Combine

struct OSCEvent: Codable, Identifiable {
    let id: UUID
    let time: Date
    let address: String
    let arguments: [OSCValue]
}

enum OSCValue: Codable, CustomStringConvertible {
    case int(Int32), float(Float), string(String), blob(Data), bool(Bool), unknown(String)
    var description: String { switch self { case .int(let v): return "\(v)"; case .float(let v): return String(format:"%.4f",v); case .string(let v): return v; case .blob(let v): return "blob(\(v.count))"; case .bool(let v): return "\(v)"; case .unknown(let v): return v } }
}

@MainActor final class MuseOSCService: ObservableObject {
    @Published var listening = false
    @Published var recording = false
    @Published var packetCount = 0
    @Published var lastAddress = "—"
    @Published var latest: [String:[OSCValue]] = [:]
    @Published var errorText = ""
    @Published var sessionURL: URL?
    private var listener: NWListener?
    private var events: [OSCEvent] = []
    private let port: NWEndpoint.Port = 5000

    func start() {
        guard listener == nil else { return }
        do {
            let params = NWParameters.udp
            params.allowLocalEndpointReuse = true
            let l = try NWListener(using: params, on: port)
            l.stateUpdateHandler = { [weak self] state in Task { @MainActor in
                guard let self else { return }
                switch state { case .ready: self.listening = true; self.errorText = ""; case .failed(let e): self.errorText = e.localizedDescription; self.listening = false; default: break }
            }}
            l.newConnectionHandler = { [weak self] c in self?.receive(c) }
            l.start(queue: DispatchQueue(label:"ChakraBridge.OSC"))
            listener = l
        } catch { errorText = error.localizedDescription }
    }

    func stop() { listener?.cancel(); listener=nil; listening=false }
    func beginRecording() { events.removeAll(keepingCapacity:true); packetCount=0; sessionURL=nil; recording=true }
    func endRecording() { recording=false; save() }

    private nonisolated func receive(_ c: NWConnection) {
        c.start(queue: DispatchQueue(label:"ChakraBridge.OSC.connection"))
        func next() {
            c.receiveMessage { [weak self] data,_,_,err in
                if let data { Task { @MainActor in self?.ingest(data) } }
                if err == nil { next() }
            }
        }
        next()
    }

    private func ingest(_ data: Data) {
        for m in OSCParser.parsePacket(data) {
            packetCount += 1; lastAddress=m.address; latest[m.address]=m.arguments
            if recording { events.append(OSCEvent(id:UUID(),time:Date(),address:m.address,arguments:m.arguments)) }
        }
    }

    private func save() {
        let enc=JSONEncoder(); enc.outputFormatting=[.prettyPrinted,.sortedKeys]; enc.dateEncodingStrategy = .iso8601
        guard let d=try? enc.encode(events) else { return }
        let f=DateFormatter(); f.dateFormat="yyyyMMdd-HHmmss"
        let url=FileManager.default.urls(for:.documentDirectory,in:.userDomainMask)[0].appendingPathComponent("MuseAthena-\(f.string(from:Date())).json")
        try? d.write(to:url,options:.atomic); sessionURL=url
    }
}

struct OSCMessage { let address:String; let arguments:[OSCValue] }

enum OSCParser {
    static func parsePacket(_ d:Data)->[OSCMessage] {
        if String(data:d.prefix(7),encoding:.ascii)=="#bundle" { return parseBundle(d) }
        return parseMessage(d).map{[$0]} ?? []
    }
    private static func parseBundle(_ d:Data)->[OSCMessage] {
        var i=16, out:[OSCMessage]=[]
        while i+4<=d.count { let n=Int(readI32(d,&i)); guard n>0,i+n<=d.count else{break}; out += parsePacket(d.subdata(in:i..<i+n)); i += n }
        return out
    }
    private static func parseMessage(_ d:Data)->OSCMessage? {
        var i=0; guard let a=readString(d,&i), let tags=readString(d,&i), tags.first=="," else{return nil}; var v:[OSCValue]=[]
        for t in tags.dropFirst() { switch t {
        case "i": v.append(.int(readI32(d,&i)))
        case "f": v.append(.float(Float(bitPattern:UInt32(bitPattern:readI32(d,&i)))))
        case "s": v.append(.string(readString(d,&i) ?? ""))
        case "T": v.append(.bool(true)); case "F": v.append(.bool(false))
        case "b": let n=Int(readI32(d,&i)); if n>=0,i+n<=d.count { v.append(.blob(d.subdata(in:i..<i+n))); i += n; i=(i+3)&~3 }
        default: v.append(.unknown("OSC:\(t)"))
        }}; return OSCMessage(address:a,arguments:v)
    }
    private static func readString(_ d:Data,_ i:inout Int)->String? { guard i<d.count else{return nil}; let s=i; while i<d.count,d[i] != 0{i+=1}; guard i<=d.count else{return nil}; let x=String(data:d.subdata(in:s..<i),encoding:.utf8); i=min((i+4)&~3,d.count); return x }
    private static func readI32(_ d:Data,_ i:inout Int)->Int32 { guard i+4<=d.count else{return 0}; let u=(UInt32(d[i])<<24)|(UInt32(d[i+1])<<16)|(UInt32(d[i+2])<<8)|UInt32(d[i+3]); i+=4; return Int32(bitPattern:u) }
}
