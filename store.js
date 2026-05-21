// ============================================
// PRODE MUNDIAL 2026 - STORE & ENGINE
// ============================================

const Store = (() => {
    const STORAGE_KEY = 'prode2026_predictions';
    const RESULTS_KEY = 'prode2026_results';
    const USER_KEY = 'prode2026_user';
    const KO_STORAGE_KEY = 'prode2026_knockout';
    const PRIZE_KEY = 'prode2026_prize';
    let currentUser = null;

    // --- Simple Local Auth ---
    function loginWithName(name) {
        if (!name || !name.trim()) return null;
        name = name.trim();
        currentUser = {
            uid: 'user_' + name.toLowerCase().replace(/\s+/g, '_'),
            displayName: name,
            photoURL: null
        };
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
        return currentUser;
    }

    function signOut() {
        currentUser = null;
        localStorage.removeItem(USER_KEY);
    }

    function getUser() {
        if (currentUser) return currentUser;
        const saved = localStorage.getItem(USER_KEY);
        if (saved) {
            try { currentUser = JSON.parse(saved); return currentUser; }
            catch(e) { localStorage.removeItem(USER_KEY); }
        }
        return null;
    }

    // --- Predictions CRUD ---
    function getPredictions(userId) {
        const uid = userId || (currentUser && currentUser.uid);
        if (!uid) return {};
        try {
            const raw = localStorage.getItem(`${STORAGE_KEY}_${uid}`);
            return raw ? JSON.parse(raw) : {};
        } catch(e) { return {}; }
    }

    function savePrediction(matchId, homeGoals, awayGoals) {
        const uid = currentUser && currentUser.uid;
        if (!uid) return;
        const preds = getPredictions(uid);
        if (homeGoals === '' || awayGoals === '' || homeGoals === null || awayGoals === null) {
            delete preds[matchId];
        } else {
            preds[matchId] = { h: parseInt(homeGoals), a: parseInt(awayGoals), ts: Date.now() };
        }
        localStorage.setItem(`${STORAGE_KEY}_${uid}`, JSON.stringify(preds));
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
        const uid = userId || (currentUser && currentUser.uid);
        if (!uid) return {};
        try {
            const raw = localStorage.getItem(`${KO_STORAGE_KEY}_${uid}`);
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }

    function saveKnockoutPrediction(matchId, homeGoals, awayGoals, winner) {
        const uid = currentUser && currentUser.uid;
        if (!uid) return;
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

    // --- Leaderboard (local only) ---
    function getLeaderboard() {
        const users = [];
        // Scan localStorage for all prediction keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(STORAGE_KEY + '_')) {
                const uid = key.replace(STORAGE_KEY + '_', '');
                const preds = getPredictions(uid);
                const results = getRealResults();
                let total = 0;
                Object.keys(preds).forEach(mId => {
                    const actual = results[mId];
                    total += scoreMatch(preds[mId], actual).points;
                });
                // Try to find display name
                let name = uid.replace('user_', '').replace(/_/g, ' ');
                name = name.charAt(0).toUpperCase() + name.slice(1);
                users.push({ uid, name, total, predictions: Object.keys(preds).length });
            }
        }
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
        } else {
            localStorage.setItem(PRIZE_KEY, JSON.stringify({
                title: prize.title || '',
                description: prize.description || '',
                value: prize.value || '',
                setBy: currentUser?.displayName || '',
                ts: Date.now()
            }));
        }
    }

    // --- Share Code ---
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
        const user = getUser();
        if (!user) return null;
        const predictions = getPredictions(user.uid);
        const koPreds = getKnockoutPredictions(user.uid);
        const prize = getPrize();

        const data = { v: 1, n: user.displayName, g: {}, k: {} };
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
        try {
            const json = b64UrlDecode(code.trim());
            const data = JSON.parse(json);
            if (!data.v || !data.n) throw new Error('Invalid');

            const uid = 'user_' + data.n.toLowerCase().replace(/\s+/g, '_');
            if (uid === currentUser?.uid) {
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
            return { success: true, name: data.n, uid };
        } catch (e) {
            return { success: false, error: 'Código inválido. Verificá que lo hayas copiado completo.' };
        }
    }

    // --- Competitors ---
    function getCompetitors() {
        const users = [];
        const myUid = currentUser?.uid;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(STORAGE_KEY + '_')) {
                const uid = key.replace(STORAGE_KEY + '_', '');
                if (uid === myUid) continue;
                let name = uid.replace('user_', '').replace(/_/g, ' ');
                name = name.charAt(0).toUpperCase() + name.slice(1);
                const preds = getPredictions(uid);
                users.push({ uid, name, predictions: Object.keys(preds).length });
            }
        }
        return users;
    }

    function removeCompetitor(uid) {
        localStorage.removeItem(`${STORAGE_KEY}_${uid}`);
        localStorage.removeItem(`${KO_STORAGE_KEY}_${uid}`);
    }

    return {
        loginWithName, signOut, getUser,
        getPredictions, savePrediction,
        getRealResults, setRealResults,
        isMatchStarted, scoreMatch, getTotalScore,
        calcGroupStandings, getLeaderboard,
        getGroupQualifiers, getKnockoutPredictions, saveKnockoutPrediction,
        getKnockoutWinner, resolveKnockoutBracket,
        getPrize, savePrize, generateShareCode, importShareCode,
        getCompetitors, removeCompetitor
    };
})();
