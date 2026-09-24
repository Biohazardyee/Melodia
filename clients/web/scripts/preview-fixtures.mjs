// Local-only visual QA. No database, OAuth, Spotify playback or real user data.
// Run from clients/web with Node 25 (used for QA): node scripts/preview-fixtures.mjs
import {Server as SocketServer} from "../../../backend/node_modules/socket.io/dist/index.js";
import {createServer} from "vite";
import express from "../../../backend/node_modules/express/index.js";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import {fileURLToPath} from "node:url";
import {COSMETICS} from "../../../backend/modules/db/users/cosmetics.catalog.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const now = new Date().toISOString();
const journalEntries = [{id: "journal-demo", title: "Discovery", artist: "Daft Punk", listened_on: "2026-09-23", mood: "energetic", rating: 5, note: "Sur le chemin du retour, les lumières de la ville défilaient au rythme de Voyager.", created_at: now}];
const token = ["eyJhbGciOiJub25lIn0", Buffer.from(JSON.stringify({id: "demo-user", role: "ADMIN", exp: Math.floor(Date.now()/1000)+86400})).toString("base64url"), "fixture"].join(".");
const user = {id: "demo-user", username: "demo", pseudo: "Camille", email: "demo@example.test",
    bio: "Des vinyles, des découvertes et beaucoup de musique.", created_at: now, role: "ADMIN",
    shop_points: 1250, owned_cosmetics: ["border_aurora", "theme_crimson", "theme_cyan"], profile_picture: null};
const albums = ["Midnight Lines", "Soft Focus", "Blue Hour", "After the Rain"].map((name,i) => ({
    id: `demo-album-${i}`, api_id: `demo-${i}`, name, artist: ["Studio North", "June", "Parallel", "Mira"][i],
    cover: `/__fixtures/cover/${i}.svg`, rating: [4.7,4.2,4.9,3.8][i], mbid: "", year: 2026
}));
const playlists = ["Late night sessions", "Les indispensables"].map((name,i) => ({
    id: `demo-playlist-${i}`, user_id: user.id, name, description: "Une sélection pour prendre le temps d'écouter.",
    image_url: albums[i].cover, is_public: true, is_owner: true, is_collaborative: i === 1,
    items: albums.slice(0,2).map((media,j) => ({id: `item-${j}`, media_id: media.id, media: {...media, title: media.name}})), collaborators: [], user
}));
const room = {id: "demo-room", name: "Le club du soir", is_public: true, is_host: false, host_id: "another-user",
    participant_count: 3, current_track_name: "Midnight Lines", is_playing: true};
