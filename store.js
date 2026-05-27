// ============================================
// PRODE MUNDIAL 2026 - STORE & ENGINE
// ============================================

const Store = (() => {
    const STORAGE_KEY = 'prode2026_predictions';
    const RESULTS_KEY = 'prode2026_results';
    const USER_KEY = 'prode2026_user';
    const KO_STORAGE_KEY = 'prode2026_knockout';
    const PRIZE_KEY = 'prode2026_prize';
    
    const SUPABASE_URL = 'https://sehcjtscawufqmuvhnnk.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlaGNqdHNjYXd1ZnFtdXZobm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTc5MDIsImV4cCI6MjA5NDg5MzkwMn0.WMYpBH0r6K6XyxTNreoia1gQVRiJBdKpyOB5gaa4sk4';
    
    let supabaseClient = null;
    let currentUser = null;
    let authInitialized = false;
    let authCallback = null;

    if (typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    if (supabaseClient) {
        supabaseClient.auth.onAuthStateChange((event, session) => {
            authInitialized = true;
            if (session && session.user) {
                const u = session.user;
                currentUser = {
                    uid: u.id,
                    displayName: u.user_metadata.full_name || u.user_metadata.name || u.email.split('@')[0],
                    photoURL: u.user_metadata.avatar_url || null,
                    email: u.email
                };
                localStorage.setItem(USER_KEY, JSON.stringify(currentUser));

                // Desbloqueamos la UI de inmediato llamando al callback
                if (authCallback) {
                    authCallback(currentUser);
                }

                // Ejecutamos la sincronización en segundo plano para no demorar la carga visual
                (async () => {
                    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                        await ensureProfile(currentUser).catch(console.error);
                    }
                    await syncLocalDataToSupabase().catch(console.error);
                    
                    // Opcional: si la sincronización trajo datos nuevos de Supabase, refrescamos la UI
                    if (authCallback) {
                        authCallback(currentUser);
                    }
                })();

            } else {
                currentUser = null;
                localStorage.removeItem(USER_KEY);
                if (authCallback) {
                    authCallback(currentUser);
                }
            }
        });
    }

    async function ensureProfile(user) {
        if (!supabaseClient || !user) return;
        const { data, error } = await supabaseClient
            .from('profiles')
            .upsert({
                id: user.uid,
                display_name: user.displayName,
                avatar_url: user.photoURL,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id', ignoreDuplicates: true });
        if (error) console.warn('ensureProfile:', error.message);
    }

    function onAuthChanged(callback) {
        authCallback = callback;
        if (authInitialized || !supabaseClient) {
            callback(currentUser || getUser());
        }
    }

    async function signInWithGoogle() {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });
        if (error) throw error;
    }

    async function signOut() {
        currentUser = null;
        localStorage.removeItem(USER_KEY);
        // Clear cached local predictions of user
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.startsWith(STORAGE_KEY + '_') || key.startsWith(KO_STORAGE_KEY + '_'))) {
                localStorage.removeItem(key);
            }
        }
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }
    }

    function getUser() {
        if (currentUser) return currentUser;
        try {
            const saved = localStorage.getItem(USER_KEY);
            if (saved) {
                currentUser = JSON.parse(saved);
                return currentUser;
            }
        } catch(e) {}
        return null;
    }

    // --- Predictions CRUD ---
    function getPredictions(userId) {
        const uid = userId || (currentUser && currentUser.uid) || 'local_temp';
        try {
            const raw = localStorage.getItem(`${STORAGE_KEY}_${uid}`);
            return raw ? JSON.parse(raw) : {};
        } catch(e) { return {}; }
    }

    function savePrediction(matchId, homeGoals, awayGoals) {
        const uid = (currentUser && currentUser.uid) || 'local_temp';
        const preds = getPredictions(uid);
        if (homeGoals === '' || awayGoals === '' || homeGoals === null || awayGoals === null) {
            delete preds[matchId];
        } else {
            preds[matchId] = { h: parseInt(homeGoals), a: parseInt(awayGoals), ts: Date.now() };
        }
        localStorage.setItem(`${STORAGE_KEY}_${uid}`, JSON.stringify(preds));

        if (currentUser && supabaseClient) {
            if (homeGoals === '' || awayGoals === '' || homeGoals === null || awayGoals === null) {
                supabaseClient.from('predictions')
                    .delete()
                    .match({ user_id: currentUser.uid, match_id: matchId })
                    .then();
            } else {
                supabaseClient.from('predictions')
                    .upsert({
                        user_id: currentUser.uid,
                        match_id: matchId,
                        home_score: parseInt(homeGoals),
                        away_score: parseInt(awayGoals)
                    })
                    .then();
            }
        }
    }

    // --- Real Results ---
    function getRealResults() {
        try {
            const raw = localStorage.getItem(RESULTS_KEY);
            return raw ? JSON.parse(raw) : (typeof REAL_RESULTS !== 'undefined' ? REAL_RESULTS : {});
        } catch(e) { return {}; }
    }

    function setRealResults(results) {
        localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
    }

    // --- Match Status ---
    function isMatchStarted(match) {
        const [h, m] = match.time.split(':').map(Number);
        const [y, mo, d] = match.date.split('-').map(Number);
        const matchDate = new Date(y, mo - 1, d, h, m, 0);
        return new Date() >= matchDate;
    }

    // --- Scoring Engine ---
    function scoreMatch(prediction, actual) {
        if (!prediction || !actual || actual.h === undefined || actual.a === undefined) {
            return { points: 0, status: 'pending' };
        }
        const predResult = prediction.h > prediction.a ? 'H' : prediction.h < prediction.a ? 'A' : 'D';
        const actResult = actual.h > actual.a ? 'H' : actual.h < actual.a ? 'A' : 'D';
        if (prediction.h === actual.h && prediction.a === actual.a) {
            return { points: 2, status: 'exact' };
        }
        if (predResult === actResult) {
            return { points: 1, status: 'result' };
        }
        return { points: 0, status: 'wrong' };
    }

    function getTotalScore(userId) {
        const preds = getPredictions(userId);
        const results = getRealResults();
        let total = 0, exact = 0, result = 0, wrong = 0, pending = 0;
        Object.keys(preds).forEach(matchId => {
            const actual = results[matchId];
            const score = scoreMatch(preds[matchId], actual);
            total += score.points;
            if (score.status === 'exact') exact++;
            else if (score.status === 'result') result++;
            else if (score.status === 'wrong') wrong++;
            else pending++;
        });
        return { total, exact, result, wrong, pending };
    }

    // --- Group Standings Calculator ---
    function calcGroupStandings(groupLetter, predictions) {
        const teams = GROUPS[groupLetter];
        if (!teams) return [];
        const matches = GROUP_STAGE_MATCHES.filter(m => m.group === groupLetter);
        const stats = {};
        teams.forEach(t => { stats[t] = { team: t, pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pj: 0 }; });

        matches.forEach(m => {
            const pred = predictions[m.id];
            if (!pred || pred.h === undefined || pred.a === undefined) return;
            const h = pred.h, a = pred.a;
            if (!stats[m.home] || !stats[m.away]) return;

            stats[m.home].pj++; stats[m.away].pj++;
            stats[m.home].gf += h; stats[m.home].ga += a;
            stats[m.away].gf += a; stats[m.away].ga += h;

            if (h > a) { stats[m.home].w++; stats[m.home].pts += 3; stats[m.away].l++; }
            else if (h < a) { stats[m.away].w++; stats[m.away].pts += 3; stats[m.home].l++; }
            else { stats[m.home].d++; stats[m.home].pts += 1; stats[m.away].d++; stats[m.away].pts += 1; }
        });

        return Object.values(stats)
            .map(s => { s.gd = s.gf - s.ga; return s; })
            .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    }

    // --- Group Qualifiers ---
    function getGroupQualifiers(predictions) {
        const qualifiers = {};
        const allThirds = [];
        Object.keys(GROUPS).forEach(g => {
            const standings = calcGroupStandings(g, predictions);
            qualifiers[g] = {};
            standings.forEach((s, i) => {
                qualifiers[g][i + 1] = s.team;
            });
            if (standings.length >= 3) {
                allThirds.push({ ...standings[2], group: g });
            }
        });
        allThirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
        const bestThirds = allThirds.slice(0, 8);
        return { qualifiers, bestThirds };
    }

    // --- Knockout Predictions CRUD ---
    function getKnockoutPredictions(userId) {
        const uid = userId || (currentUser && currentUser.uid) || 'local_temp';
        try {
            const raw = localStorage.getItem(`${KO_STORAGE_KEY}_${uid}`);
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }

    function saveKnockoutPrediction(matchId, homeGoals, awayGoals, winner) {
        const uid = (currentUser && currentUser.uid) || 'local_temp';
        const preds = getKnockoutPredictions(uid);
        if (homeGoals === '' || awayGoals === '' || homeGoals === null || awayGoals === null) {
            delete preds[matchId];
        } else {
            const h = parseInt(homeGoals), a = parseInt(awayGoals);
            preds[matchId] = { h, a, ts: Date.now() };
            if (h === a && winner) {
                preds[matchId].winner = winner;
            }
        }
        localStorage.setItem(`${KO_STORAGE_KEY}_${uid}`, JSON.stringify(preds));

        if (currentUser && supabaseClient) {
            if (homeGoals === '' || awayGoals === '' || homeGoals === null || awayGoals === null) {
                supabaseClient.from('knockout_predictions')
                    .delete()
                    .match({ user_id: currentUser.uid, match_id: matchId })
                    .then();
            } else {
                const h = parseInt(homeGoals), a = parseInt(awayGoals);
                const row = {
                    user_id: currentUser.uid,
                    match_id: matchId,
                    home_score: h,
                    away_score: a
                };
                if (h === a && winner) row.winner = winner;
                supabaseClient.from('knockout_predictions')
                    .upsert(row)
                    .then();
            }
        }
    }

    // --- Knockout Winner Resolution ---
    function getKnockoutWinner(matchId, knockoutPreds) {
        const pred = knockoutPreds[matchId];
        if (!pred || pred.h === undefined || pred.a === undefined) return null;
        if (pred.h > pred.a) return 'home';
        if (pred.a > pred.h) return 'away';
        return pred.winner || null;
    }

    // --- Full Bracket Resolution ---
    function resolveKnockoutBracket(predictions, knockoutPreds) {
        const { qualifiers, bestThirds } = getGroupQualifiers(predictions);
        const resolved = {};

        // Resolve R32 teams
        KNOCKOUT_BRACKET.r32.forEach(match => {
            const home = match.home.bestThird !== undefined
                ? (bestThirds[match.home.bestThird - 1]?.team || null)
                : (qualifiers[match.home.group]?.[match.home.pos] || null);
            const away = match.away.bestThird !== undefined
                ? (bestThirds[match.away.bestThird - 1]?.team || null)
                : (qualifiers[match.away.group]?.[match.away.pos] || null);
            resolved[match.id] = { home, away };
        });

        // Resolve subsequent rounds by propagating winners
        ['r16', 'qf', 'sf', 'final'].forEach(round => {
            KNOCKOUT_BRACKET[round].forEach(match => {
                let home = null, away = null;
                const homeSrc = resolved[match.homeFrom];
                if (homeSrc) {
                    const w = getKnockoutWinner(match.homeFrom, knockoutPreds);
                    if (w === 'home') home = homeSrc.home;
                    else if (w === 'away') home = homeSrc.away;
                }
                const awaySrc = resolved[match.awayFrom];
                if (awaySrc) {
                    const w = getKnockoutWinner(match.awayFrom, knockoutPreds);
                    if (w === 'home') away = awaySrc.home;
                    else if (w === 'away') away = awaySrc.away;
                }
                resolved[match.id] = { home, away };
            });
        });

        return { resolved, qualifiers, bestThirds };
    }

    // --- Leaderboard ---
    function getLeaderboard() {
        const users = [];
        const myUid = currentUser && currentUser.uid;
        
        if (myUid) {
            const myName = currentUser.displayName || 'Mi Prode';
            const myPreds = getPredictions(myUid);
            const myResults = getRealResults();
            let myTotal = 0;
            Object.keys(myPreds).forEach(mId => {
                myTotal += scoreMatch(myPreds[mId], myResults[mId]).points;
            });
            users.push({ uid: myUid, name: myName, avatar: currentUser.photoURL, total: myTotal, predictions: Object.keys(myPreds).length });
        } else {
            const localPreds = getPredictions('local_temp');
            const myResults = getRealResults();
            let myTotal = 0;
            Object.keys(localPreds).forEach(mId => {
                myTotal += scoreMatch(localPreds[mId], myResults[mId]).points;
            });
            users.push({ uid: 'local_temp', name: 'Mi Prode (Invitado)', avatar: null, total: myTotal, predictions: Object.keys(localPreds).length });
        }

        const competitors = getCompetitors();
        const results = getRealResults();
        competitors.forEach(c => {
            const preds = getPredictions(c.uid);
            let total = 0;
            Object.keys(preds).forEach(mId => {
                total += scoreMatch(preds[mId], results[mId]).points;
            });
            users.push({ uid: c.uid, name: c.name, avatar: c.avatar, total, predictions: Object.keys(preds).length });
        });

        return users.sort((a, b) => b.total - a.total || b.predictions - a.predictions);
    }

    // --- Prize ---
    function getPrize() {
        try {
            const raw = localStorage.getItem(PRIZE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    function savePrize(prize) {
        if (!prize || (!prize.title && !prize.description)) {
            localStorage.removeItem(PRIZE_KEY);
            if (currentUser && supabaseClient) {
                supabaseClient.from('prizes').delete().eq('user_id', currentUser.uid).then();
            }
        } else {
            const data = {
                title: prize.title || '',
                description: prize.description || '',
                value: prize.value || '',
                setBy: currentUser?.displayName || 'Usuario local',
                ts: Date.now()
            };
            localStorage.setItem(PRIZE_KEY, JSON.stringify(data));

            if (currentUser && supabaseClient) {
                supabaseClient.from('prizes').upsert({
                    user_id: currentUser.uid,
                    title: data.title,
                    description: data.description,
                    value: data.value
                }).then();
            }
        }
    }

    // --- Share Code & UUID ---
    function b64UrlEncode(str) {
        return btoa(unescape(encodeURIComponent(str)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function b64UrlDecode(str) {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) str += '=';
        return decodeURIComponent(escape(atob(str)));
    }

    function generateShareCode() {
        if (currentUser) {
            return currentUser.uid;
        }
        
        const predictions = getPredictions('local_temp');
        const koPreds = getKnockoutPredictions('local_temp');
        const prize = getPrize();

        const data = { v: 1, n: 'Invitado', g: {}, k: {} };
        Object.entries(predictions).forEach(([id, pred]) => {
            data.g[id] = [pred.h, pred.a];
        });
        Object.entries(koPreds).forEach(([id, pred]) => {
            data.k[id] = pred.winner ? [pred.h, pred.a, pred.winner] : [pred.h, pred.a];
        });
        if (prize && prize.title) data.p = [prize.title, prize.description || '', prize.value || ''];

        try { return b64UrlEncode(JSON.stringify(data)); }
        catch (e) { return null; }
    }

    function importShareCode(code) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(code.trim())) {
            return importCompetitor(code.trim());
        }

        try {
            const json = b64UrlDecode(code.trim());
            const data = JSON.parse(json);
            if (!data.v || !data.n) throw new Error('Invalid');

            const uid = 'user_' + data.n.toLowerCase().replace(/\s+/g, '_');
            if (uid === (currentUser && currentUser.uid)) {
                return { success: false, error: 'No podés importar tu propio prode' };
            }

            if (data.g && Object.keys(data.g).length > 0) {
                const preds = {};
                Object.entries(data.g).forEach(([id, v]) => {
                    preds[id] = { h: v[0], a: v[1], ts: Date.now() };
                });
                localStorage.setItem(`${STORAGE_KEY}_${uid}`, JSON.stringify(preds));
            }
            if (data.k && Object.keys(data.k).length > 0) {
                const kp = {};
                Object.entries(data.k).forEach(([id, v]) => {
                    kp[id] = { h: v[0], a: v[1], ts: Date.now() };
                    if (v[2]) kp[id].winner = v[2];
                });
                localStorage.setItem(`${KO_STORAGE_KEY}_${uid}`, JSON.stringify(kp));
            }
            if (data.p && !getPrize()) {
                savePrize({ title: data.p[0], description: data.p[1], value: data.p[2] });
            }

            try {
                const localConns = JSON.parse(localStorage.getItem('prode2026_local_connections') || '[]');
                if (!localConns.includes(uid)) {
                    localConns.push(uid);
                    localStorage.setItem('prode2026_local_connections', JSON.stringify(localConns));
                }
                const cache = JSON.parse(localStorage.getItem('prode2026_profiles_cache') || '{}');
                cache[uid] = { name: data.n, avatar: null };
                localStorage.setItem('prode2026_profiles_cache', JSON.stringify(cache));
            } catch (e) {}

            return { success: true, name: data.n, uid };
        } catch (e) {
            return { success: false, error: 'Código inválido. Verificá que lo hayas copiado completo.' };
        }
    }

    // --- Competitors & Connections ---
    function getCompetitors() {
        const users = [];
        let competitorIds = [];
        if (currentUser) {
            try {
                competitorIds = JSON.parse(localStorage.getItem(`prode2026_connections_${currentUser.uid}`) || '[]');
            } catch (e) {}
        } else {
            try {
                competitorIds = JSON.parse(localStorage.getItem('prode2026_local_connections') || '[]');
            } catch (e) {}
        }

        const cache = JSON.parse(localStorage.getItem('prode2026_profiles_cache') || '{}');
        competitorIds.forEach(id => {
            const prof = cache[id] || { name: 'Amigo Prode', avatar: null };
            const preds = getPredictions(id);
            users.push({
                uid: id,
                name: prof.name,
                avatar: prof.avatar,
                predictions: Object.keys(preds).length
            });
        });
        return users;
    }

    async function removeCompetitor(uid) {
        if (currentUser) {
            try {
                const connsKey = `prode2026_connections_${currentUser.uid}`;
                let ids = JSON.parse(localStorage.getItem(connsKey) || '[]');
                ids = ids.filter(id => id !== uid);
                localStorage.setItem(connsKey, JSON.stringify(ids));
            } catch (e) {}

            if (supabaseClient) {
                await supabaseClient.from('connections')
                    .delete()
                    .eq('user_id', currentUser.uid)
                    .eq('competitor_id', uid);
            }
        } else {
            try {
                let ids = JSON.parse(localStorage.getItem('prode2026_local_connections') || '[]');
                ids = ids.filter(id => id !== uid);
                localStorage.setItem('prode2026_local_connections', JSON.stringify(ids));
            } catch (e) {}
        }

        localStorage.removeItem(`${STORAGE_KEY}_${uid}`);
        localStorage.removeItem(`${KO_STORAGE_KEY}_${uid}`);
    }

    // --- Supabase Helpers ---
    async function syncLocalDataToSupabase() {
        if (!supabaseClient || !currentUser) return;
        
        const localPredsKey = `${STORAGE_KEY}_local_temp`;
        const localKoPredsKey = `${KO_STORAGE_KEY}_local_temp`;

        let localPreds = {};
        try {
            const raw = localStorage.getItem(localPredsKey);
            if (raw) localPreds = JSON.parse(raw);
        } catch (e) {}

        if (Object.keys(localPreds).length > 0) {
            const rows = Object.entries(localPreds).map(([matchId, pred]) => ({
                user_id: currentUser.uid,
                match_id: matchId,
                home_score: pred.h,
                away_score: pred.a
            }));
            const { error } = await supabaseClient.from('predictions').upsert(rows);
            if (!error) localStorage.removeItem(localPredsKey);
        }

        let localKoPreds = {};
        try {
            const raw = localStorage.getItem(localKoPredsKey);
            if (raw) localKoPreds = JSON.parse(raw);
        } catch (e) {}

        if (Object.keys(localKoPreds).length > 0) {
            const rows = Object.entries(localKoPreds).map(([matchId, pred]) => {
                const row = {
                    user_id: currentUser.uid,
                    match_id: matchId,
                    home_score: pred.h,
                    away_score: pred.a
                };
                if (pred.winner) row.winner = pred.winner;
                return row;
            });
            const { error } = await supabaseClient.from('knockout_predictions').upsert(rows);
            if (!error) localStorage.removeItem(localKoPredsKey);
        }

        await loadUserFromSupabase();
        await refreshCompetitorsData();
    }

    async function loadUserFromSupabase() {
        if (!supabaseClient || !currentUser) return;
        
        const { data: preds } = await supabaseClient
            .from('predictions')
            .select('match_id, home_score, away_score')
            .eq('user_id', currentUser.uid);
        
        if (preds) {
            const cache = {};
            preds.forEach(p => {
                cache[p.match_id] = { h: p.home_score, a: p.away_score, ts: Date.now() };
            });
            localStorage.setItem(`${STORAGE_KEY}_${currentUser.uid}`, JSON.stringify(cache));
        }

        const { data: koPreds } = await supabaseClient
            .from('knockout_predictions')
            .select('match_id, home_score, away_score, winner')
            .eq('user_id', currentUser.uid);
        
        if (koPreds) {
            const cache = {};
            koPreds.forEach(p => {
                cache[p.match_id] = { h: p.home_score, a: p.away_score, ts: Date.now() };
                if (p.winner) cache[p.match_id].winner = p.winner;
            });
            localStorage.setItem(`${KO_STORAGE_KEY}_${currentUser.uid}`, JSON.stringify(cache));
        }

        const { data: prize } = await supabaseClient
            .from('prizes')
            .select('title, description, value')
            .eq('user_id', currentUser.uid)
            .maybeSingle();
        
        if (prize) {
            localStorage.setItem(PRIZE_KEY, JSON.stringify({
                title: prize.title,
                description: prize.description || '',
                value: prize.value || '',
                setBy: currentUser.displayName,
                ts: Date.now()
            }));
        }

        const { data: conns } = await supabaseClient
            .from('connections')
            .select('competitor_id')
            .eq('user_id', currentUser.uid);
        
        if (conns) {
            const ids = conns.map(c => c.competitor_id);
            localStorage.setItem(`prode2026_connections_${currentUser.uid}`, JSON.stringify(ids));
        }
    }

    async function importCompetitor(competitorId) {
        if (!supabaseClient) return { success: false, error: 'Supabase no inicializado' };
        
        const { data: profile, error: errProfile } = await supabaseClient
            .from('profiles')
            .select('id, display_name, avatar_url')
            .eq('id', competitorId)
            .maybeSingle();
        
        if (errProfile || !profile) {
            return { success: false, error: 'Competidor no encontrado o link roto' };
        }

        if (currentUser && profile.id === currentUser.uid) {
            return { success: false, error: 'No podés importarte a vos mismo' };
        }

        if (currentUser) {
            const { error: errConn } = await supabaseClient
                .from('connections')
                .upsert({ user_id: currentUser.uid, competitor_id: profile.id });
            
            if (errConn) return { success: false, error: 'Error al conectar' };
            
            try {
                const connsKey = `prode2026_connections_${currentUser.uid}`;
                const ids = JSON.parse(localStorage.getItem(connsKey) || '[]');
                if (!ids.includes(profile.id)) {
                    ids.push(profile.id);
                    localStorage.setItem(connsKey, JSON.stringify(ids));
                }
            } catch(e) {}
        } else {
            try {
                const localConns = JSON.parse(localStorage.getItem('prode2026_local_connections') || '[]');
                if (!localConns.includes(profile.id)) {
                    localConns.push(profile.id);
                    localStorage.setItem('prode2026_local_connections', JSON.stringify(localConns));
                }
            } catch (e) {}
        }

        const cache = JSON.parse(localStorage.getItem('prode2026_profiles_cache') || '{}');
        cache[profile.id] = { name: profile.display_name, avatar: profile.avatar_url };
        localStorage.setItem('prode2026_profiles_cache', JSON.stringify(cache));

        await cacheCompetitorData(profile.id);

        return { success: true, name: profile.display_name, uid: profile.id };
    }

    async function cacheCompetitorData(id) {
        if (!supabaseClient) return;

        const { data: preds } = await supabaseClient
            .from('predictions')
            .select('match_id, home_score, away_score')
            .eq('user_id', id);
        
        if (preds) {
            const cache = {};
            preds.forEach(p => {
                cache[p.match_id] = { h: p.home_score, a: p.away_score, ts: Date.now() };
            });
            localStorage.setItem(`${STORAGE_KEY}_${id}`, JSON.stringify(cache));
        }

        const { data: koPreds } = await supabaseClient
            .from('knockout_predictions')
            .select('match_id, home_score, away_score, winner')
            .eq('user_id', id);
        
        if (koPreds) {
            const cache = {};
            koPreds.forEach(p => {
                cache[p.match_id] = { h: p.home_score, a: p.away_score, ts: Date.now() };
                if (p.winner) cache[p.match_id].winner = p.winner;
            });
            localStorage.setItem(`${KO_STORAGE_KEY}_${id}`, JSON.stringify(cache));
        }
    }

    async function refreshCompetitorsData() {
        if (!supabaseClient) return;
        
        let competitorIds = [];
        if (currentUser) {
            try {
                competitorIds = JSON.parse(localStorage.getItem(`prode2026_connections_${currentUser.uid}`) || '[]');
            } catch (e) {}
        } else {
            try {
                competitorIds = JSON.parse(localStorage.getItem('prode2026_local_connections') || '[]');
            } catch (e) {}
        }

        if (competitorIds.length === 0) return;

        const { data: profiles } = await supabaseClient
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', competitorIds);
        
        if (profiles) {
            const cache = JSON.parse(localStorage.getItem('prode2026_profiles_cache') || '{}');
            profiles.forEach(p => {
                cache[p.id] = { name: p.display_name, avatar: p.avatar_url };
            });
            localStorage.setItem('prode2026_profiles_cache', JSON.stringify(cache));
        }

        const { data: preds } = await supabaseClient
            .from('predictions')
            .select('user_id, match_id, home_score, away_score')
            .in('user_id', competitorIds);
        
        if (preds) {
            const grouped = {};
            competitorIds.forEach(id => grouped[id] = {});
            preds.forEach(p => {
                if (grouped[p.user_id]) {
                    grouped[p.user_id][p.match_id] = { h: p.home_score, a: p.away_score, ts: Date.now() };
                }
            });
            Object.entries(grouped).forEach(([id, data]) => {
                localStorage.setItem(`${STORAGE_KEY}_${id}`, JSON.stringify(data));
            });
        }

        const { data: koPreds } = await supabaseClient
            .from('knockout_predictions')
            .select('user_id, match_id, home_score, away_score, winner')
            .in('user_id', competitorIds);
        
        if (koPreds) {
            const grouped = {};
            competitorIds.forEach(id => grouped[id] = {});
            koPreds.forEach(p => {
                if (grouped[p.user_id]) {
                    grouped[p.user_id][p.match_id] = { h: p.home_score, a: p.away_score, ts: Date.now() };
                    if (p.winner) grouped[p.user_id][p.match_id].winner = p.winner;
                }
            });
            Object.entries(grouped).forEach(([id, data]) => {
                localStorage.setItem(`${KO_STORAGE_KEY}_${id}`, JSON.stringify(data));
            });
        }
    }

    return {
        onAuthChanged, signInWithGoogle, signOut, getUser,
        getPredictions, savePrediction,
        getRealResults, setRealResults,
        isMatchStarted, scoreMatch, getTotalScore,
        calcGroupStandings, getLeaderboard,
        getGroupQualifiers, getKnockoutPredictions, saveKnockoutPrediction,
        getKnockoutWinner, resolveKnockoutBracket,
        getPrize, savePrize, generateShareCode, importShareCode,
        getCompetitors, removeCompetitor, importCompetitor, refreshCompetitorsData
    };
})();