const contacts = [
    {id: "demo-friend", username: "julie", pseudo: "Julie", profile_picture: null},
    {id: "demo-visitor", username: "alex", pseudo: "Alex", profile_picture: null},
    {id: "demo-new", username: "sam", pseudo: "Sam", profile_picture: null},
];
const message = (conv, sender, content) => ({id: crypto.randomUUID(), conversation_id: conv, sender_id: sender, content, created_at: new Date().toISOString(), is_read: false});
const chats = [
    {id: "chat-friend", user1: user, user2: contacts[0], status: "ACCEPTED", initiated_by: null, invitation_sent: false, messages: [message("chat-friend", contacts[0].id, "Tu as écouté le nouvel album ?")]},
    {id: "chat-request", user1: user, user2: contacts[1], status: "PENDING", initiated_by: contacts[1].id, invitation_sent: true, messages: [message("chat-request", contacts[1].id, "Salut ! On a les mêmes goûts musicaux.")]},
];
const chatSummary = c => ({...c, messages: c.messages.slice(-1), _count: {messages: c.status === "DECLINED" ? 0 : c.messages.filter(m => !m.is_read && m.sender_id !== user.id).length}});
const empty = {data: [], users: [], medias: [], reviews: [], activities: [], notifications: [], conversations: [], badges: [], reports: [], bannedUsers: [], count: 0, total: 0, hasMore: false};
const server = await createServer({
    root, configFile: false, envFile: false,
    define: {"import.meta.env.VITE_API_URL": JSON.stringify("http://127.0.0.1:5174/__fixtures")},
    server: {host: "127.0.0.1", port: 5174, strictPort: true},
    plugins: [react(), tailwindcss(), {name: "isolated-visual-fixtures", configureServer(vite) {
        // --built serves a dedicated QA build made with VITE_API_URL=/__fixtures.
        // Never use the real production configuration for an isolated UI test.
        if (process.argv.includes("--built")) {
            const built = fileURLToPath(new URL("../dist-qa/", import.meta.url));
            const staticFiles = express.static(built);
            vite.middlewares.use((req, res, next) => {
                if (req.url?.startsWith("/__fixtures") || req.url?.startsWith("/socket.io")) return next();
                staticFiles(req, res, () => {
                    if (req.headers.accept?.includes("text/html")) {
                        res.setHeader("Content-Type", "text/html");
                        import("node:fs").then(fs => fs.createReadStream(built + "index.html").pipe(res));
                    } else next();
                });
            });
        }
        vite.middlewares.use(async (req,res,next) => {
            const url = new URL(req.url || "/", "http://127.0.0.1:5174");
            if (!url.pathname.startsWith("/__fixtures/")) return next();
            const path = url.pathname.slice("/__fixtures".length);
            const send = (body, status = 200) => {res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(body));};
            if (path === "/journal" && req.method === "GET") {
                const q = (url.searchParams.get("q") || "").toLowerCase();
                const mood = url.searchParams.get("mood"), month = url.searchParams.get("month");
                const entries = journalEntries.filter(e => (!mood || e.mood === mood) && (!month || e.listened_on.startsWith(month)) && (e.title + e.artist + e.note).toLowerCase().includes(q)).sort((a, b) => b.listened_on.localeCompare(a.listened_on));
                const ratings = entries.filter(e => e.rating !== null);
                const page = Number(url.searchParams.get("page") || 1);
                return send({entries: entries.slice((page - 1) * 30, page * 30), total: entries.length, page, hasMore: page * 30 < entries.length, averageRating: ratings.length ? ratings.reduce((sum, e) => sum + e.rating, 0) / ratings.length : null});
            }
            if (path.startsWith("/journal") && req.method !== "GET") {
                const id = path.split("/")[2];
                if (req.method === "DELETE") {
                    const index = journalEntries.findIndex(e => e.id === id);
                    if (index === -1) return send({}, 404);
                    journalEntries.splice(index, 1); return send({});
                }
                let raw = ""; for await (const chunk of req) raw += chunk;
                const body = JSON.parse(raw);
                if (body.title === "error") return send({message: "Fixture save error"}, 503);
                if (req.method === "PUT") {
                    const entry = journalEntries.find(e => e.id === id);
                    if (!entry) return send({}, 404);
                    Object.assign(entry, body); return send({entry});
                }
                const entry = {...body, id: crypto.randomUUID(), created_at: new Date().toISOString()};
                journalEntries.push(entry); return send({entry}, 201);
            }
            if (path.startsWith("/cover/")) {
                const i = Number(path.match(/\d+/)?.[0]) || 0;
                const colors = [["#323246","#c5acec"],["#c99370","#f4dbb7"],["#184c67","#8bb6ca"],["#345446","#cadab8"]][i%4];
                res.setHeader("Content-Type", "image/svg+xml");
                res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="${colors[0]}"/><circle cx="410" cy="230" r="240" fill="${colors[1]}"/><circle cx="280" cy="390" r="160" fill="${colors[0]}" opacity=".8"/><text x="38" y="530" fill="white" font-size="38" font-family="sans-serif">${albums[i%4].name}</text><text x="40" y="565" fill="white" font-size="14" font-family="sans-serif">MELODIA · DEMO COLLECTION</text></svg>`);
                return;
            }
            if (path === "/users/login") return send({token, user});
            if (path === "/users/cosmetics/catalog") return send({catalog: COSMETICS});
            if (path.startsWith("/users/public/") || path === "/users/demo-user") return send({user});
            if (path === "/users/search") return send({users: contacts.filter(c => (c.pseudo + c.username).toLowerCase().includes((url.searchParams.get("q") || "").toLowerCase()))});
            if (path.startsWith("/follows/following/") && path.endsWith("/users")) return send({data: [contacts[0]]});
            if (path.startsWith("/conversations/user/")) return send({conversations: chats.map(chatSummary)});
            if (path === "/conversations" && req.method === "POST") {
                let body = ""; for await (const chunk of req) body += chunk;
                const target = contacts.find(c => c.id === JSON.parse(body).user2_id);
                if (!target) return send({message: "Unknown fixture contact"}, 400);
                let chat = chats.find(c => c.user2.id === target.id);
                if (!chat) {chat = {id: crypto.randomUUID(), user1: user, user2: target, status: "PENDING", initiated_by: user.id, invitation_sent: false, messages: []}; chats.push(chat);}
                return send({conversation: chatSummary(chat)});
            }
            if (path.endsWith("/request") && req.method === "PATCH") {
                let body = ""; for await (const chunk of req) body += chunk;
                const chat = chats.find(c => path.includes(c.id));
                if (!chat) return send({}, 404);
                chat.status = JSON.parse(body).action === "accept" ? "ACCEPTED" : "DECLINED";
                return send({conversation: chatSummary(chat)});
            }
            if (path.startsWith("/messages/conversation/")) return send({messages: chats.find(c => path.endsWith(c.id))?.messages || []});
            if (path === "/api/spotify/status") return send({connected: true, product: "premium", display_name: "Compte fictif"});
            if (path.startsWith("/reviews/media/")) return send({reviews: path.endsWith("demo-album-0") ? [
                {id:"demo-review-own", user_id:user.id, user, title:"Une belle découverte", content:"Un album que je réécouterai.", rating:4, created_at:now, likes:[]},
                {id:"demo-review-friend", user_id:contacts[0].id, user:contacts[0], title:"Pour les soirées calmes", content:"La production est magnifique.", rating:5, created_at:now, likes:[]},
            ] : []});
            if (path.startsWith("/review-comments/review/")) return send({comments: path.endsWith("demo-review-own") ? [
                {id:"demo-reply", user_id:contacts[0].id, user:contacts[0], content:"Le deuxième morceau est mon préféré.", parent_id:null, created_at:now},
                {id:"demo-reply-nested", user_id:user.id, user, content:"Moi aussi !", parent_id:"demo-reply", created_at:now},
            ] : []});
            if (path === "/rooms") return send({rooms: [room, {...room, id:"demo-room-2", name:"Jazz & café", is_playing:false, current_track_name:null}]});
            if (path === "/rooms/mine") return send({rooms: []});
            if (path.endsWith("/join")) return send({message:"Ce salon est privé, un mot de passe est requis."}, 403);
            if (path.startsWith("/playlists/user/")) return send({playlists});
            if (path.startsWith("/playlists/")) return send({playlist: playlists.find(p => path.endsWith(p.id)) || playlists[0]});
            if (path.startsWith("/medias/status/user/")) return send({mediasStatus: albums.map((media,i) => ({id:i, status:["listened","favorite","later","listened"][i], media, created_at:now}))});
            if (path === "/medias/trending") return send({medias: albums});
            if (path === "/api/search" || path === "/api/artists/info/top-albums") {
                const query = url.searchParams.get("query") || url.searchParams.get("artist") || "";
                await new Promise(resolve => setTimeout(resolve, query === "slow" ? 1200 : 180));
                if (query === "error") return send({message:"Fixture search failure"},503);
                const result = query === "empty" ? [] : albums.map(a => ({...a, name: `${query} — ${a.name}`, image:[{size:"extralarge","#text":a.cover}]}));
                return send({topAlbums:{topalbums:{album:result}}, searchResults:{results:{albummatches:{album:result}}}});
            }
            if (path === "/medias/sync-search") {
                let body = ""; for await (const chunk of req) body += chunk;
                try {const data = JSON.parse(body); return send({medias:data.albums.map((a,i) => ({...a, id:`demo-album-${i}`, rating:albums[i%4].rating}))});}
                catch {return send({message:"Invalid fixture request"},400);}
            }
            if (path.startsWith("/medias/demo-album-")) return send({media:albums.find(a => path.endsWith(a.id)) || albums[0]});
            if (path === "/api/albums/info") return send({albumInfo:{album:{wiki:{summary:"Une édition de démonstration pour vérifier l'interface."},tracks:{track:[]}}}});
            if (path === "/users") return send({users:[user]});
            // Unsupported writes cannot silently look successful.
            if (req.method !== "GET") return send({message:"Cette action est désactivée dans l'aperçu fictif."},405);
            return send(empty);
        });
    }}]
});
const sockets = new SocketServer(server.httpServer).of("/__fixtures");
sockets.on("connection", socket => {
    socket.on("send_message", (data, ack) => {
        const chat = chats.find(c => c.id === data.conversation_id);
        if (!chat || (chat.status !== "ACCEPTED" && (chat.initiated_by !== user.id || chat.invitation_sent || chat.status === "DECLINED"))) return ack({ok: false});
        const msg = message(chat.id, user.id, data.content);
        chat.messages.push(msg);
        chat.invitation_sent = true;
        ack({ok: true});
        socket.emit("receive_message", msg);
        socket.emit("update_conversation_list", msg);
    });
    socket.on("mark_as_read", data => {
        const chat = chats.find(c => c.id === data.conversation_id);
        if (chat?.status !== "ACCEPTED") return;
        chat.messages.forEach(m => {m.is_read = true;});
        socket.emit("conversation_marked_read", data);
    });
});
await server.listen();
console.log("Aperçu FICTIF : http://127.0.0.1:5174 — connexion demo@example.test / demo");
